// fasthotel-api/tests/integration/access-control.integration.test.js
//
// Testes de integração REAIS (Supertest -> app.js -> rotas reais -> middlewares
// reais -> controllers reais -> PostgreSQL "fasthotel_test" real) para as
// correções de F03 a F07 (Etapa de correções finais pós-validação).
//
// Cada bloco testa tanto o acesso PERMITIDO (equipe sempre; cliente só no que
// é seu) quanto o acesso NEGADO (cliente tentando acessar/alterar dado de
// terceiro), conforme pedido explicitamente nesta etapa.

const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../../app');
const pool = require('../../config/db');

const EMAIL_SUFFIX = '@access.fasthotel.test';
// roomController.getAllRooms ordena com CAST(numero AS INTEGER) (convenção do app
// inteiro — números reais de quarto são numéricos), por isso os quartos de teste
// usam uma faixa numérica dedicada, como em cleaning/inventory/finance.
const ROOM_PREFIX = '97';

const limparDados = async () => {
  await pool.query(
    `DELETE FROM consumos WHERE reserva_id IN (
       SELECT id FROM reservas WHERE quarto_id IN (SELECT id FROM quartos WHERE numero LIKE $1)
     )`,
    [`${ROOM_PREFIX}%`],
  );
  await pool.query(`DELETE FROM servicos WHERE nome LIKE $1`, [`${ROOM_PREFIX}%`]);
  // Precisa rodar ANTES de apagar as reservas (o vínculo é por elas) — e não pode
  // confiar em cpf/email do hóspede como critério, pois os próprios testes de F05
  // editam o hóspede (PUT só com "nome", e updateGuest não usa COALESCE: isso
  // zera cpf/sobrenome/email), o que órfãizaria a linha para um filtro por cpf/email.
  await pool.query(
    `DELETE FROM hospedes WHERE id IN (
       SELECT hospede_principal_id FROM reservas
       WHERE quarto_id IN (SELECT id FROM quartos WHERE numero LIKE $1)
       AND hospede_principal_id IS NOT NULL
     )`,
    [`${ROOM_PREFIX}%`],
  );
  await pool.query(
    `DELETE FROM reservas WHERE quarto_id IN (SELECT id FROM quartos WHERE numero LIKE $1)`,
    [`${ROOM_PREFIX}%`],
  );
  await pool.query('DELETE FROM quartos WHERE numero LIKE $1', [`${ROOM_PREFIX}%`]);
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
    ['Admin Access', email, hash],
  );
  const login = await request(app).post('/api/usuarios/login').send({ email, senha });
  return { token: login.body.token, id: login.body.user.id };
}

async function criarRecepcionista(adminToken, email, senha) {
  await request(app)
    .post('/api/usuarios/staff')
    .set(auth(adminToken))
    .send({ nome: 'Recepcionista Access', email, senha, tipo_usuario: 'recepcionista' });
  const login = await request(app).post('/api/usuarios/login').send({ email, senha });
  return { token: login.body.token, id: login.body.user.id };
}

async function criarClienteELogar(email, senha) {
  await request(app).post('/api/usuarios').send({ nome: 'Cliente Access', email, senha });
  const login = await request(app).post('/api/usuarios/login').send({ email, senha });
  return { token: login.body.token, id: login.body.user.id };
}

async function criarQuarto(adminToken) {
  contador += 1;
  const res = await request(app).post('/api/quartos').set(auth(adminToken)).send({
    numero: `${ROOM_PREFIX}${contador}`,
    tipo: 'standard',
    capacidade: 2,
    preco_por_noite: 150,
  });
  expect(res.status).toBe(201);
  return res.body.room.id;
}

function amanha(diasExtra = 0) {
  const d = new Date();
  d.setDate(d.getDate() + 1 + diasExtra);
  return d.toISOString().slice(0, 10);
}

/** Cria um hóspede e uma reserva do "cliente" vinculada a ele (hospede_principal_id). */
async function criarReservaComHospede(clienteToken, quartoId) {
  contador += 1;
  const hospede = await request(app)
    .post('/api/hospedes')
    .set(auth(clienteToken))
    .send({ nome: 'Hóspede', sobrenome: `Access${contador}` }); // CPF é opcional; irrelevante para F05/F07
  expect(hospede.status).toBe(201);
  const hospedeId = hospede.body.guest.id;

  const reserva = await request(app)
    .post('/api/reservas')
    .set(auth(clienteToken))
    .send({
      quarto_id: quartoId,
      data_checkin: amanha(0),
      data_checkout: amanha(1),
      hospede_principal_id: hospedeId,
    });
  expect(reserva.status).toBe(201);

  return { hospedeId, reservaId: reserva.body.booking.id };
}

