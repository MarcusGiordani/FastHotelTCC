// fasthotel-api/tests/security/idor.test.js
//
// TEMA 1 — IDOR (Insecure Direct Object Reference).
//
// Testes REAIS (Supertest -> app.js -> rotas reais -> middlewares reais ->
// controllers reais -> PostgreSQL "fasthotel_test" real). Nenhum mock de
// banco: cada cenário cria usuários/recursos fictícios de verdade e tenta
// acessá-los/alterá-los trocando o ID na URL por um ID que pertence a outra
// pessoa, exatamente como um atacante faria manipulando a requisição.
//
// Para cada recurso testamos os dois lados:
//   - acesso INDEVIDO (outro usuário) -> deve ser bloqueado (403 ou 404,
//     conforme o contrato já documentado no controller daquela rota);
//   - acesso do PROPRIETÁRIO legítimo -> deve continuar funcionando (200).

const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../../app');
const pool = require('../../config/db');

const EMAIL_SUFFIX = '@idor.fasthotel.test';
const ROOM_PREFIX = 'IDOR-';

const limparDados = async () => {
  await pool.query(
    `DELETE FROM consumos WHERE reserva_id IN (
       SELECT id FROM reservas WHERE quarto_id IN (SELECT id FROM quartos WHERE numero LIKE $1)
     )`,
    [`${ROOM_PREFIX}%`],
  );
  await pool.query(
    `DELETE FROM pagamentos WHERE reserva_id IN (
       SELECT id FROM reservas WHERE quarto_id IN (SELECT id FROM quartos WHERE numero LIKE $1)
     )`,
    [`${ROOM_PREFIX}%`],
  );
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

// Helpers --------------------------------------------------------------------

const auth = (token) => ({ 'x-auth-token': token });
let contador = 0;

async function criarAdminDireto(email, senha) {
  const hash = await bcrypt.hash(senha, 10);
  await pool.query(
    `INSERT INTO usuarios (nome, email, senha, tipo_usuario) VALUES ($1, $2, $3, 'admin')`,
    ['Admin IDOR', email, hash],
  );
  const login = await request(app).post('/api/usuarios/login').send({ email, senha });
  return { token: login.body.token, id: login.body.user.id };
}

async function criarClienteELogar(email, senha) {
  await request(app).post('/api/usuarios').send({ nome: 'Cliente IDOR', email, senha });
  const login = await request(app).post('/api/usuarios/login').send({ email, senha });
  return { token: login.body.token, id: login.body.user.id };
}

function amanha(diasExtra = 0) {
  const d = new Date();
  d.setDate(d.getDate() + 1 + diasExtra);
  return d.toISOString().slice(0, 10);
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

/** Cria uma reserva do cliente, com hóspede vinculado e com um pagamento (feito pelo admin). */
async function criarReservaCompleta(clienteToken, adminToken) {
  const quartoId = await criarQuarto(adminToken);

  const hospede = await request(app)
    .post('/api/hospedes')
    .set(auth(clienteToken))
    .send({ nome: 'Hóspede', sobrenome: `IDOR${++contador}` });
  expect(hospede.status).toBe(201);

  const reserva = await request(app)
    .post('/api/reservas')
    .set(auth(clienteToken))
    .send({
      quarto_id: quartoId,
      data_checkin: amanha(0),
      data_checkout: amanha(1),
      hospede_principal_id: hospede.body.guest.id,
    });
  expect(reserva.status).toBe(201);

  const pagamento = await request(app)
    .post('/api/pagamentos')
    .set(auth(adminToken))
    .send({ reserva_id: reserva.body.booking.id, valor_pago: 150, metodo_pagamento: 'pix' });
  expect(pagamento.status).toBe(201);

  return {
    hospedeId: hospede.body.guest.id,
    reservaId: reserva.body.booking.id,
    pagamentoId: pagamento.body.payment.id,
  };
}

// =============================================================================
// Recurso: USUÁRIOS — GET/PUT /api/usuarios/:id
// =============================================================================
describe('IDOR — GET /api/usuarios/:id', () => {
  test('Cliente A tentando consultar dados privados do Cliente B (ID na URL) -> 403', async () => {
    const a = await criarClienteELogar(`clienteA1${EMAIL_SUFFIX}`, 'senha123');
    const b = await criarClienteELogar(`clienteB1${EMAIL_SUFFIX}`, 'senha123');

    const res = await request(app).get(`/api/usuarios/${b.id}`).set(auth(a.token));

    expect(res.status).toBe(403);
    expect(res.body).not.toHaveProperty('email'); // nenhum dado de B é exposto
  });

  test('Cliente tentando acessar dados restritos de administrador (GET /api/usuarios, lista completa) -> 403', async () => {
    const cliente = await criarClienteELogar(`clienteC1${EMAIL_SUFFIX}`, 'senha123');

    const res = await request(app).get('/api/usuarios').set(auth(cliente.token));

    expect(res.status).toBe(403);
  });

  test('Proprietário legítimo consulta o próprio usuário -> 200', async () => {
    const a = await criarClienteELogar(`clienteA2${EMAIL_SUFFIX}`, 'senha123');

    const res = await request(app).get(`/api/usuarios/${a.id}`).set(auth(a.token));

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(a.id);
  });
});

describe('IDOR — PUT /api/usuarios/:id', () => {
  test('Cliente A tentando modificar o perfil do Cliente B (ID trocado na URL) -> 403, nada é alterado', async () => {
    const a = await criarClienteELogar(`clienteA3${EMAIL_SUFFIX}`, 'senha123');
    const b = await criarClienteELogar(`clienteB3${EMAIL_SUFFIX}`, 'senha123');

    const res = await request(app)
      .put(`/api/usuarios/${b.id}`)
      .set(auth(a.token))
      .send({ nome: 'Nome Invadido' });

    expect(res.status).toBe(403);

    const { rows } = await pool.query('SELECT nome FROM usuarios WHERE id = $1', [b.id]);
    expect(rows[0].nome).toBe('Cliente IDOR');
  });

  test('Proprietário legítimo edita o próprio nome -> 200', async () => {
    const a = await criarClienteELogar(`clienteA4${EMAIL_SUFFIX}`, 'senha123');

    const res = await request(app)
      .put(`/api/usuarios/${a.id}`)
      .set(auth(a.token))
      .send({ nome: 'Nome Atualizado' });

    expect(res.status).toBe(200);
    expect(res.body.user.nome).toBe('Nome Atualizado');
  });
});

// =============================================================================
// Recurso: RESERVAS — GET /api/reservas/:id e listagem
// =============================================================================
describe('IDOR — reservas (GET /api/reservas/:id e listagem)', () => {
  test('Cliente A tentando consultar a reserva do Cliente B pelo ID -> 404 (não revela a existência)', async () => {
    const admin = await criarAdminDireto(`admin1${EMAIL_SUFFIX}`, 'senha123');
    const a = await criarClienteELogar(`clienteA5${EMAIL_SUFFIX}`, 'senha123');
    const b = await criarClienteELogar(`clienteB5${EMAIL_SUFFIX}`, 'senha123');

    const quartoId = await criarQuarto(admin.token);
    const reserva = await request(app)
      .post('/api/reservas')
      .set(auth(b.token))
      .send({ quarto_id: quartoId, data_checkin: amanha(0), data_checkout: amanha(1) });
    expect(reserva.status).toBe(201);

    const res = await request(app).get(`/api/reservas/${reserva.body.booking.id}`).set(auth(a.token));

    expect(res.status).toBe(404);
  });

  test('Cliente A não vê a reserva do Cliente B na listagem (GET /api/reservas) -> só as próprias', async () => {
    const admin = await criarAdminDireto(`admin2${EMAIL_SUFFIX}`, 'senha123');
    const a = await criarClienteELogar(`clienteA6${EMAIL_SUFFIX}`, 'senha123');
    const b = await criarClienteELogar(`clienteB6${EMAIL_SUFFIX}`, 'senha123');

    const quartoId = await criarQuarto(admin.token);
    const reservaB = await request(app)
      .post('/api/reservas')
      .set(auth(b.token))
      .send({ quarto_id: quartoId, data_checkin: amanha(0), data_checkout: amanha(1) });
    expect(reservaB.status).toBe(201);

    const res = await request(app).get('/api/reservas').set(auth(a.token));

    expect(res.status).toBe(200);
    expect(res.body.find((r) => r.id === reservaB.body.booking.id)).toBeUndefined();
  });

  test('Proprietário legítimo consulta a própria reserva -> 200', async () => {
    const admin = await criarAdminDireto(`admin3${EMAIL_SUFFIX}`, 'senha123');
    const b = await criarClienteELogar(`clienteB7${EMAIL_SUFFIX}`, 'senha123');

    const quartoId = await criarQuarto(admin.token);
    const reserva = await request(app)
      .post('/api/reservas')
      .set(auth(b.token))
      .send({ quarto_id: quartoId, data_checkin: amanha(0), data_checkout: amanha(1) });

    const res = await request(app).get(`/api/reservas/${reserva.body.booking.id}`).set(auth(b.token));

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(reserva.body.booking.id);
  });
});

// =============================================================================
// Recurso: HÓSPEDES — vínculo indireto via reservas.hospede_principal_id
// =============================================================================
describe('IDOR — hóspedes (GET/PUT /api/hospedes/:id)', () => {
  test('Cliente tentando consultar hóspede vinculado à reserva de outro cliente -> 403', async () => {
    const admin = await criarAdminDireto(`admin4${EMAIL_SUFFIX}`, 'senha123');
    const a = await criarClienteELogar(`clienteA8${EMAIL_SUFFIX}`, 'senha123');
    const b = await criarClienteELogar(`clienteB8${EMAIL_SUFFIX}`, 'senha123');
    const { hospedeId } = await criarReservaCompleta(b.token, admin.token);

    const res = await request(app).get(`/api/hospedes/${hospedeId}`).set(auth(a.token));

    expect(res.status).toBe(403);
  });

  test('Cliente tentando editar hóspede de outro cliente (alterando o ID na URL) -> 403, dado não é alterado', async () => {
    const admin = await criarAdminDireto(`admin5${EMAIL_SUFFIX}`, 'senha123');
    const a = await criarClienteELogar(`clienteA9${EMAIL_SUFFIX}`, 'senha123');
    const b = await criarClienteELogar(`clienteB9${EMAIL_SUFFIX}`, 'senha123');
    const { hospedeId } = await criarReservaCompleta(b.token, admin.token);

    const res = await request(app)
      .put(`/api/hospedes/${hospedeId}`)
      .set(auth(a.token))
      .send({ nome: 'Hospede Invadido' });

    expect(res.status).toBe(403);

    const { rows } = await pool.query('SELECT nome FROM hospedes WHERE id = $1', [hospedeId]);
    expect(rows[0].nome).toBe('Hóspede');
  });

  test('Cliente proprietário (dono da reserva) consulta o próprio hóspede -> 200', async () => {
    const admin = await criarAdminDireto(`admin6${EMAIL_SUFFIX}`, 'senha123');
    const b = await criarClienteELogar(`clienteB10${EMAIL_SUFFIX}`, 'senha123');
    const { hospedeId } = await criarReservaCompleta(b.token, admin.token);

    const res = await request(app).get(`/api/hospedes/${hospedeId}`).set(auth(b.token));

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(hospedeId);
  });
});

// =============================================================================
// Recurso: PAGAMENTOS — GET /api/pagamentos/:id
// =============================================================================
describe('IDOR — pagamentos (GET /api/pagamentos/:id)', () => {
  test('Cliente A tentando consultar o pagamento do Cliente B pelo ID -> 404', async () => {
    const admin = await criarAdminDireto(`admin7${EMAIL_SUFFIX}`, 'senha123');
    const a = await criarClienteELogar(`clienteA11${EMAIL_SUFFIX}`, 'senha123');
    const b = await criarClienteELogar(`clienteB11${EMAIL_SUFFIX}`, 'senha123');
    const { pagamentoId } = await criarReservaCompleta(b.token, admin.token);

    const res = await request(app).get(`/api/pagamentos/${pagamentoId}`).set(auth(a.token));

    expect(res.status).toBe(404);
  });

  test('Proprietário legítimo consulta o próprio pagamento -> 200', async () => {
    const admin = await criarAdminDireto(`admin8${EMAIL_SUFFIX}`, 'senha123');
    const b = await criarClienteELogar(`clienteB12${EMAIL_SUFFIX}`, 'senha123');
    const { pagamentoId } = await criarReservaCompleta(b.token, admin.token);

    const res = await request(app).get(`/api/pagamentos/${pagamentoId}`).set(auth(b.token));

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(pagamentoId);
  });
});

// =============================================================================
// Recurso: CONSUMOS — vínculo indireto via reservas.usuario_id
// =============================================================================
describe('IDOR — consumos (GET /api/consumos/:id)', () => {
  async function criarServico(adminToken) {
    contador += 1;
    const res = await request(app)
      .post('/api/servicos')
      .set(auth(adminToken))
      .send({ nome: `Serviço IDOR ${contador}`, preco: 20 });
    expect(res.status).toBe(201);
    return res.body.service.id;
  }

  test('Cliente A tentando consultar consumo de reserva do Cliente B -> 403', async () => {
    const admin = await criarAdminDireto(`admin9${EMAIL_SUFFIX}`, 'senha123');
    const a = await criarClienteELogar(`clienteA13${EMAIL_SUFFIX}`, 'senha123');
    const b = await criarClienteELogar(`clienteB13${EMAIL_SUFFIX}`, 'senha123');
    const { reservaId } = await criarReservaCompleta(b.token, admin.token);
    const servicoId = await criarServico(admin.token);

    const consumo = await request(app)
      .post('/api/consumos')
      .set(auth(b.token))
      .send({ reserva_id: reservaId, servico_id: servicoId, quantidade: 1 });
    expect(consumo.status).toBe(201);

    const res = await request(app).get(`/api/consumos/${consumo.body.consumption.id}`).set(auth(a.token));

    expect(res.status).toBe(403);
  });

  test('Proprietário legítimo consulta o próprio consumo -> 200', async () => {
    const admin = await criarAdminDireto(`admin10${EMAIL_SUFFIX}`, 'senha123');
    const b = await criarClienteELogar(`clienteB14${EMAIL_SUFFIX}`, 'senha123');
    const { reservaId } = await criarReservaCompleta(b.token, admin.token);
    const servicoId = await criarServico(admin.token);

    const consumo = await request(app)
      .post('/api/consumos')
      .set(auth(b.token))
      .send({ reserva_id: reservaId, servico_id: servicoId, quantidade: 1 });

    const res = await request(app).get(`/api/consumos/${consumo.body.consumption.id}`).set(auth(b.token));

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(consumo.body.consumption.id);
  });
});
