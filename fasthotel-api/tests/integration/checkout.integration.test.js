// fasthotel-api/tests/integration/checkout.integration.test.js
//
// Valida a correção da coluna "data_checkout_real" ausente em "reservas"
// (database/schema.sql). Antes da correção, PUT /api/reservas/:id/finalizar
// falhava com erro de coluna inexistente (HTTP 500) em qualquer banco criado
// a partir do schema.sql — exatamente o cenário real de fasthotel_test.

const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../../app');
const pool = require('../../config/db');

const EMAIL_SUFFIX = '@checkout.fasthotel.test';
const ROOM_PREFIX = 'CKO-';

const limparDados = async () => {
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

const auth = (token) => ({ 'x-auth-token': token });

async function criarAdminDireto(email, senha) {
  const hash = await bcrypt.hash(senha, 10);
  await pool.query(
    `INSERT INTO usuarios (nome, email, senha, tipo_usuario) VALUES ($1, $2, $3, 'admin')`,
    ['Admin Checkout', email, hash],
  );
  const login = await request(app).post('/api/usuarios/login').send({ email, senha });
  return login.body.token;
}

function amanha(diasExtra = 0) {
  const d = new Date();
  d.setDate(d.getDate() + 1 + diasExtra);
  return d.toISOString().slice(0, 10);
}

test('check-out (PUT /api/reservas/:id/finalizar) funciona com o schema atual', async () => {
  // F04: POST /api/quartos agora exige autenticação de equipe.
  const adminToken = await criarAdminDireto(`admin${EMAIL_SUFFIX}`, 'senha123');

  const quarto = await request(app).post('/api/quartos').set(auth(adminToken)).send({
    numero: `${ROOM_PREFIX}1`, tipo: 'standard', capacidade: 2, preco_por_noite: 100,
  });
  expect(quarto.status).toBe(201);
  const quartoId = quarto.body.room.id;

  const cadastro = await request(app)
    .post('/api/usuarios')
    .send({ nome: 'Hóspede Checkout', email: `hospede${EMAIL_SUFFIX}`, senha: 'senha123' });
  expect(cadastro.status).toBe(201);
  const login = await request(app)
    .post('/api/usuarios/login')
    .send({ email: `hospede${EMAIL_SUFFIX}`, senha: 'senha123' });
  const tokenCliente = login.body.token;

  const reserva = await request(app)
    .post('/api/reservas')
    .set(auth(tokenCliente))
    .send({ quarto_id: quartoId, data_checkin: amanha(0), data_checkout: amanha(1) });
  expect(reserva.status).toBe(201);
  const reservaId = reserva.body.booking.id;

  // Antes da correção: 500 (coluna "data_checkout_real" inexistente).
  const finalizacao = await request(app)
    .put(`/api/reservas/${reservaId}/finalizar`)
    .set(auth(adminToken));

  expect(finalizacao.status).toBe(200);
  expect(finalizacao.body.reserva.status_reserva).toBe('finalizada');

  const { rows } = await pool.query(
    'SELECT status_reserva, data_checkout_real FROM reservas WHERE id = $1',
    [reservaId],
  );
  expect(rows[0].status_reserva).toBe('finalizada');
  expect(rows[0].data_checkout_real).not.toBeNull();

  const { rows: quartoRows } = await pool.query('SELECT status FROM quartos WHERE id = $1', [quartoId]);
  expect(quartoRows[0].status).toBe('disponivel');
});
