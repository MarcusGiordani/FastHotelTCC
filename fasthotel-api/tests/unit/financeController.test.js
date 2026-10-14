// fasthotel-api/tests/unit/financeController.test.js
//
// Testes unitários ISOLADOS do controller de Fluxo de Caixa.
// Sem PostgreSQL real — pool.query mockado (e um "client" fake para as funções
// usadas dentro da transação do paymentController).

jest.mock('../../config/db', () => ({
  query: jest.fn(),
}));

const pool = require('../../config/db');
const {
  createRevenue,
  createExpense,
  updateMovement,
  cancelMovement,
  getAllMovements,
  getFinanceSummary,
  sincronizarReceitaDoPagamento,
  estornarReceitaDoPagamento,
} = require('../../controllers/financeController');

const criarRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('createRevenue / createExpense (lançamentos manuais)', () => {
  let res;
  beforeEach(() => {
    jest.clearAllMocks();
    res = criarRes();
  });

  test('valor ausente → 400, banco não é consultado', async () => {
    const req = { body: { descricao: 'x' }, user: { id: 1 } };
    await createRevenue(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('valor zero ou negativo → 400', async () => {
    const req1 = { body: { valor: 0, descricao: 'x' }, user: { id: 1 } };
    await createExpense(req1, res);
    expect(res.status).toHaveBeenCalledWith(400);

    jest.clearAllMocks();
    const req2 = { body: { valor: -10, descricao: 'x' }, user: { id: 1 } };
    await createExpense(req2, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('descrição ausente → 400', async () => {
    const req = { body: { valor: 50 }, user: { id: 1 } };
    await createRevenue(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('categoria_id inexistente → 400', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] }); // validarCategoria: não encontrada
    const req = { body: { valor: 50, descricao: 'x', categoria_id: 999 }, user: { id: 1 } };
    await createRevenue(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('categoria incompatível com o tipo → 400', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ tipo: 'despesa' }] });
    const req = { body: { valor: 50, descricao: 'x', categoria_id: 3 }, user: { id: 1 } };
    await createRevenue(req, res); // tentando usar categoria de despesa numa receita
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('receita manual válida: tipo/origem/status corretos, sem pagamento_id', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 1, tipo: 'receita', origem: 'manual', status: 'confirmada', valor: '150.00' }],
    });
    const req = { body: { valor: 150, descricao: 'Venda balcão', forma_pagamento: 'dinheiro' }, user: { id: 7 } };

    await createRevenue(req, res);

    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toMatch(/'manual', 'confirmada'/);
    expect(sql).not.toMatch(/pagamento_id/);
    expect(params[0]).toBe('receita');
    expect(params).toContain(150);
    expect(params).toContain(7);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('despesa manual válida: tipo = despesa', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 2, tipo: 'despesa' }] });
    const req = { body: { valor: 80, descricao: 'Material de limpeza' }, user: { id: 7 } };

    await createExpense(req, res);

    const [, params] = pool.query.mock.calls[0];
    expect(params[0]).toBe('despesa');
  });
});

