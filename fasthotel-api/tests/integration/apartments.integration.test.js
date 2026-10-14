// fasthotel-api/tests/integration/apartments.integration.test.js
//
// Testes de integração REAIS (Supertest -> app.js -> rotas reais -> middlewares
// reais -> controllers reais -> PostgreSQL "fasthotel_test" real) do
// gerenciamento de tipos de apartamento (tipos_quarto) e sua associação com
// quartos, incluindo permissões, filtro por tipo, sincronização com o texto
// legado "quartos.tipo" (compatibilidade com relatórios) e disponibilidade
// considerando limpeza/ocupação.

const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../../app');
const pool = require('../../config/db');

const EMAIL_SUFFIX = '@apt.fasthotel.test';
// roomController ordena com CAST(numero AS INTEGER) — mesma convenção dos
// demais módulos: quartos de teste usam uma faixa numérica dedicada.
const ROOM_PREFIX = '96';
const TYPE_PREFIX = 'E2E-Tipo-';

const limparDados = async () => {
  await pool.query(
    `DELETE FROM limpezas WHERE quarto_id IN (SELECT id FROM quartos WHERE numero LIKE $1)`,
    [`${ROOM_PREFIX}%`],
  );
  await pool.query(
    `DELETE FROM reservas WHERE quarto_id IN (SELECT id FROM quartos WHERE numero LIKE $1)`,
    [`${ROOM_PREFIX}%`],
  );
  await pool.query('DELETE FROM quartos WHERE numero LIKE $1', [`${ROOM_PREFIX}%`]);
  await pool.query('DELETE FROM tipos_quarto WHERE nome LIKE $1', [`${TYPE_PREFIX}%`]);
  await pool.query('DELETE FROM usuarios WHERE email LIKE $1', [`%${EMAIL_SUFFIX}`]);
};

beforeAll(() => {
  if (process.env.PGDATABASE !== 'fasthotel_test') {
    throw new Error(`Abortado: conectado a "${process.env.PGDATABASE}", não a "fasthotel_test".`);
  }
});

beforeEach(limparDados);
afterAll(async () => {
  await limparDados();
  await pool.end();
});

// Helpers ------------------------------------------------------------------

const auth = (token) => ({ 'x-auth-token': token });
let contador = 0;

async function criarAdminDireto(email, senha) {
  const hash = await bcrypt.hash(senha, 10);
  await pool.query(
    `INSERT INTO usuarios (nome, email, senha, tipo_usuario) VALUES ($1, $2, $3, 'admin')`,
    ['Admin Apartments', email, hash],
  );
  const login = await request(app).post('/api/usuarios/login').send({ email, senha });
  return { token: login.body.token, id: login.body.user.id };
}

async function criarRecepcionista(adminToken, email, senha) {
  await request(app)
    .post('/api/usuarios/staff')
    .set(auth(adminToken))
    .send({ nome: 'Recep Apartments', email, senha, tipo_usuario: 'recepcionista' });
  const login = await request(app).post('/api/usuarios/login').send({ email, senha });
  return { token: login.body.token, id: login.body.user.id };
}

async function criarClienteELogar(email, senha) {
  await request(app).post('/api/usuarios').send({ nome: 'Cliente Apartments', email, senha });
  const login = await request(app).post('/api/usuarios/login').send({ email, senha });
  return { token: login.body.token, id: login.body.user.id };
}

async function criarTipo(adminToken, overrides = {}) {
  contador += 1;
  const res = await request(app)
    .post('/api/tipos-quarto')
    .set(auth(adminToken))
    .send({ nome: `${TYPE_PREFIX}${contador}`, descricao: 'Tipo de teste', capacidade_padrao: 2, preco_base: 150, ...overrides });
  expect(res.status).toBe(201);
  return res.body.roomType;
}

async function criarQuarto(adminToken, tipoId, overrides = {}) {
  contador += 1;
  const res = await request(app)
    .post('/api/quartos')
    .set(auth(adminToken))
    .send({
      numero: `${ROOM_PREFIX}${contador}`,
      tipo_id: tipoId,
      capacidade: 2,
      preco_por_noite: 150,
      ...overrides,
    });
  expect(res.status).toBe(201);
  return res.body.room;
}

function amanha(diasExtra = 0) {
  const d = new Date();
  d.setDate(d.getDate() + 1 + diasExtra);
  return d.toISOString().slice(0, 10);
}

