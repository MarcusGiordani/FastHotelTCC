// fasthotel-api/tests/integration/cleaning.integration.test.js
//
// Testes de integração REAIS (Supertest -> app.js -> rotas reais -> middlewares
// reais -> controllers reais -> PostgreSQL "fasthotel_test" real) do módulo de
// Controle de Limpeza e de sua integração com o checkout de reservas.

const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../../app');
const pool = require('../../config/db');

const EMAIL_SUFFIX = '@clean.fasthotel.test';
// roomController/cleaningController ordenam quartos com CAST(numero AS INTEGER)
// (mesma convenção do app inteiro — números reais de quarto são numéricos), por
// isso os quartos de teste usam uma faixa numérica dedicada em vez de prefixo.
const ROOM_PREFIX = '99';

const limparDados = async () => {
  await pool.query(`DELETE FROM limpezas WHERE quarto_id IN (SELECT id FROM quartos WHERE numero LIKE $1)`, [`${ROOM_PREFIX}%`]);
  await pool.query(`DELETE FROM pagamentos WHERE reserva_id IN (SELECT id FROM reservas WHERE quarto_id IN (SELECT id FROM quartos WHERE numero LIKE $1))`, [`${ROOM_PREFIX}%`]);
  await pool.query(`DELETE FROM reservas WHERE quarto_id IN (SELECT id FROM quartos WHERE numero LIKE $1)`, [`${ROOM_PREFIX}%`]);
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
let contadorQuarto = 0;

async function criarAdminDireto(email, senha) {
  const hash = await bcrypt.hash(senha, 10);
  await pool.query(
    `INSERT INTO usuarios (nome, email, senha, tipo_usuario) VALUES ($1, $2, $3, 'admin')`,
    ['Admin Limpeza', email, hash],
  );
  const login = await request(app).post('/api/usuarios/login').send({ email, senha });
  return login.body.token;
}

async function criarRecepcionista(adminToken, email, senha) {
  await request(app)
    .post('/api/usuarios/staff')
    .set(auth(adminToken))
    .send({ nome: 'Recepcionista Limpeza', email, senha, tipo_usuario: 'recepcionista' });
  const login = await request(app).post('/api/usuarios/login').send({ email, senha });
  return login.body;
}

async function criarClienteELogar(email, senha) {
  await request(app).post('/api/usuarios').send({ nome: 'Hóspede Limpeza', email, senha });
  const login = await request(app).post('/api/usuarios/login').send({ email, senha });
  return login.body;
}

// F04: POST /api/quartos agora exige autenticação de equipe — usa um admin
// descartável só para criar o quarto de teste (limparDados cobre o e-mail).
async function criarQuarto() {
  contadorQuarto += 1;
  const tokenCriador = await criarAdminDireto(`quarto-setup${Date.now()}${contadorQuarto}${EMAIL_SUFFIX}`, 'senha123');
  const res = await request(app).post('/api/quartos').set(auth(tokenCriador)).send({
    numero: `${ROOM_PREFIX}${100 + contadorQuarto}`,
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

/** Cria quarto + reserva (cliente) + finaliza o checkout (admin), retornando ids e tokens. */
async function prepararCheckout() {
  const adminToken = await criarAdminDireto(`admin${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
  const cliente = await criarClienteELogar(`cliente${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
  const quartoId = await criarQuarto();

  const reserva = await request(app)
    .post('/api/reservas')
    .set(auth(cliente.token))
    .send({ quarto_id: quartoId, data_checkin: amanha(0), data_checkout: amanha(1) });
  expect(reserva.status).toBe(201);
  const reservaId = reserva.body.booking.id;

  const finalizacao = await request(app).put(`/api/reservas/${reservaId}/finalizar`).set(auth(adminToken));
  expect(finalizacao.status).toBe(200);

  return { adminToken, cliente, quartoId, reservaId };
}

// =========================================================================
// 1) Checkout gera limpeza pendente automaticamente
// =========================================================================
describe('Checkout → limpeza pendente automática', () => {
  test('ao finalizar uma reserva, o quarto passa a ter uma limpeza "pendente"', async () => {
    const { adminToken, quartoId, reservaId } = await prepararCheckout();

    const res = await request(app).get('/api/limpeza').query({ quarto_id: quartoId }).set(auth(adminToken));

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({
      quarto_id: quartoId,
      status: 'pendente',
      reserva_origem_id: reservaId,
    });
  });

  test('o status de limpeza aparece também na visão por quarto (GET /api/limpeza/quartos)', async () => {
    const { adminToken, quartoId } = await prepararCheckout();

    const res = await request(app).get('/api/limpeza/quartos').set(auth(adminToken));
    expect(res.status).toBe(200);
    const linha = res.body.find((r) => r.quarto_id === quartoId);
    expect(linha).toBeDefined();
    expect(linha.status_limpeza).toBe('pendente');
    // status de OCUPAÇÃO fica 'disponivel' (finalizarReserva já fazia isso) — independente da limpeza.
    expect(linha.status_ocupacao).toBe('disponivel');
  });

  test('quarto nunca finalizado aparece sem registro de limpeza (status_limpeza null)', async () => {
    const adminToken = await criarAdminDireto(`admin${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const quartoId = await criarQuarto();

    const res = await request(app).get('/api/limpeza/quartos').set(auth(adminToken));
    const linha = res.body.find((r) => r.quarto_id === quartoId);
    expect(linha.status_limpeza).toBeNull();
  });
});

// =========================================================================
// 2) Prevenção de limpezas duplicadas para o mesmo checkout
// =========================================================================
describe('Prevenção de duplicados', () => {
  test('finalizar a mesma reserva duas vezes não cria duas limpezas', async () => {
    const { adminToken, quartoId, reservaId } = await prepararCheckout();

    // segunda tentativa de finalizar a MESMA reserva: já está 'finalizada' -> 404
    const segunda = await request(app).put(`/api/reservas/${reservaId}/finalizar`).set(auth(adminToken));
    expect(segunda.status).toBe(404);

    const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM limpezas WHERE reserva_origem_id = $1', [reservaId]);
    expect(rows[0].n).toBe(1);

    const listagem = await request(app).get('/api/limpeza').query({ quarto_id: quartoId }).set(auth(adminToken));
    expect(listagem.body).toHaveLength(1);
  });

  test('a restrição também vale no banco: um segundo INSERT com o mesmo reserva_origem_id não duplica', async () => {
    const { quartoId, reservaId } = await prepararCheckout();

    await pool.query(
      `INSERT INTO limpezas (quarto_id, reserva_origem_id, status) VALUES ($1, $2, 'pendente') ON CONFLICT (reserva_origem_id) DO NOTHING`,
      [quartoId, reservaId],
    );

    const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM limpezas WHERE reserva_origem_id = $1', [reservaId]);
    expect(rows[0].n).toBe(1);
  });
});

// =========================================================================
// 3)/4)/5) Alteração de status, atribuição de funcionário, início/conclusão
// =========================================================================
describe('Atualização de limpeza: status, funcionário, observações, início/conclusão', () => {
  test('recepcionista muda status pendente → em_andamento → concluida, com datas automáticas', async () => {
    const { adminToken, reservaId } = await prepararCheckout();
    const { rows } = await pool.query('SELECT id FROM limpezas WHERE reserva_origem_id = $1', [reservaId]);
    const limpezaId = rows[0].id;

    const emAndamento = await request(app)
      .put(`/api/limpeza/${limpezaId}`)
      .set(auth(adminToken))
      .send({ status: 'em_andamento' });
    expect(emAndamento.status).toBe(200);
    expect(emAndamento.body.limpeza.status).toBe('em_andamento');
    expect(emAndamento.body.limpeza.data_inicio).not.toBeNull();
    expect(emAndamento.body.limpeza.data_conclusao).toBeNull();

    const concluida = await request(app)
      .put(`/api/limpeza/${limpezaId}`)
      .set(auth(adminToken))
      .send({ status: 'concluida' });
    expect(concluida.status).toBe(200);
    expect(concluida.body.limpeza.status).toBe('concluida');
    expect(concluida.body.limpeza.data_conclusao).not.toBeNull();
  });

  test('atribuição de funcionário: aceita admin/recepcionista válido e grava o nome', async () => {
    const { adminToken, reservaId } = await prepararCheckout();
    const staff = await criarRecepcionista(adminToken, `staff${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const { rows } = await pool.query('SELECT id FROM limpezas WHERE reserva_origem_id = $1', [reservaId]);
    const limpezaId = rows[0].id;

    const res = await request(app)
      .put(`/api/limpeza/${limpezaId}`)
      .set(auth(adminToken))
      .send({ funcionario_id: staff.user.id });

    expect(res.status).toBe(200);
    expect(res.body.limpeza.funcionario_id).toBe(staff.user.id);
  });

  test('atribuição rejeita funcionario_id de uma conta cliente', async () => {
    const { adminToken, cliente, reservaId } = await prepararCheckout();
    const { rows } = await pool.query('SELECT id FROM limpezas WHERE reserva_origem_id = $1', [reservaId]);
    const limpezaId = rows[0].id;

    const res = await request(app)
      .put(`/api/limpeza/${limpezaId}`)
      .set(auth(adminToken))
      .send({ funcionario_id: cliente.user.id });

    expect(res.status).toBe(400);
  });

  test('observações são gravadas e preservadas em atualizações seguintes', async () => {
    const { adminToken, reservaId } = await prepararCheckout();
    const { rows } = await pool.query('SELECT id FROM limpezas WHERE reserva_origem_id = $1', [reservaId]);
    const limpezaId = rows[0].id;

    await request(app).put(`/api/limpeza/${limpezaId}`).set(auth(adminToken)).send({ observacoes: 'Trocar roupa de cama' });
    const res = await request(app).put(`/api/limpeza/${limpezaId}`).set(auth(adminToken)).send({ status: 'em_andamento' });

    expect(res.body.limpeza.observacoes).toBe('Trocar roupa de cama');
  });

  test('GET /api/limpeza/funcionarios lista só admin/recepcionista (não lista cliente)', async () => {
    const { adminToken, cliente } = await prepararCheckout();
    const staff = await criarRecepcionista(adminToken, `staff2${Date.now()}${EMAIL_SUFFIX}`, 'senha123');

    const res = await request(app).get('/api/limpeza/funcionarios').set(auth(adminToken));

    expect(res.status).toBe(200);
    expect(res.body.find((f) => f.id === staff.user.id)).toBeDefined();
    expect(res.body.find((f) => f.id === cliente.user.id)).toBeUndefined();
  });
});

// =========================================================================
// 6) Bloqueio de acesso não autorizado
// =========================================================================
describe('Autorização das rotas de limpeza', () => {
  test('sem token → 401 em todas as rotas principais', async () => {
    const semToken = await Promise.all([
      request(app).get('/api/limpeza/quartos'),
      request(app).get('/api/limpeza/resumo'),
      request(app).get('/api/limpeza'),
      request(app).put('/api/limpeza/1').send({ status: 'concluida' }),
    ]);
    semToken.forEach((res) => expect(res.status).toBe(401));
  });

  test('cliente autenticado → 403 em todas as rotas principais', async () => {
    const cliente = await criarClienteELogar(`clienteauth${Date.now()}${EMAIL_SUFFIX}`, 'senha123');

    const comToken = await Promise.all([
      request(app).get('/api/limpeza/quartos').set(auth(cliente.token)),
      request(app).get('/api/limpeza/resumo').set(auth(cliente.token)),
      request(app).get('/api/limpeza').set(auth(cliente.token)),
      request(app).put('/api/limpeza/1').set(auth(cliente.token)).send({ status: 'concluida' }),
    ]);
    comToken.forEach((res) => expect(res.status).toBe(403));
  });
});

// =========================================================================
// 7) Disponibilidade operacional do quarto
// =========================================================================
describe('Disponibilidade operacional considera limpeza + ocupação', () => {
  test('quarto com limpeza pendente não pode ser reservado, mesmo desocupado', async () => {
    const { adminToken, cliente, quartoId } = await prepararCheckout();

    const novaReserva = await request(app)
      .post('/api/reservas')
      .set(auth(cliente.token))
      .send({ quarto_id: quartoId, data_checkin: amanha(2), data_checkout: amanha(3) });

    expect(novaReserva.status).toBe(400);
    expect(novaReserva.body.message).toMatch(/aguarda limpeza/i);
    void adminToken;
  });

  test('após concluir a limpeza, o quarto volta a aceitar nova reserva', async () => {
    const { adminToken, cliente, quartoId, reservaId } = await prepararCheckout();
    const { rows } = await pool.query('SELECT id FROM limpezas WHERE reserva_origem_id = $1', [reservaId]);
    const limpezaId = rows[0].id;

    await request(app).put(`/api/limpeza/${limpezaId}`).set(auth(adminToken)).send({ status: 'concluida' });

    const novaReserva = await request(app)
      .post('/api/reservas')
      .set(auth(cliente.token))
      .send({ quarto_id: quartoId, data_checkin: amanha(2), data_checkout: amanha(3) });

    expect(novaReserva.status).toBe(201);
  });

  test('quarto em limpeza "em_andamento" também bloqueia nova reserva', async () => {
    const { adminToken, cliente, quartoId, reservaId } = await prepararCheckout();
    const { rows } = await pool.query('SELECT id FROM limpezas WHERE reserva_origem_id = $1', [reservaId]);
    const limpezaId = rows[0].id;

    await request(app).put(`/api/limpeza/${limpezaId}`).set(auth(adminToken)).send({ status: 'em_andamento' });

    const novaReserva = await request(app)
      .post('/api/reservas')
      .set(auth(cliente.token))
      .send({ quarto_id: quartoId, data_checkin: amanha(2), data_checkout: amanha(3) });

    expect(novaReserva.status).toBe(400);
  });
});

// =========================================================================
// 8) Funcionamento geral dos endpoints
// =========================================================================
describe('Endpoints de limpeza — smoke tests', () => {
  test('GET /api/limpeza/resumo retorna os três contadores', async () => {
    const { adminToken } = await prepararCheckout();

    const res = await request(app).get('/api/limpeza/resumo').set(auth(adminToken));

    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        pendente: expect.any(Number),
        em_andamento: expect.any(Number),
        concluida: expect.any(Number),
      }),
    );
    expect(res.body.pendente).toBeGreaterThanOrEqual(1);
  });

  test('GET /api/limpeza/:id retorna o registro; id inexistente retorna 404', async () => {
    const { adminToken, reservaId } = await prepararCheckout();
    const { rows } = await pool.query('SELECT id FROM limpezas WHERE reserva_origem_id = $1', [reservaId]);

    const ok = await request(app).get(`/api/limpeza/${rows[0].id}`).set(auth(adminToken));
    expect(ok.status).toBe(200);

    const inexistente = await request(app).get('/api/limpeza/999999').set(auth(adminToken));
    expect(inexistente.status).toBe(404);
  });

  test('PUT /api/limpeza/:id com status inválido → 400', async () => {
    const { adminToken, reservaId } = await prepararCheckout();
    const { rows } = await pool.query('SELECT id FROM limpezas WHERE reserva_origem_id = $1', [reservaId]);

    const res = await request(app)
      .put(`/api/limpeza/${rows[0].id}`)
      .set(auth(adminToken))
      .send({ status: 'nao_existe' });

    expect(res.status).toBe(400);
  });
});