// =========================================================================
// F03 — GET /api/usuarios/:id só o próprio usuário ou equipe
// =========================================================================
describe('F03 — consulta de usuário por ID respeita propriedade', () => {
  test('cliente consulta o PRÓPRIO usuário → 200', async () => {
    const cliente = await criarClienteELogar(`c1${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const res = await request(app).get(`/api/usuarios/${cliente.id}`).set(auth(cliente.token));
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(cliente.id);
  });

  test('cliente consulta usuário de OUTRA pessoa → 403', async () => {
    const cliente1 = await criarClienteELogar(`c2${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const cliente2 = await criarClienteELogar(`c3${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const res = await request(app).get(`/api/usuarios/${cliente2.id}`).set(auth(cliente1.token));
    expect(res.status).toBe(403);
  });

  test('admin consulta qualquer usuário → 200', async () => {
    const admin = await criarAdminDireto(`a1${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const cliente = await criarClienteELogar(`c4${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const res = await request(app).get(`/api/usuarios/${cliente.id}`).set(auth(admin.token));
    expect(res.status).toBe(200);
  });

  test('recepcionista consulta qualquer usuário → 200', async () => {
    const admin = await criarAdminDireto(`a2${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const recep = await criarRecepcionista(admin.token, `r1${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const cliente = await criarClienteELogar(`c5${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const res = await request(app).get(`/api/usuarios/${cliente.id}`).set(auth(recep.token));
    expect(res.status).toBe(200);
  });
});

// =========================================================================
// F04 — Rotas de quartos: leitura para qualquer autenticado, escrita só equipe
// =========================================================================
describe('F04 — quartos exigem autenticação; escrita só para equipe', () => {
  test('GET /api/quartos sem token → 401', async () => {
    const res = await request(app).get('/api/quartos');
    expect(res.status).toBe(401);
  });

  test('cliente autenticado LÊ quartos (listagem e por ID) → 200', async () => {
    const admin = await criarAdminDireto(`a3${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const quartoId = await criarQuarto(admin.token);
    const cliente = await criarClienteELogar(`c6${Date.now()}${EMAIL_SUFFIX}`, 'senha123');

    const lista = await request(app).get('/api/quartos').set(auth(cliente.token));
    expect(lista.status).toBe(200);

    const porId = await request(app).get(`/api/quartos/${quartoId}`).set(auth(cliente.token));
    expect(porId.status).toBe(200);
  });

  test('cliente NÃO pode criar/editar/excluir quarto → 403', async () => {
    const admin = await criarAdminDireto(`a4${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const quartoId = await criarQuarto(admin.token);
    const cliente = await criarClienteELogar(`c7${Date.now()}${EMAIL_SUFFIX}`, 'senha123');

    const criar = await request(app).post('/api/quartos').set(auth(cliente.token)).send({
      numero: `${ROOM_PREFIX}${++contador}`, tipo: 'standard', capacidade: 2, preco_por_noite: 100,
    });
    expect(criar.status).toBe(403);

    const editar = await request(app).put(`/api/quartos/${quartoId}`).set(auth(cliente.token)).send({ preco_por_noite: 999 });
    expect(editar.status).toBe(403);

    const excluir = await request(app).delete(`/api/quartos/${quartoId}`).set(auth(cliente.token));
    expect(excluir.status).toBe(403);
  });

  test('recepcionista pode criar e excluir quarto → 201 / 200', async () => {
    const admin = await criarAdminDireto(`a5${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const recep = await criarRecepcionista(admin.token, `r2${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    contador += 1;
    const criar = await request(app).post('/api/quartos').set(auth(recep.token)).send({
      numero: `${ROOM_PREFIX}${contador}`, tipo: 'standard', capacidade: 2, preco_por_noite: 100,
    });
    expect(criar.status).toBe(201);

    const excluir = await request(app).delete(`/api/quartos/${criar.body.room.id}`).set(auth(recep.token));
    expect(excluir.status).toBe(200);
  });
});

// =========================================================================
// F05 — Hóspedes: cliente só acessa hóspede de reserva própria
// =========================================================================
describe('F05 — hóspedes respeitam propriedade via reserva', () => {
  test('listagem completa de hóspedes: cliente → 403, equipe → 200', async () => {
    const admin = await criarAdminDireto(`a6${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const cliente = await criarClienteELogar(`c8${Date.now()}${EMAIL_SUFFIX}`, 'senha123');

    const comoCliente = await request(app).get('/api/hospedes').set(auth(cliente.token));
    expect(comoCliente.status).toBe(403);

    const comoAdmin = await request(app).get('/api/hospedes').set(auth(admin.token));
    expect(comoAdmin.status).toBe(200);
  });

  test('cliente acessa e edita hóspede da PRÓPRIA reserva → 200', async () => {
    const admin = await criarAdminDireto(`a7${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const quartoId = await criarQuarto(admin.token);
    const cliente = await criarClienteELogar(`c9${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const { hospedeId } = await criarReservaComHospede(cliente.token, quartoId);

    const leitura = await request(app).get(`/api/hospedes/${hospedeId}`).set(auth(cliente.token));
    expect(leitura.status).toBe(200);

    const edicao = await request(app)
      .put(`/api/hospedes/${hospedeId}`)
      .set(auth(cliente.token))
      .send({ nome: 'Hóspede Editado' });
    expect(edicao.status).toBe(200);
    expect(edicao.body.guest.nome).toBe('Hóspede Editado');
  });

  test('cliente NÃO acessa nem edita hóspede de reserva de TERCEIRO → 403', async () => {
    const admin = await criarAdminDireto(`a8${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const quartoId = await criarQuarto(admin.token);
    const dono = await criarClienteELogar(`c10${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const outro = await criarClienteELogar(`c11${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const { hospedeId } = await criarReservaComHospede(dono.token, quartoId);

    const leitura = await request(app).get(`/api/hospedes/${hospedeId}`).set(auth(outro.token));
    expect(leitura.status).toBe(403);

    const edicao = await request(app)
      .put(`/api/hospedes/${hospedeId}`)
      .set(auth(outro.token))
      .send({ nome: 'Tentativa Indevida' });
    expect(edicao.status).toBe(403);
  });

  test('exclusão de hóspede: cliente → 403, admin → 200', async () => {
    const admin = await criarAdminDireto(`a9${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const quartoId = await criarQuarto(admin.token);
    const cliente = await criarClienteELogar(`c12${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const { hospedeId } = await criarReservaComHospede(cliente.token, quartoId);

    const comoCliente = await request(app).delete(`/api/hospedes/${hospedeId}`).set(auth(cliente.token));
    expect(comoCliente.status).toBe(403);

    const comoAdmin = await request(app).delete(`/api/hospedes/${hospedeId}`).set(auth(admin.token));
    expect(comoAdmin.status).toBe(200);
  });
});

// =========================================================================
// F06 — Serviços: leitura aberta, escrita só equipe
// =========================================================================
describe('F06 — catálogo de serviços: leitura aberta, escrita só para equipe', () => {
  test('cliente LÊ o catálogo de serviços → 200', async () => {
    const cliente = await criarClienteELogar(`c13${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const res = await request(app).get('/api/servicos').set(auth(cliente.token));
    expect(res.status).toBe(200);
  });

  test('cliente NÃO pode criar/editar/excluir serviço → 403', async () => {
    const admin = await criarAdminDireto(`a10${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const servico = await request(app).post('/api/servicos').set(auth(admin.token)).send({
      nome: `${ROOM_PREFIX}Massagem`, descricao: 'Relaxante', preco: 100,
    });
    expect(servico.status).toBe(201);
    const servicoId = servico.body.service.id;

    const cliente = await criarClienteELogar(`c14${Date.now()}${EMAIL_SUFFIX}`, 'senha123');

    const criar = await request(app).post('/api/servicos').set(auth(cliente.token)).send({
      nome: `${ROOM_PREFIX}Outro`, descricao: 'x', preco: 50,
    });
    expect(criar.status).toBe(403);

    const editar = await request(app).put(`/api/servicos/${servicoId}`).set(auth(cliente.token)).send({ preco: 1 });
    expect(editar.status).toBe(403);

    const excluir = await request(app).delete(`/api/servicos/${servicoId}`).set(auth(cliente.token));
    expect(excluir.status).toBe(403);
  });

  test('recepcionista pode criar serviço → 201', async () => {
    const admin = await criarAdminDireto(`a11${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const recep = await criarRecepcionista(admin.token, `r3${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const res = await request(app).post('/api/servicos').set(auth(recep.token)).send({
      nome: `${ROOM_PREFIX}Spa`, descricao: 'Spa completo', preco: 200,
    });
    expect(res.status).toBe(201);
  });
});

// =========================================================================
// F07 — Consumos: cliente só acessa/altera consumo da PRÓPRIA reserva
// =========================================================================
describe('F07 — consumos respeitam vínculo com a reserva', () => {
  async function criarServico(adminToken) {
    const res = await request(app).post('/api/servicos').set(auth(adminToken)).send({
      nome: `${ROOM_PREFIX}Servico${++contador}`, descricao: 'desc', preco: 50,
    });
    expect(res.status).toBe(201);
    return res.body.service.id;
  }

  test('cliente registra e lê consumo da PRÓPRIA reserva → 201 / 200', async () => {
    const admin = await criarAdminDireto(`a12${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const quartoId = await criarQuarto(admin.token);
    const servicoId = await criarServico(admin.token);
    const cliente = await criarClienteELogar(`c15${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const { reservaId } = await criarReservaComHospede(cliente.token, quartoId);

    const criar = await request(app).post('/api/consumos').set(auth(cliente.token)).send({
      reserva_id: reservaId, servico_id: servicoId, quantidade: 2,
    });
    expect(criar.status).toBe(201);
    const consumoId = criar.body.consumption.id;

    const porId = await request(app).get(`/api/consumos/${consumoId}`).set(auth(cliente.token));
    expect(porId.status).toBe(200);

    const lista = await request(app).get(`/api/consumos?reserva_id=${reservaId}`).set(auth(cliente.token));
    expect(lista.status).toBe(200);
    expect(lista.body.some((c) => c.id === consumoId)).toBe(true);
  });

  test('cliente NÃO registra nem lê consumo de reserva de TERCEIRO → 403', async () => {
    const admin = await criarAdminDireto(`a13${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const quartoId = await criarQuarto(admin.token);
    const servicoId = await criarServico(admin.token);
    const dono = await criarClienteELogar(`c16${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const outro = await criarClienteELogar(`c17${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const { reservaId } = await criarReservaComHospede(dono.token, quartoId);

    const criarDeOutro = await request(app).post('/api/consumos').set(auth(outro.token)).send({
      reserva_id: reservaId, servico_id: servicoId, quantidade: 1,
    });
    expect(criarDeOutro.status).toBe(403);

    const consumoDono = await request(app).post('/api/consumos').set(auth(dono.token)).send({
      reserva_id: reservaId, servico_id: servicoId, quantidade: 1,
    });
    expect(consumoDono.status).toBe(201);
    const consumoId = consumoDono.body.consumption.id;

    const leituraOutro = await request(app).get(`/api/consumos/${consumoId}`).set(auth(outro.token));
    expect(leituraOutro.status).toBe(403);

    const edicaoOutro = await request(app)
      .put(`/api/consumos/${consumoId}`)
      .set(auth(outro.token))
      .send({ quantidade: 99 });
    expect(edicaoOutro.status).toBe(403);

    const exclusaoOutro = await request(app).delete(`/api/consumos/${consumoId}`).set(auth(outro.token));
    expect(exclusaoOutro.status).toBe(403);
  });

  test('listagem sem filtro: cliente só vê consumos das PRÓPRIAS reservas', async () => {
    const admin = await criarAdminDireto(`a14${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const quartoId1 = await criarQuarto(admin.token);
    const quartoId2 = await criarQuarto(admin.token);
    const servicoId = await criarServico(admin.token);
    const cliente1 = await criarClienteELogar(`c18${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const cliente2 = await criarClienteELogar(`c19${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const { reservaId: reserva1 } = await criarReservaComHospede(cliente1.token, quartoId1);
    const { reservaId: reserva2 } = await criarReservaComHospede(cliente2.token, quartoId2);

    const c1 = await request(app).post('/api/consumos').set(auth(cliente1.token)).send({
      reserva_id: reserva1, servico_id: servicoId, quantidade: 1,
    });
    expect(c1.status).toBe(201);
    const c2 = await request(app).post('/api/consumos').set(auth(cliente2.token)).send({
      reserva_id: reserva2, servico_id: servicoId, quantidade: 1,
    });
    expect(c2.status).toBe(201);

    const listaCliente1 = await request(app).get('/api/consumos').set(auth(cliente1.token));
    expect(listaCliente1.status).toBe(200);
    expect(listaCliente1.body.every((c) => c.reserva_id === reserva1)).toBe(true);

    const listaAdmin = await request(app).get('/api/consumos').set(auth(admin.token));
    const idsAdmin = listaAdmin.body.map((c) => c.id);
    expect(idsAdmin).toEqual(expect.arrayContaining([c1.body.consumption.id, c2.body.consumption.id]));
  });

  test('equipe acessa e altera consumo de qualquer reserva → 200', async () => {
    const admin = await criarAdminDireto(`a15${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const quartoId = await criarQuarto(admin.token);
    const servicoId = await criarServico(admin.token);
    const cliente = await criarClienteELogar(`c20${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const { reservaId } = await criarReservaComHospede(cliente.token, quartoId);

    const criar = await request(app).post('/api/consumos').set(auth(admin.token)).send({
      reserva_id: reservaId, servico_id: servicoId, quantidade: 1,
    });
    expect(criar.status).toBe(201);
    const consumoId = criar.body.consumption.id;

    const edicao = await request(app)
      .put(`/api/consumos/${consumoId}`)
      .set(auth(admin.token))
      .send({ quantidade: 5 });
    expect(edicao.status).toBe(200);

    const exclusao = await request(app).delete(`/api/consumos/${consumoId}`).set(auth(admin.token));
    expect(exclusao.status).toBe(200);
  });
});
