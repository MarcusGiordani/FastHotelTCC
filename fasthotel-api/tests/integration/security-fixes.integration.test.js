// fasthotel-api/tests/integration/security-fixes.integration.test.js
//
// Testes de integração REAIS (Supertest -> app.js -> rotas reais -> middlewares
// reais -> controllers reais -> PostgreSQL "fasthotel_test" real) para as
// correções de segurança F01, F02, F08 e F09.
//
// O único ponto que não passa pela API é a criação da PRIMEIRA conta admin
// (INSERT direto, com bcrypt), porque agora não existe nenhuma rota pública
// capaz de criar um admin (é exatamente isso que a correção F01 garante) —
// mesmo "seed administrativo fora da API pública" descrito no plano de correção.

const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../../app');
const pool = require('../../config/db');

const EMAIL_SUFFIX = '@sec.fasthotel.test';
const ROOM_PREFIX = 'SEC-';

const limparDados = async () => {
  // Desde a Etapa 4 (Fluxo de Caixa), todo pagamento aprovado criado aqui (testes F08/F09)
  // também gera uma movimentação financeira automática — precisa ser limpa ANTES de
  // apagar os pagamentos, senão fica órfã (pagamento_id e criado_por viram NULL).
  await pool.query(
    `DELETE FROM movimentacoes_financeiras WHERE pagamento_id IN (
       SELECT p.id FROM pagamentos p
       JOIN reservas r ON p.reserva_id = r.id
       JOIN quartos q ON r.quarto_id = q.id
       WHERE q.numero LIKE $1
     )`,
    [`${ROOM_PREFIX}%`],
  );
  await pool.query(
    `DELETE FROM pagamentos WHERE reserva_id IN (
       SELECT id FROM reservas WHERE quarto_id IN (
         SELECT id FROM quartos WHERE numero LIKE $1
       )
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

// Helpers ---------------------------------------------------------------

const cadastrar = (body) => request(app).post('/api/usuarios').send(body);
const logar = (body) => request(app).post('/api/usuarios/login').send(body);
const auth = (token) => ({ 'x-auth-token': token });

/** Único ponto que foge da API: semente da primeira conta admin do ambiente de teste. */
async function criarAdminDireto(email, senha) {
  const hash = await bcrypt.hash(senha, 10);
  await pool.query(
    `INSERT INTO usuarios (nome, email, senha, tipo_usuario) VALUES ($1, $2, $3, 'admin')`,
    ['Admin Seed', email, hash],
  );
  const login = await logar({ email, senha });
  return login.body.token;
}

async function criarClienteELogar(email, senha, nome = 'Cliente Teste') {
  const reg = await cadastrar({ nome, email, senha });
  expect(reg.status).toBe(201);
  const login = await logar({ email, senha });
  expect(login.status).toBe(200);
  return { token: login.body.token, id: login.body.user.id };
}

// F04: POST /api/quartos agora exige autenticação de equipe — usa um admin
// descartável só para criar o quarto de teste (limparDados cobre o e-mail).
// OBS: o e-mail não pode incluir "numero" (tem letras maiúsculas, ex. "SEC-101") —
// o INSERT direto grava sem normalizar, mas o login normaliza (minúsculas) antes
// de buscar no banco, e a busca é case-sensitive: duas grafias diferentes nunca
// baterim, e o login falharia silenciosamente (token undefined).
let contadorQuartoDisponivel = 0;
async function criarQuartoDisponivel(numero) {
  contadorQuartoDisponivel += 1;
  const tokenCriador = await criarAdminDireto(`quarto-setup${Date.now()}${contadorQuartoDisponivel}${EMAIL_SUFFIX}`, 'senha123');
  const res = await request(app).post('/api/quartos').set(auth(tokenCriador)).send({
    numero,
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

// =========================================================================
// F01 — cadastro público nunca cria admin; criação de equipe exige admin
// =========================================================================
describe('F01 — autocadastro não pode mais criar administrador', () => {
  test('POST /api/usuarios (público) ignora tipo_usuario="admin" e cria "cliente"', async () => {
    const email = `visitante${EMAIL_SUFFIX}`;
    const res = await cadastrar({ nome: 'Visitante', email, senha: 'senha123', tipo_usuario: 'admin' });

    expect(res.status).toBe(201);
    expect(res.body.user.tipo_usuario).toBe('cliente');

    const { rows } = await pool.query('SELECT tipo_usuario FROM usuarios WHERE email = $1', [email]);
    expect(rows[0].tipo_usuario).toBe('cliente');
  });

  test('POST /api/usuarios/staff sem token → 401', async () => {
    const res = await request(app).post('/api/usuarios/staff').send({
      nome: 'Equipe', email: `staff1${EMAIL_SUFFIX}`, senha: 'senha123', tipo_usuario: 'recepcionista',
    });
    expect(res.status).toBe(401);
  });

  test('POST /api/usuarios/staff autenticado como cliente → 403', async () => {
    const { token } = await criarClienteELogar(`cliente1${EMAIL_SUFFIX}`, 'senha123');

    const res = await request(app)
      .post('/api/usuarios/staff')
      .set(auth(token))
      .send({ nome: 'Equipe', email: `staff2${EMAIL_SUFFIX}`, senha: 'senha123', tipo_usuario: 'recepcionista' });

    expect(res.status).toBe(403);
  });

  test('POST /api/usuarios/staff autenticado como admin → 201, cria com o papel enviado', async () => {
    const adminToken = await criarAdminDireto(`admin1${EMAIL_SUFFIX}`, 'senha123');

    const res = await request(app)
      .post('/api/usuarios/staff')
      .set(auth(adminToken))
      .send({ nome: 'Recepção', email: `staff3${EMAIL_SUFFIX}`, senha: 'senha123', tipo_usuario: 'recepcionista' });

    expect(res.status).toBe(201);
    expect(res.body.user.tipo_usuario).toBe('recepcionista');
  });
});

// =========================================================================
// F02 — PUT /api/usuarios/:id não permite mais auto-promoção nem alterar terceiros
// =========================================================================
describe('F02 — atualização de usuário não permite mais elevação de privilégio', () => {
  test('cliente tentando virar admin (próprio id) → 403, papel não muda no banco', async () => {
    const { token, id } = await criarClienteELogar(`clienteA${EMAIL_SUFFIX}`, 'senha123');

    const res = await request(app).put(`/api/usuarios/${id}`).set(auth(token)).send({ tipo_usuario: 'admin' });
    expect(res.status).toBe(403);

    const { rows } = await pool.query('SELECT tipo_usuario FROM usuarios WHERE id = $1', [id]);
    expect(rows[0].tipo_usuario).toBe('cliente');
  });

  test('cliente tentando alterar dados de outro usuário → 403', async () => {
    const { token } = await criarClienteELogar(`clienteB1${EMAIL_SUFFIX}`, 'senha123');
    const { id: outroId } = await criarClienteELogar(`clienteB2${EMAIL_SUFFIX}`, 'senha123');

    const res = await request(app).put(`/api/usuarios/${outroId}`).set(auth(token)).send({ nome: 'Hack' });
    expect(res.status).toBe(403);
  });

  test('cliente editando o próprio nome (sem tipo_usuario) continua funcionando', async () => {
    const { token, id } = await criarClienteELogar(`clienteC${EMAIL_SUFFIX}`, 'senha123');

    const res = await request(app).put(`/api/usuarios/${id}`).set(auth(token)).send({ nome: 'Nome Atualizado' });
    expect(res.status).toBe(200);
    expect(res.body.user.nome).toBe('Nome Atualizado');
  });

  test('admin alterando tipo_usuario de outro usuário → 200, permitido', async () => {
    const adminToken = await criarAdminDireto(`admin2${EMAIL_SUFFIX}`, 'senha123');
    const { id: clienteId } = await criarClienteELogar(`clienteD${EMAIL_SUFFIX}`, 'senha123');

    const res = await request(app)
      .put(`/api/usuarios/${clienteId}`)
      .set(auth(adminToken))
      .send({ tipo_usuario: 'recepcionista' });

    expect(res.status).toBe(200);
    expect(res.body.user.tipo_usuario).toBe('recepcionista');
  });
});

// =========================================================================
// F08/F09 — pagamentos: leitura só do dono (ou staff); criação só por staff
// =========================================================================
describe('F08/F09 — pagamentos exigem autorização adequada', () => {
  async function prepararReservaComPagamento() {
    const adminToken = await criarAdminDireto(`admin3${EMAIL_SUFFIX}`, 'senha123');
    const { token: tokenA, id: idA } = await criarClienteELogar(`clienteE${EMAIL_SUFFIX}`, 'senha123');
    const quartoId = await criarQuartoDisponivel(`${ROOM_PREFIX}101`);

    const reserva = await request(app)
      .post('/api/reservas')
      .set(auth(tokenA))
      .send({ quarto_id: quartoId, data_checkin: amanha(0), data_checkout: amanha(1) });
    expect(reserva.status).toBe(201);
    const reservaId = reserva.body.booking.id;

    const pagamento = await request(app)
      .post('/api/pagamentos')
      .set(auth(adminToken))
      .send({ reserva_id: reservaId, valor_pago: 150, metodo_pagamento: 'pix' });
    expect(pagamento.status).toBe(201);

    return { adminToken, tokenA, idA, pagamentoId: pagamento.body.payment.id };
  }

  test('F09: cliente autenticado NÃO consegue criar pagamento → 403', async () => {
    const { token } = await criarClienteELogar(`clienteF${EMAIL_SUFFIX}`, 'senha123');
    const quartoId = await criarQuartoDisponivel(`${ROOM_PREFIX}102`);

    const reserva = await request(app)
      .post('/api/reservas')
      .set(auth(token))
      .send({ quarto_id: quartoId, data_checkin: amanha(0), data_checkout: amanha(1) });
    expect(reserva.status).toBe(201);

    const res = await request(app)
      .post('/api/pagamentos')
      .set(auth(token))
      .send({ reserva_id: reserva.body.booking.id, valor_pago: 150, metodo_pagamento: 'pix' });

    expect(res.status).toBe(403);
  });

  test('F09: recepcionista consegue criar pagamento → 201', async () => {
    const adminToken = await criarAdminDireto(`admin4${EMAIL_SUFFIX}`, 'senha123');
    const staff = await request(app)
      .post('/api/usuarios/staff')
      .set(auth(adminToken))
      .send({ nome: 'Recep', email: `staff4${EMAIL_SUFFIX}`, senha: 'senha123', tipo_usuario: 'recepcionista' });
    const staffLogin = await logar({ email: `staff4${EMAIL_SUFFIX}`, senha: 'senha123' });

    const { token: tokenCliente } = await criarClienteELogar(`clienteG${EMAIL_SUFFIX}`, 'senha123');
    const quartoId = await criarQuartoDisponivel(`${ROOM_PREFIX}103`);
    const reserva = await request(app)
      .post('/api/reservas')
      .set(auth(tokenCliente))
      .send({ quarto_id: quartoId, data_checkin: amanha(0), data_checkout: amanha(1) });

    const res = await request(app)
      .post('/api/pagamentos')
      .set(auth(staffLogin.body.token))
      .send({ reserva_id: reserva.body.booking.id, valor_pago: 150, metodo_pagamento: 'pix' });

    expect(res.status).toBe(201);
    expect(staff.status).toBe(201); // confirma que o setup de staff funcionou
  });

  test('F08: o dono da reserva lê o próprio pagamento → 200', async () => {
    const { tokenA, pagamentoId } = await prepararReservaComPagamento();

    const res = await request(app).get(`/api/pagamentos/${pagamentoId}`).set(auth(tokenA));
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(pagamentoId);
  });

  test('F08: outro cliente NÃO consegue ler o pagamento por ID → 404', async () => {
    const { pagamentoId } = await prepararReservaComPagamento();
    const { token: tokenB } = await criarClienteELogar(`clienteH${EMAIL_SUFFIX}`, 'senha123');

    const res = await request(app).get(`/api/pagamentos/${pagamentoId}`).set(auth(tokenB));
    expect(res.status).toBe(404);
  });

  test('F08: outro cliente NÃO vê o pagamento de terceiro na listagem', async () => {
    const { pagamentoId } = await prepararReservaComPagamento();
    const { token: tokenB } = await criarClienteELogar(`clienteI${EMAIL_SUFFIX}`, 'senha123');

    const res = await request(app).get('/api/pagamentos').set(auth(tokenB));
    expect(res.status).toBe(200);
    expect(res.body.find((p) => p.id === pagamentoId)).toBeUndefined();
  });

  test('F08: admin vê o pagamento de qualquer reserva na listagem', async () => {
    const { adminToken, pagamentoId } = await prepararReservaComPagamento();

    const res = await request(app).get('/api/pagamentos').set(auth(adminToken));
    expect(res.status).toBe(200);
    expect(res.body.find((p) => p.id === pagamentoId)).toBeDefined();
  });
});
