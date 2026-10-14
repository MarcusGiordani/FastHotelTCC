// fasthotel-api/tests/unit/inventoryController.test.js
//
// Testes unitários ISOLADOS do controller de Controle de Estoque.
// Sem PostgreSQL real — pool.query/pool.connect mockados.

jest.mock('../../config/db', () => ({
  query: jest.fn(),
  connect: jest.fn(),
}));

const pool = require('../../config/db');
const {
  getAllProducts,
  createProduct,
  updateProduct,
  registrarEntrada,
  registrarSaida,
  getAllMovements,
  getStockSummary,
} = require('../../controllers/inventoryController');

const criarRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// Cliente de transação fake (pool.connect() -> client com BEGIN/COMMIT/ROLLBACK/query/release)
const criarClienteFake = () => ({
  query: jest.fn(),
  release: jest.fn(),
});

describe('createProduct', () => {
  let res;
  beforeEach(() => {
    jest.clearAllMocks();
    res = criarRes();
  });

  test('nome ausente → 400, banco não é consultado', async () => {
    const req = { body: { unidade_medida: 'un' } };
    await createProduct(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('unidade_medida ausente → 400', async () => {
    const req = { body: { nome: 'Sabonete' } };
    await createProduct(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('estoque_minimo negativo → 400', async () => {
    const req = { body: { nome: 'Sabonete', unidade_medida: 'un', estoque_minimo: -5 } };
    await createProduct(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('cadastro válido: INSERT não inclui quantidade_atual nem a lê do corpo', async () => {
    const req = { body: { nome: 'Sabonete', unidade_medida: 'un', estoque_minimo: 10, quantidade_atual: 999 } };
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1, nome: 'Sabonete', quantidade_atual: 0 }] });

    await createProduct(req, res);

    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).not.toMatch(/quantidade_atual/);
    expect(params).toEqual(['Sabonete', null, null, 'un', 10]);
    expect(res.status).toHaveBeenCalledWith(201);
  });
});

describe('updateProduct', () => {
  let res;
  beforeEach(() => {
    jest.clearAllMocks();
    res = criarRes();
  });

  test('não permite alterar quantidade_atual nem ativo pelo corpo (campos ignorados)', async () => {
    const req = {
      params: { id: '1' },
      body: { nome: 'Novo nome', quantidade_atual: 500, ativo: false },
    };
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1, nome: 'Novo nome' }] });

    await updateProduct(req, res);

    const [sql] = pool.query.mock.calls[0];
    expect(sql).not.toMatch(/quantidade_atual\s*=/);
    expect(sql).not.toMatch(/\bativo\s*=/);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('estoque_minimo inválido → 400', async () => {
    const req = { params: { id: '1' }, body: { estoque_minimo: -1 } };
    await updateProduct(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('produto não encontrado → 404', async () => {
    const req = { params: { id: '999' }, body: { nome: 'X' } };
    pool.query.mockResolvedValueOnce({ rows: [] });
    await updateProduct(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe('registrarEntrada / registrarSaida', () => {
  let res;
  let client;

  beforeEach(() => {
    jest.clearAllMocks();
    res = criarRes();
    client = criarClienteFake();
    pool.connect.mockResolvedValue(client);
  });

  test('quantidade zero → 400, transação nem é aberta', async () => {
    const req = { params: { id: '1' }, body: { quantidade: 0 }, user: { id: 7 } };
    await registrarEntrada(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(pool.connect).not.toHaveBeenCalled();
  });

  test('quantidade negativa → 400', async () => {
    const req = { params: { id: '1' }, body: { quantidade: -3 }, user: { id: 7 } };
    await registrarSaida(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('produto não encontrado → 404, ROLLBACK chamado', async () => {
    client.query.mockImplementation((sql) => {
      if (sql.includes('BEGIN')) return Promise.resolve();
      if (sql.includes('FOR UPDATE')) return Promise.resolve({ rows: [] });
      if (sql.includes('ROLLBACK')) return Promise.resolve();
      return Promise.resolve({ rows: [] });
    });
    const req = { params: { id: '999' }, body: { quantidade: 5 }, user: { id: 7 } };

    await registrarEntrada(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.release).toHaveBeenCalled();
  });

  test('produto desativado → 400, não grava movimentação', async () => {
    client.query.mockImplementation((sql) => {
      if (sql.includes('FOR UPDATE')) return Promise.resolve({ rows: [{ quantidade_atual: '10.000', ativo: false }] });
      return Promise.resolve({ rows: [] });
    });
    const req = { params: { id: '1' }, body: { quantidade: 5 }, user: { id: 7 } };

    await registrarEntrada(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('desativado') }));
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
  });

  test('saída maior que o disponível → 400 "Estoque insuficiente", sem UPDATE', async () => {
    client.query.mockImplementation((sql) => {
      if (sql.includes('FOR UPDATE')) return Promise.resolve({ rows: [{ quantidade_atual: '3.000', ativo: true }] });
      return Promise.resolve({ rows: [] });
    });
    const req = { params: { id: '1' }, body: { quantidade: 10 }, user: { id: 7 } };

    await registrarSaida(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('Estoque insuficiente') }));
    const updateCall = client.query.mock.calls.find(([sql]) => sql.includes('UPDATE produtos'));
    expect(updateCall).toBeUndefined();
  });

  test('entrada válida: soma a quantidade, grava movimentação com funcionario_id do token, COMMIT', async () => {
    client.query.mockImplementation((sql) => {
      if (sql.includes('FOR UPDATE')) return Promise.resolve({ rows: [{ quantidade_atual: '10.000', ativo: true }] });
      if (sql.includes('UPDATE produtos')) return Promise.resolve({ rows: [{ id: 1, quantidade_atual: '15.000' }] });
      if (sql.includes('INSERT INTO movimentacoes_estoque')) return Promise.resolve({ rows: [{ id: 50, tipo: 'entrada' }] });
      return Promise.resolve({ rows: [] });
    });
    const req = { params: { id: '1' }, body: { quantidade: 5, motivo: 'reposição' }, user: { id: 7 } };

    await registrarEntrada(req, res);

    const updateCall = client.query.mock.calls.find(([sql]) => sql.includes('UPDATE produtos'));
    expect(updateCall[0]).toMatch(/quantidade_atual \+ \$1/);
    expect(updateCall[1]).toEqual([5, '1']);

    const insertCall = client.query.mock.calls.find(([sql]) => sql.includes('INSERT INTO movimentacoes_estoque'));
    expect(insertCall[1]).toEqual(['1', 'entrada', 5, 'reposição', 7]);

    expect(client.query).toHaveBeenCalledWith('COMMIT');
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('saída válida: subtrai a quantidade', async () => {
    client.query.mockImplementation((sql) => {
      if (sql.includes('FOR UPDATE')) return Promise.resolve({ rows: [{ quantidade_atual: '10.000', ativo: true }] });
      if (sql.includes('UPDATE produtos')) return Promise.resolve({ rows: [{ id: 1, quantidade_atual: '6.000' }] });
      if (sql.includes('INSERT INTO movimentacoes_estoque')) return Promise.resolve({ rows: [{ id: 51, tipo: 'saida' }] });
      return Promise.resolve({ rows: [] });
    });
    const req = { params: { id: '1' }, body: { quantidade: 4 }, user: { id: 7 } };

    await registrarSaida(req, res);

    const updateCall = client.query.mock.calls.find(([sql]) => sql.includes('UPDATE produtos'));
    expect(updateCall[0]).toMatch(/quantidade_atual - \$1/);
    expect(res.status).toHaveBeenCalledWith(201);
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
    const req = { query: { tipo: 'invalido' } };
    await getAllMovements(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('filtra por produto_id e tipo', async () => {
    const req = { query: { produto_id: '3', tipo: 'saida' } };
    await getAllMovements(req, res);
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toMatch(/m\.produto_id = \$\d+/);
    expect(sql).toMatch(/m\.tipo = \$\d+/);
    expect(params).toEqual(expect.arrayContaining(['3', 'saida']));
  });
});

describe('getAllProducts — pesquisa e filtros', () => {
  let res;
  beforeEach(() => {
    jest.clearAllMocks();
    res = criarRes();
    pool.query.mockResolvedValue({ rows: [] });
  });

  test('por padrão só lista produtos ativos', async () => {
    await getAllProducts({ query: {} }, res);
    const [sql] = pool.query.mock.calls[0];
    expect(sql).toMatch(/ativo = TRUE/);
  });

  test('situacao=inativo lista só os desativados', async () => {
    await getAllProducts({ query: { situacao: 'inativo' } }, res);
    const [sql] = pool.query.mock.calls[0];
    expect(sql).toMatch(/ativo = FALSE/);
  });

  test('situacao=sem_estoque filtra quantidade_atual = 0', async () => {
    await getAllProducts({ query: { situacao: 'sem_estoque' } }, res);
    const [sql] = pool.query.mock.calls[0];
    expect(sql).toMatch(/quantidade_atual = 0/);
  });

  test('situacao=baixo filtra quantidade_atual <= estoque_minimo (e > 0)', async () => {
    await getAllProducts({ query: { situacao: 'baixo' } }, res);
    const [sql] = pool.query.mock.calls[0];
    expect(sql).toMatch(/quantidade_atual <= estoque_minimo/);
  });

  test('pesquisa por nome usa ILIKE parametrizado', async () => {
    await getAllProducts({ query: { nome: 'sabonete' } }, res);
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toMatch(/nome ILIKE \$\d+/);
    expect(params).toContain('%sabonete%');
  });
});

describe('getStockSummary', () => {
  test('retorna total, sem_estoque e estoque_baixo', async () => {
    jest.clearAllMocks();
    const res = criarRes();
    pool.query.mockResolvedValueOnce({ rows: [{ total: 12, sem_estoque: 2, estoque_baixo: 3 }] });

    await getStockSummary({}, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ total: 12, sem_estoque: 2, estoque_baixo: 3 });
  });
});