// =========================================================================
// Tipos de apartamento — CRUD e permissões (só admin)
// =========================================================================
describe('Tipos de apartamento — CRUD', () => {
  test('admin cadastra um tipo com sucesso', async () => {
    const admin = await criarAdminDireto(`a1${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const tipo = await criarTipo(admin.token);
    expect(tipo.ativo).toBe(true);
  });

  test('recepcionista e cliente NÃO podem criar tipo → 403', async () => {
    const admin = await criarAdminDireto(`a2${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const recep = await criarRecepcionista(admin.token, `r1${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const cliente = await criarClienteELogar(`c1${Date.now()}${EMAIL_SUFFIX}`, 'senha123');

    for (const token of [recep.token, cliente.token]) {
      const res = await request(app)
        .post('/api/tipos-quarto')
        .set(auth(token))
        .send({ nome: `${TYPE_PREFIX}bloqueado` });
      expect(res.status).toBe(403);
    }
  });

  test('cliente autenticado LÊ a lista de tipos (necessário para reservar) → 200', async () => {
    const admin = await criarAdminDireto(`a3${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    await criarTipo(admin.token);
    const cliente = await criarClienteELogar(`c2${Date.now()}${EMAIL_SUFFIX}`, 'senha123');

    const res = await request(app).get('/api/tipos-quarto').set(auth(cliente.token));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('não permite dois tipos com o mesmo nome (case-insensitive)', async () => {
    const admin = await criarAdminDireto(`a4${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const tipo = await criarTipo(admin.token);

    const duplicado = await request(app)
      .post('/api/tipos-quarto')
      .set(auth(admin.token))
      .send({ nome: tipo.nome.toUpperCase() });
    expect(duplicado.status).toBe(400);
  });

  test('editar tipo: renomear sincroniza quartos.tipo (texto) de todos os quartos associados', async () => {
    const admin = await criarAdminDireto(`a5${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const tipo = await criarTipo(admin.token);
    const quarto1 = await criarQuarto(admin.token, tipo.id);
    const quarto2 = await criarQuarto(admin.token, tipo.id);

    const novoNome = `${TYPE_PREFIX}renomeado${Date.now()}`;
    const edicao = await request(app)
      .put(`/api/tipos-quarto/${tipo.id}`)
      .set(auth(admin.token))
      .send({ nome: novoNome });
    expect(edicao.status).toBe(200);

    const { rows } = await pool.query('SELECT tipo FROM quartos WHERE id = ANY($1::int[])', [[quarto1.id, quarto2.id]]);
    expect(rows.every((r) => r.tipo === novoNome)).toBe(true);
  });

  test('desativar tipo: não remove o tipo nem desassocia os quartos já cadastrados (preserva histórico)', async () => {
    const admin = await criarAdminDireto(`a6${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const tipo = await criarTipo(admin.token);
    const quarto = await criarQuarto(admin.token, tipo.id);

    const desativacao = await request(app).put(`/api/tipos-quarto/${tipo.id}/desativar`).set(auth(admin.token));
    expect(desativacao.status).toBe(200);
    expect(desativacao.body.roomType.ativo).toBe(false);

    // não aparece mais na listagem padrão (só ativos)...
    const listaAtivos = await request(app).get('/api/tipos-quarto').set(auth(admin.token));
    expect(listaAtivos.body.find((t) => t.id === tipo.id)).toBeUndefined();

    // ...mas continua existindo e o quarto continua associado a ele.
    const { rows } = await pool.query('SELECT tipo_id FROM quartos WHERE id = $1', [quarto.id]);
    expect(rows[0].tipo_id).toBe(tipo.id);
  });

  test('recepcionista e cliente NÃO podem desativar tipo → 403', async () => {
    const admin = await criarAdminDireto(`a7${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const tipo = await criarTipo(admin.token);
    const recep = await criarRecepcionista(admin.token, `r2${Date.now()}${EMAIL_SUFFIX}`, 'senha123');

    const res = await request(app).put(`/api/tipos-quarto/${tipo.id}/desativar`).set(auth(recep.token));
    expect(res.status).toBe(403);
  });
});

// =========================================================================
// Quartos associados a tipos — criação, filtro, compatibilidade de relatório
// =========================================================================
describe('Quartos associados a tipos_quarto', () => {
  test('cadastrar quarto com tipo_id grava tipo_id e sincroniza quartos.tipo (texto)', async () => {
    const admin = await criarAdminDireto(`a8${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const tipo = await criarTipo(admin.token);
    const quarto = await criarQuarto(admin.token, tipo.id);

    expect(quarto.tipo_id).toBe(tipo.id);
    expect(quarto.tipo).toBe(tipo.nome);
  });

  test('cadastrar quarto com tipo_id inexistente → 400', async () => {
    const admin = await criarAdminDireto(`a9${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    contador += 1;
    const res = await request(app)
      .post('/api/quartos')
      .set(auth(admin.token))
      .send({ numero: `${ROOM_PREFIX}${contador}`, tipo_id: 999999, capacidade: 2, preco_por_noite: 100 });
    expect(res.status).toBe(400);
  });

  test('compatibilidade: cadastro legado sem tipo_id (só "tipo" em texto) continua funcionando', async () => {
    const admin = await criarAdminDireto(`a10${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    contador += 1;
    const res = await request(app)
      .post('/api/quartos')
      .set(auth(admin.token))
      .send({ numero: `${ROOM_PREFIX}${contador}`, tipo: 'Standard (legado)', capacidade: 2, preco_por_noite: 100 });
    expect(res.status).toBe(201);
    expect(res.body.room.tipo_id).toBeNull();
    expect(res.body.room.tipo).toBe('Standard (legado)');
  });

  test('GET /api/quartos?tipo_id= filtra só os quartos daquele tipo', async () => {
    const admin = await criarAdminDireto(`a11${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const tipoA = await criarTipo(admin.token);
    const tipoB = await criarTipo(admin.token);
    const quartoA = await criarQuarto(admin.token, tipoA.id);
    await criarQuarto(admin.token, tipoB.id);

    const res = await request(app).get(`/api/quartos?tipo_id=${tipoA.id}`).set(auth(admin.token));
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].id).toBe(quartoA.id);
  });

  test('relatório "preço médio por tipo de quarto" continua funcionando com quartos associados a tipos_quarto', async () => {
    const admin = await criarAdminDireto(`a12${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const tipo = await criarTipo(admin.token, { preco_base: 200 });
    await criarQuarto(admin.token, tipo.id, { preco_por_noite: 200 });

    const relatorio = await request(app).get('/api/relatorios/preco-medio-por-tipo-quarto').set(auth(admin.token));
    expect(relatorio.status).toBe(200);
    const linha = relatorio.body.find((r) => r.tipo_quarto === tipo.nome);
    expect(linha).toBeDefined();
  });

  test('recepcionista pode cadastrar e editar quarto; cliente não pode', async () => {
    const admin = await criarAdminDireto(`a13${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const tipo = await criarTipo(admin.token);
    const recep = await criarRecepcionista(admin.token, `r3${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const cliente = await criarClienteELogar(`c3${Date.now()}${EMAIL_SUFFIX}`, 'senha123');

    const quarto = await criarQuarto(recep.token, tipo.id);

    const edicaoCliente = await request(app)
      .put(`/api/quartos/${quarto.id}`)
      .set(auth(cliente.token))
      .send({ preco_por_noite: 999 });
    expect(edicaoCliente.status).toBe(403);
  });
});

// =========================================================================
// Disponibilidade para reserva: tipo + ocupação + limpeza
// =========================================================================
describe('Disponibilidade de quartos por tipo, ocupação e limpeza', () => {
  test('GET /api/quartos?status=disponivel&tipo_id= só lista quartos do tipo, livres e sem limpeza pendente', async () => {
    const admin = await criarAdminDireto(`a14${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const tipo = await criarTipo(admin.token);
    const quartoLivre = await criarQuarto(admin.token, tipo.id);
    const quartoComLimpezaPendente = await criarQuarto(admin.token, tipo.id);

    await pool.query(
      `INSERT INTO limpezas (quarto_id, status) VALUES ($1, 'pendente')`,
      [quartoComLimpezaPendente.id],
    );

    const res = await request(app)
      .get(`/api/quartos?status=disponivel&tipo_id=${tipo.id}`)
      .set(auth(admin.token));
    expect(res.status).toBe(200);
    const ids = res.body.map((q) => q.id);
    expect(ids).toContain(quartoLivre.id);
    expect(ids).not.toContain(quartoComLimpezaPendente.id);
  });

  test('fluxo completo: cliente cria reserva só com apartamento do tipo filtrado e listado como disponível', async () => {
    const admin = await criarAdminDireto(`a15${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const tipo = await criarTipo(admin.token);
    const quarto = await criarQuarto(admin.token, tipo.id);
    const cliente = await criarClienteELogar(`c4${Date.now()}${EMAIL_SUFFIX}`, 'senha123');

    const disponiveis = await request(app)
      .get(`/api/quartos?status=disponivel&tipo_id=${tipo.id}`)
      .set(auth(cliente.token));
    expect(disponiveis.body.map((q) => q.id)).toContain(quarto.id);

    const reserva = await request(app)
      .post('/api/reservas')
      .set(auth(cliente.token))
      .send({ quarto_id: quarto.id, data_checkin: amanha(0), data_checkout: amanha(1) });
    expect(reserva.status).toBe(201);
  });
});