describe('updateMovement', () => {
  let res;
  beforeEach(() => {
    jest.clearAllMocks();
    res = criarRes();
  });

  test('lançamento não encontrado → 404', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    await updateMovement({ params: { id: '1' }, body: { valor: 10 } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('origem automática → 400, não executa UPDATE', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ origem: 'automatica', status: 'confirmada', tipo: 'receita' }] });
    await updateMovement({ params: { id: '1' }, body: { valor: 10 } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(pool.query).toHaveBeenCalledTimes(1); // só o SELECT, nenhum UPDATE
  });

  test('status diferente de confirmada → 400', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ origem: 'manual', status: 'cancelada', tipo: 'despesa' }] });
    await updateMovement({ params: { id: '1' }, body: { valor: 10 } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('edição válida de lançamento manual confirmado → 200', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ origem: 'manual', status: 'confirmada', tipo: 'despesa' }] })
      .mockResolvedValueOnce({ rows: [{ id: 1, valor: '99.00' }] });

    await updateMovement({ params: { id: '1' }, body: { valor: 99 } }, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('cancelMovement', () => {
  let res;
  beforeEach(() => {
    jest.clearAllMocks();
    res = criarRes();
  });

  test('não encontrado → 404', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    await cancelMovement({ params: { id: '1' } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('origem automática → 400', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ origem: 'automatica', status: 'confirmada' }] });
    await cancelMovement({ params: { id: '1' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('já cancelada/estornada → 400', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ origem: 'manual', status: 'cancelada' }] });
    await cancelMovement({ params: { id: '1' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('cancelamento válido → status vira "cancelada"', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ origem: 'manual', status: 'confirmada' }] })
      .mockResolvedValueOnce({ rows: [{ id: 1, status: 'cancelada' }] });

    await cancelMovement({ params: { id: '1' } }, res);

    const [sql] = pool.query.mock.calls[1];
    expect(sql).toMatch(/status = 'cancelada'/);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('getAllMovements — filtros', () => {
  let res;
  beforeEach(() => {
    jest.clearAllMocks();
    res = criarRes();
    pool.query.mockResolvedValue({ rows: [] });
  });

  test('tipo inválido → 400', async () => {
    await getAllMovements({ query: { tipo: 'invalido' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('aplica tipo, categoria, status e período juntos', async () => {
    await getAllMovements(
      { query: { tipo: 'despesa', categoria_id: '2', status: 'confirmada', periodo_inicio: '2026-01-01', periodo_fim: '2026-01-31' } },
      res,
    );
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toMatch(/m\.tipo = \$\d+/);
    expect(sql).toMatch(/m\.categoria_id = \$\d+/);
    expect(sql).toMatch(/m\.status = \$\d+/);
    expect(sql).toMatch(/m\.data_movimentacao >= \$\d+/);
    expect(sql).toMatch(/m\.data_movimentacao <= \$\d+/);
    expect(params).toEqual(['despesa', '2', 'confirmada', '2026-01-01', '2026-01-31']);
  });
});

describe('getFinanceSummary', () => {
  test('calcula saldo = receitas - despesas, considerando só confirmadas', async () => {
    jest.clearAllMocks();
    const res = criarRes();
    pool.query.mockResolvedValueOnce({ rows: [{ receitas: '500.00', despesas: '120.00' }] });

    await getFinanceSummary({ query: {} }, res);

    const [sql] = pool.query.mock.calls[0];
    expect(sql).toMatch(/status = 'confirmada'/);
    expect(res.json).toHaveBeenCalledWith({ receitas: 500, despesas: 120, saldo: 380 });
  });
});

describe('sincronizarReceitaDoPagamento / estornarReceitaDoPagamento (integração com pagamentos)', () => {
  const criarClienteFake = () => ({ query: jest.fn() });

  test('sincronizar: INSERT ... ON CONFLICT(pagamento_id) DO UPDATE, com descrição rastreável', async () => {
    const client = criarClienteFake();

    await sincronizarReceitaDoPagamento(client, {
      pagamentoId: 42,
      reservaId: 17,
      valorPago: 350.5,
      metodoPagamento: 'pix',
      criadoPor: 9,
    });

    const [sql, params] = client.query.mock.calls[0];
    expect(sql).toMatch(/ON CONFLICT \(pagamento_id\) DO UPDATE/);
    expect(sql).toMatch(/'automatica'/);
    expect(sql).toMatch(/'confirmada'/);
    expect(params).toEqual([350.5, 'Pagamento #42 - Reserva #17 (pix)', 'pix', 42, 9]);
  });

  test('estornar: UPDATE status apenas da movimentação confirmada daquele pagamento', async () => {
    const client = criarClienteFake();

    await estornarReceitaDoPagamento(client, 42);

    const [sql, params] = client.query.mock.calls[0];
    expect(sql).toMatch(/status = 'estornada'/);
    expect(sql).toMatch(/WHERE pagamento_id = \$1 AND status = 'confirmada'/);
    expect(params).toEqual([42]);
  });
});
