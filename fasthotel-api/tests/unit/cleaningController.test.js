// fasthotel-api/tests/unit/cleaningController.test.js
//
// Testes unitários ISOLADOS do controller de Controle de Limpeza.
// Sem PostgreSQL real — pool.query mockado.

jest.mock('../../config/db', () => ({
  query: jest.fn(),
}));

const pool = require('../../config/db');
const {
  getCleaningSummary,
  getAllCleanings,
  updateCleaning,
} = require('../../controllers/cleaningController');

const criarRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('getCleaningSummary', () => {
  let res;

  beforeEach(() => {
    jest.clearAllMocks();
    res = criarRes();
  });

  test('preenche com 0 os status que não vieram do banco', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ status: 'pendente', quantidade: 3 }] });

    await getCleaningSummary({}, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ pendente: 3, em_andamento: 0, concluida: 0 });
  });
});

describe('getAllCleanings — filtros', () => {
  let res;

  beforeEach(() => {
    jest.clearAllMocks();
    res = criarRes();
    pool.query.mockResolvedValue({ rows: [] });
  });

  test('status inválido → 400, banco não é consultado', async () => {
    const req = { query: { status: 'invalido' } };

    await getAllCleanings(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('filtra por status e quarto_id juntos', async () => {
    const req = { query: { status: 'pendente', quarto_id: '5' } };

    await getAllCleanings(req, res);

    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toMatch(/l\.status = \$\d+/);
    expect(sql).toMatch(/l\.quarto_id = \$\d+/);
    expect(params).toEqual(expect.arrayContaining(['pendente', '5']));
  });

  test('sem filtros → sem cláusula WHERE', async () => {
    const req = { query: {} };

    await getAllCleanings(req, res);

    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).not.toMatch(/WHERE/);
    expect(params).toEqual([]);
  });
});

describe('updateCleaning', () => {
  let res;

  beforeEach(() => {
    jest.clearAllMocks();
    res = criarRes();
  });

  test('status inválido → 400, banco não é consultado', async () => {
    const req = { params: { id: '1' }, body: { status: 'invalido' } };

    await updateCleaning(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('funcionario_id que não é admin/recepcionista → 400', async () => {
    const req = { params: { id: '1' }, body: { funcionario_id: 99 } };
    pool.query.mockResolvedValueOnce({ rows: [] }); // SELECT ... tipo_usuario IN (...) -> ninguém

    await updateCleaning(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('Funcionário inválido') }),
    );
  });

  test('registro de limpeza não encontrado → 404', async () => {
    const req = { params: { id: '999' }, body: { status: 'em_andamento' } };
    pool.query.mockResolvedValueOnce({ rows: [] }); // SELECT status, data_inicio... -> não encontrado

    await updateCleaning(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('transição para "em_andamento" marca data_inicio automaticamente (uma única vez)', async () => {
    const req = { params: { id: '1' }, body: { status: 'em_andamento' } };
    pool.query
      .mockResolvedValueOnce({ rows: [{ status: 'pendente', data_inicio: null, data_conclusao: null }] })
      .mockResolvedValueOnce({ rows: [{ id: 1, status: 'em_andamento' }] });

    await updateCleaning(req, res);

    const [, updateParams] = pool.query.mock.calls[1];
    const [statusParam, funcionarioParam, obsParam, marcarInicio, marcarConclusao] = updateParams;
    expect(statusParam).toBe('em_andamento');
    expect(marcarInicio).toBe(true);
    expect(marcarConclusao).toBe(false);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('transição para "concluida" marca data_conclusao automaticamente', async () => {
    const req = { params: { id: '1' }, body: { status: 'concluida' } };
    pool.query
      .mockResolvedValueOnce({ rows: [{ status: 'em_andamento', data_inicio: '2026-01-01', data_conclusao: null }] })
      .mockResolvedValueOnce({ rows: [{ id: 1, status: 'concluida' }] });

    await updateCleaning(req, res);

    const [, updateParams] = pool.query.mock.calls[1];
    const [, , , marcarInicio, marcarConclusao] = updateParams;
    expect(marcarInicio).toBe(false); // já tinha data_inicio -> não mexe de novo
    expect(marcarConclusao).toBe(true);
  });

  test('não sobrescreve data_inicio/data_conclusao já preenchidas em nova chamada com o mesmo status', async () => {
    const req = { params: { id: '1' }, body: { observacoes: 'quarto ok' } }; // sem mudar status
    pool.query
      .mockResolvedValueOnce({ rows: [{ status: 'concluida', data_inicio: '2026-01-01', data_conclusao: '2026-01-01' } ]})
      .mockResolvedValueOnce({ rows: [{ id: 1, status: 'concluida' }] });

    await updateCleaning(req, res);

    const [, updateParams] = pool.query.mock.calls[1];
    const [, , obsParam, marcarInicio, marcarConclusao] = updateParams;
    expect(obsParam).toBe('quarto ok');
    expect(marcarInicio).toBe(false);
    expect(marcarConclusao).toBe(false);
  });
});
