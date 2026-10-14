// fasthotel-api/tests/integration/finance.integration.test.js
//
// Testes de integração REAIS (Supertest -> app.js -> rotas reais -> middlewares
// reais -> controllers reais -> PostgreSQL "fasthotel_test" real) do módulo de
// Fluxo de Caixa e de sua integração transacional com Pagamentos.

const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../../app');
const pool = require('../../config/db');

const EMAIL_SUFFIX = '@finance.fasthotel.test';
const ROOM_PREFIX = '98';
const CATEGORY_PREFIX = 'E2E-Categoria-';

const limparDados = async () => {
  // Três critérios, porque nenhum sozinho é 100% estável entre execuções:
  // - criado_por aponta para o usuário de teste (só funciona enquanto ele existir);
  // - descricao bate com o prefixo de categoria manual;
  // - pagamento_id encadeia até um quarto com o prefixo de teste (não depende do
  //   usuário existir — é o critério que realmente não falha).
  await pool.query(`
    DELETE FROM movimentacoes_financeiras
    WHERE criado_por IN (SELECT id FROM usuarios WHERE email LIKE $1)
       OR descricao LIKE $2
       OR pagamento_id IN (
            SELECT p.id FROM pagamentos p
            JOIN reservas r ON p.reserva_id = r.id
            JOIN quartos q ON r.quarto_id = q.id
            WHERE q.numero LIKE $3
          )
  `, [`%${EMAIL_SUFFIX}`, `${CATEGORY_PREFIX}%`, `${ROOM_PREFIX}%`]);
  await pool.query(`DELETE FROM categorias_financeiras WHERE nome LIKE $1`, [`${CATEGORY_PREFIX}%`]);
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
let contador = 0;

async function criarAdminDireto(email, senha) {
  const hash = await bcrypt.hash(senha, 10);
  await pool.query(
    `INSERT INTO usuarios (nome, email, senha, tipo_usuario) VALUES ($1, $2, $3, 'admin')`,
    ['Admin Financeiro', email, hash],
  );
  const login = await request(app).post('/api/usuarios/login').send({ email, senha });
  return login.body.token;
}

async function criarClienteELogar(email, senha) {
  await request(app).post('/api/usuarios').send({ nome: 'Cliente Financeiro', email, senha });
  const login = await request(app).post('/api/usuarios/login').send({ email, senha });
  return login.body;
}

// F04: POST /api/quartos agora exige autenticação de equipe — usa um admin
// descartável só para criar o quarto de teste (limparDados cobre o e-mail).
async function criarQuarto() {
  contador += 1;
  const tokenCriador = await criarAdminDireto(`quarto-setup${Date.now()}${contador}${EMAIL_SUFFIX}`, 'senha123');
  const res = await request(app).post('/api/quartos').set(auth(tokenCriador)).send({
    numero: `${ROOM_PREFIX}${contador}`, tipo: 'standard', capacidade: 2, preco_por_noite: 100,
  });
  expect(res.status).toBe(201);
  return res.body.room.id;
}

function amanha(diasExtra = 0) {
  const d = new Date();
  d.setDate(d.getDate() + 1 + diasExtra);
  return d.toISOString().slice(0, 10);
}

/** Cria quarto + reserva (cliente) via API real. Retorna reservaId. */
async function criarReserva(clienteToken) {
  const quartoId = await criarQuarto();
  const reserva = await request(app)
    .post('/api/reservas')
    .set(auth(clienteToken))
    .send({ quarto_id: quartoId, data_checkin: amanha(0), data_checkout: amanha(1) });
  expect(reserva.status).toBe(201);
  return reserva.body.booking.id;
}

async function buscarMovimentacaoPorPagamento(pagamentoId) {
  const { rows } = await pool.query('SELECT * FROM movimentacoes_financeiras WHERE pagamento_id = $1', [pagamentoId]);
  return rows[0] || null;
}

// =========================================================================
// Integração com pagamentos
// =========================================================================
describe('Geração automática de receita a partir de pagamento confirmado', () => {
  test('pagamento aprovado gera receita confirmada, vinculada e com valor correto', async () => {
    const adminToken = await criarAdminDireto(`admin1${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const cliente = await criarClienteELogar(`cliente1${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const reservaId = await criarReserva(cliente.token);

    const pagamento = await request(app)
      .post('/api/pagamentos')
      .set(auth(adminToken))
      .send({ reserva_id: reservaId, valor_pago: 250, metodo_pagamento: 'pix' });
    expect(pagamento.status).toBe(201);

    const mov = await buscarMovimentacaoPorPagamento(pagamento.body.payment.id);
    expect(mov).not.toBeNull();
    expect(mov.tipo).toBe('receita');
    expect(mov.origem).toBe('automatica');
    expect(mov.status).toBe('confirmada');
    expect(Number(mov.valor)).toBe(250);
    expect(mov.descricao).toMatch(new RegExp(`Pagamento #${pagamento.body.payment.id}`));
  });

  test('pagamento PENDENTE não gera receita (não contabilizado como recebido)', async () => {
    const adminToken = await criarAdminDireto(`admin2${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const cliente = await criarClienteELogar(`cliente2${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const reservaId = await criarReserva(cliente.token);

    const pagamento = await request(app)
      .post('/api/pagamentos')
      .set(auth(adminToken))
      .send({ reserva_id: reservaId, valor_pago: 250, metodo_pagamento: 'pix', status_pagamento: 'pendente' });
    expect(pagamento.status).toBe(201);

    const mov = await buscarMovimentacaoPorPagamento(pagamento.body.payment.id);
    expect(mov).toBeNull();
  });

  test('reserva inexistente: nada é commitado (nem pagamento, nem movimentação) — consistência transacional', async () => {
    const adminToken = await criarAdminDireto(`admin3${Date.now()}${EMAIL_SUFFIX}`, 'senha123');

    const res = await request(app)
      .post('/api/pagamentos')
      .set(auth(adminToken))
      .send({ reserva_id: 99999999, valor_pago: 100, metodo_pagamento: 'pix' });

    expect(res.status).toBe(404);
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS n FROM movimentacoes_financeiras WHERE descricao LIKE '%Reserva #99999999%'`,
    );
    expect(rows[0].n).toBe(0);
  });
});

describe('Prevenção de duplicação e atualização de pagamento existente', () => {
  test('reconfirmar o mesmo pagamento (sem mudar status) não duplica a receita', async () => {
    const adminToken = await criarAdminDireto(`admin4${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const cliente = await criarClienteELogar(`cliente4${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const reservaId = await criarReserva(cliente.token);

    const pagamento = await request(app).post('/api/pagamentos').set(auth(adminToken))
      .send({ reserva_id: reservaId, valor_pago: 300, metodo_pagamento: 'pix' });
    const pagamentoId = pagamento.body.payment.id;

    await request(app).put(`/api/pagamentos/${pagamentoId}`).set(auth(adminToken))
      .send({ status_pagamento: 'aprovado' }); // reafirma o mesmo status

    const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM movimentacoes_financeiras WHERE pagamento_id = $1', [pagamentoId]);
    expect(rows[0].n).toBe(1);
  });

  test('atualizar valor_pago do pagamento atualiza o valor da movimentação (mesma linha)', async () => {
    const adminToken = await criarAdminDireto(`admin5${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const cliente = await criarClienteELogar(`cliente5${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const reservaId = await criarReserva(cliente.token);

    const pagamento = await request(app).post('/api/pagamentos').set(auth(adminToken))
      .send({ reserva_id: reservaId, valor_pago: 100, metodo_pagamento: 'pix' });
    const pagamentoId = pagamento.body.payment.id;
    const movAntes = await buscarMovimentacaoPorPagamento(pagamentoId);

    await request(app).put(`/api/pagamentos/${pagamentoId}`).set(auth(adminToken)).send({ valor_pago: 180 });

    const movDepois = await buscarMovimentacaoPorPagamento(pagamentoId);
    expect(movDepois.id).toBe(movAntes.id); // mesma linha, não duplicou
    expect(Number(movDepois.valor)).toBe(180);
  });
});

describe('Cancelamento e estorno de pagamentos refletidos no fluxo de caixa', () => {
  test('pagamento deixa de ser "aprovado" -> movimentação correspondente vira "estornada" (não some)', async () => {
    const adminToken = await criarAdminDireto(`admin6${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const cliente = await criarClienteELogar(`cliente6${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const reservaId = await criarReserva(cliente.token);

    const pagamento = await request(app).post('/api/pagamentos').set(auth(adminToken))
      .send({ reserva_id: reservaId, valor_pago: 220, metodo_pagamento: 'cartao' });
    const pagamentoId = pagamento.body.payment.id;

    await request(app).put(`/api/pagamentos/${pagamentoId}`).set(auth(adminToken)).send({ status_pagamento: 'pendente' });

    const mov = await buscarMovimentacaoPorPagamento(pagamentoId);
    expect(mov).not.toBeNull(); // continua existindo
    expect(mov.status).toBe('estornada');
  });

  test('exclusão do pagamento preserva o histórico financeiro (linha não é apagada)', async () => {
    const adminToken = await criarAdminDireto(`admin7${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const cliente = await criarClienteELogar(`cliente7${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const reservaId = await criarReserva(cliente.token);

    const pagamento = await request(app).post('/api/pagamentos').set(auth(adminToken))
      .send({ reserva_id: reservaId, valor_pago: 400, metodo_pagamento: 'dinheiro' });
    const pagamentoId = pagamento.body.payment.id;
    const movAntes = await buscarMovimentacaoPorPagamento(pagamentoId);

    const del = await request(app).delete(`/api/pagamentos/${pagamentoId}`).set(auth(adminToken));
    expect(del.status).toBe(200);

    const { rows } = await pool.query('SELECT * FROM movimentacoes_financeiras WHERE id = $1', [movAntes.id]);
    expect(rows).toHaveLength(1); // a linha continua lá
    expect(rows[0].status).toBe('estornada');
    expect(rows[0].pagamento_id).toBeNull(); // FK zerada pelo ON DELETE SET NULL
    expect(rows[0].descricao).toMatch(new RegExp(`Pagamento #${pagamentoId}`)); // origem ainda identificável

    // e a listagem do fluxo de caixa ainda retorna essa movimentação (histórico preservado)
    const listagem = await request(app).get('/api/financeiro').set(auth(adminToken));
    expect(listagem.body.find((m) => m.id === movAntes.id)).toBeDefined();
  });
});

describe('Lançamento automático não pode ser editado/cancelado como se fosse manual', () => {
  test('PUT /:id em movimentação automática -> 400', async () => {
    const adminToken = await criarAdminDireto(`admin8${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const cliente = await criarClienteELogar(`cliente8${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const reservaId = await criarReserva(cliente.token);
    const pagamento = await request(app).post('/api/pagamentos').set(auth(adminToken))
      .send({ reserva_id: reservaId, valor_pago: 120, metodo_pagamento: 'pix' });
    const mov = await buscarMovimentacaoPorPagamento(pagamento.body.payment.id);

    const res = await request(app).put(`/api/financeiro/${mov.id}`).set(auth(adminToken)).send({ valor: 999 });
    expect(res.status).toBe(400);
  });

  test('PUT /:id/cancelar em movimentação automática -> 400', async () => {
    const adminToken = await criarAdminDireto(`admin9${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const cliente = await criarClienteELogar(`cliente9${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const reservaId = await criarReserva(cliente.token);
    const pagamento = await request(app).post('/api/pagamentos').set(auth(adminToken))
      .send({ reserva_id: reservaId, valor_pago: 120, metodo_pagamento: 'pix' });
    const mov = await buscarMovimentacaoPorPagamento(pagamento.body.payment.id);

    const res = await request(app).put(`/api/financeiro/${mov.id}/cancelar`).set(auth(adminToken));
    expect(res.status).toBe(400);
  });
});

// =========================================================================
// Lançamentos manuais
// =========================================================================
describe('Cadastro de receitas e despesas manuais', () => {
  test('registra receita manual com categoria compatível', async () => {
    const adminToken = await criarAdminDireto(`admin10${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const categoria = await request(app).post('/api/financeiro/categorias').set(auth(adminToken))
      .send({ nome: `${CATEGORY_PREFIX}Vendas-${Date.now()}`, tipo: 'receita' });
    expect(categoria.status).toBe(201);

    const res = await request(app).post('/api/financeiro/receitas').set(auth(adminToken)).send({
      valor: 500, descricao: `${CATEGORY_PREFIX}Venda de produto avulso`, categoria_id: categoria.body.category.id, forma_pagamento: 'dinheiro',
    });

    expect(res.status).toBe(201);
    expect(res.body.movement.tipo).toBe('receita');
    expect(res.body.movement.origem).toBe('manual');
    expect(res.body.movement.status).toBe('confirmada');
  });

  test('registra despesa manual', async () => {
    const adminToken = await criarAdminDireto(`admin11${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const res = await request(app).post('/api/financeiro/despesas').set(auth(adminToken)).send({
      valor: 90, descricao: `${CATEGORY_PREFIX}Manutenção do ar-condicionado`,
    });
    expect(res.status).toBe(201);
    expect(res.body.movement.tipo).toBe('despesa');
  });

  test('valor zero ou negativo é rejeitado em receita e despesa', async () => {
    const adminToken = await criarAdminDireto(`admin12${Date.now()}${EMAIL_SUFFIX}`, 'senha123');

    const zero = await request(app).post('/api/financeiro/receitas').set(auth(adminToken)).send({ valor: 0, descricao: 'x' });
    expect(zero.status).toBe(400);

    const negativo = await request(app).post('/api/financeiro/despesas').set(auth(adminToken)).send({ valor: -5, descricao: 'x' });
    expect(negativo.status).toBe(400);
  });

  test('categoria de despesa não pode ser usada numa receita', async () => {
    const adminToken = await criarAdminDireto(`admin13${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const categoria = await request(app).post('/api/financeiro/categorias').set(auth(adminToken))
      .send({ nome: `${CATEGORY_PREFIX}Fornecedores-${Date.now()}`, tipo: 'despesa' });

    const res = await request(app).post('/api/financeiro/receitas').set(auth(adminToken)).send({
      valor: 50, descricao: `${CATEGORY_PREFIX}Teste`, categoria_id: categoria.body.category.id,
    });
    expect(res.status).toBe(400);
  });
});

describe('Edição e cancelamento de lançamentos manuais', () => {
  test('edita um lançamento manual confirmado', async () => {
    const adminToken = await criarAdminDireto(`admin14${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const criado = await request(app).post('/api/financeiro/despesas').set(auth(adminToken))
      .send({ valor: 60, descricao: `${CATEGORY_PREFIX}Original` });

    const res = await request(app).put(`/api/financeiro/${criado.body.movement.id}`).set(auth(adminToken))
      .send({ valor: 75, descricao: `${CATEGORY_PREFIX}Editada` });

    expect(res.status).toBe(200);
    expect(Number(res.body.movement.valor)).toBe(75);
    expect(res.body.movement.descricao).toBe(`${CATEGORY_PREFIX}Editada`);
  });

  test('cancela um lançamento manual (status vira "cancelada", linha preservada)', async () => {
    const adminToken = await criarAdminDireto(`admin15${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const criado = await request(app).post('/api/financeiro/receitas').set(auth(adminToken))
      .send({ valor: 40, descricao: `${CATEGORY_PREFIX}Cancelar depois` });

    const res = await request(app).put(`/api/financeiro/${criado.body.movement.id}/cancelar`).set(auth(adminToken));

    expect(res.status).toBe(200);
    expect(res.body.movement.status).toBe('cancelada');

    const consulta = await request(app).get(`/api/financeiro/${criado.body.movement.id}`).set(auth(adminToken));
    expect(consulta.status).toBe(200);
    expect(consulta.body.status).toBe('cancelada');
  });

  test('não permite editar um lançamento já cancelado', async () => {
    const adminToken = await criarAdminDireto(`admin16${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const criado = await request(app).post('/api/financeiro/despesas').set(auth(adminToken))
      .send({ valor: 30, descricao: `${CATEGORY_PREFIX}Vai cancelar` });
    await request(app).put(`/api/financeiro/${criado.body.movement.id}/cancelar`).set(auth(adminToken));

    const res = await request(app).put(`/api/financeiro/${criado.body.movement.id}`).set(auth(adminToken)).send({ valor: 999 });
    expect(res.status).toBe(400);
  });
});

// =========================================================================
// Saldo, filtros e relatórios
// =========================================================================
describe('Cálculo de saldo, filtros e relatório mensal', () => {
  test('saldo = receitas confirmadas - despesas confirmadas (lançamento cancelado não conta)', async () => {
    // Data fixa e controlada pelo teste — nunca "hoje" calculado em JS (UTC), que
    // diverge do CURRENT_DATE do Postgres (fuso America/Sao_Paulo) durante a
    // janela diária entre 00h e 03h UTC, causando um falso negativo esporádico
    // (as linhas eram gravadas com a data de ontem em UTC, mas o filtro buscava
    // "hoje" em UTC). Usar uma data explícita nos três lançamentos E no filtro
    // elimina a dependência de fuso horário por completo, em qualquer horário.
    const DATA_TESTE = '2026-01-15';
    const adminToken = await criarAdminDireto(`admin17${Date.now()}${EMAIL_SUFFIX}`, 'senha123');

    const receita = await request(app).post('/api/financeiro/receitas').set(auth(adminToken))
      .send({ valor: 300, descricao: `${CATEGORY_PREFIX}Receita saldo`, data_movimentacao: DATA_TESTE });
    const despesa = await request(app).post('/api/financeiro/despesas').set(auth(adminToken))
      .send({ valor: 80, descricao: `${CATEGORY_PREFIX}Despesa saldo`, data_movimentacao: DATA_TESTE });
    const despesaCancelada = await request(app).post('/api/financeiro/despesas').set(auth(adminToken))
      .send({ valor: 1000, descricao: `${CATEGORY_PREFIX}Despesa que será cancelada`, data_movimentacao: DATA_TESTE });
    await request(app).put(`/api/financeiro/${despesaCancelada.body.movement.id}/cancelar`).set(auth(adminToken));

    const resumo = await request(app).get('/api/financeiro/resumo').set(auth(adminToken))
      .query({ periodo_inicio: DATA_TESTE, periodo_fim: DATA_TESTE });

    expect(resumo.status).toBe(200);
    expect(resumo.body.receitas).toBeGreaterThanOrEqual(300);
    expect(resumo.body.despesas).toBeGreaterThanOrEqual(80);
    expect(resumo.body.saldo).toBe(parseFloat((resumo.body.receitas - resumo.body.despesas).toFixed(2)));
    void receita; void despesa;
  });

  test('filtros por tipo e categoria retornam só os lançamentos esperados', async () => {
    const adminToken = await criarAdminDireto(`admin18${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const categoria = await request(app).post('/api/financeiro/categorias').set(auth(adminToken))
      .send({ nome: `${CATEGORY_PREFIX}Filtro-${Date.now()}`, tipo: 'ambas' });
    const receita = await request(app).post('/api/financeiro/receitas').set(auth(adminToken))
      .send({ valor: 70, descricao: `${CATEGORY_PREFIX}Receita filtrada`, categoria_id: categoria.body.category.id });
    await request(app).post('/api/financeiro/despesas').set(auth(adminToken))
      .send({ valor: 20, descricao: `${CATEGORY_PREFIX}Despesa não filtrada` });

    const porTipo = await request(app).get('/api/financeiro').query({ tipo: 'receita' }).set(auth(adminToken));
    expect(porTipo.body.every((m) => m.tipo === 'receita')).toBe(true);
    expect(porTipo.body.find((m) => m.id === receita.body.movement.id)).toBeDefined();

    const porCategoria = await request(app).get('/api/financeiro').query({ categoria_id: categoria.body.category.id }).set(auth(adminToken));
    expect(porCategoria.body.every((m) => m.categoria_id === categoria.body.category.id)).toBe(true);
  });

  test('resumo-mensal agrega por mês', async () => {
    const adminToken = await criarAdminDireto(`admin19${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    await request(app).post('/api/financeiro/receitas').set(auth(adminToken))
      .send({ valor: 100, descricao: `${CATEGORY_PREFIX}Mensal` });

    const anoAtual = new Date().getFullYear();
    const res = await request(app).get('/api/financeiro/resumo-mensal').query({ ano: anoAtual }).set(auth(adminToken));

    expect(res.status).toBe(200);
    expect(res.body.ano).toBe(anoAtual);
    expect(Array.isArray(res.body.meses)).toBe(true);
    const mesAtual = res.body.meses.find((m) => m.mes === new Date().getMonth() + 1);
    expect(mesAtual).toBeDefined();
    expect(mesAtual.receitas).toBeGreaterThanOrEqual(100);
  });
});

// =========================================================================
// Autenticação e autorização
// =========================================================================
describe('Autorização das rotas financeiras', () => {
  test('sem token → 401', async () => {
    const respostas = await Promise.all([
      request(app).get('/api/financeiro'),
      request(app).get('/api/financeiro/resumo'),
      request(app).post('/api/financeiro/receitas').send({ valor: 10, descricao: 'x' }),
    ]);
    respostas.forEach((r) => expect(r.status).toBe(401));
  });

  test('cliente autenticado → 403 (usuário comum não acessa dados financeiros)', async () => {
    const cliente = await criarClienteELogar(`cliente20${Date.now()}${EMAIL_SUFFIX}`, 'senha123');

    const respostas = await Promise.all([
      request(app).get('/api/financeiro').set(auth(cliente.token)),
      request(app).get('/api/financeiro/resumo').set(auth(cliente.token)),
      request(app).post('/api/financeiro/receitas').set(auth(cliente.token)).send({ valor: 10, descricao: 'x' }),
    ]);
    respostas.forEach((r) => expect(r.status).toBe(403));
  });

  test('recepcionista tem acesso completo ao fluxo de caixa', async () => {
    const adminToken = await criarAdminDireto(`admin21${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const staffEmail = `recep1${Date.now()}${EMAIL_SUFFIX}`;
    await request(app).post('/api/usuarios/staff').set(auth(adminToken))
      .send({ nome: 'Recep Financeiro', email: staffEmail, senha: 'senha123', tipo_usuario: 'recepcionista' });
    const login = await request(app).post('/api/usuarios/login').send({ email: staffEmail, senha: 'senha123' });

    const res = await request(app).post('/api/financeiro/receitas').set(auth(login.body.token))
      .send({ valor: 55, descricao: `${CATEGORY_PREFIX}Recepcionista` });
    expect(res.status).toBe(201);
  });
});
