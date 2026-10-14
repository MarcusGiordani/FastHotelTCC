// fasthotel-api/tests/unit/paymentController.test.js
//
// Testes unitários ISOLADOS da correção F08 (getAllPayments / getPaymentById
// não filtravam por dono da reserva). Sem PostgreSQL real — pool.query mockado.
// Confere que, para papéis que não são admin/recepcionista, a query enviada ao
// banco inclui a condição "r.usuario_id = <id de quem chamou>"; para
// admin/recepcionista, nenhuma restrição extra é adicionada.

jest.mock('../../config/db', () => ({
  query: jest.fn(),
}));

const pool = require('../../config/db');
const { getAllPayments, getPaymentById } = require('../../controllers/paymentController');

const criarRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('getAllPayments — correção F08', () => {
  let res;

  beforeEach(() => {
    jest.clearAllMocks();
    res = criarRes();
    pool.query.mockResolvedValue({ rows: [] });
  });

  test('cliente (não admin/recepcionista): a query filtra por r.usuario_id = req.user.id', async () => {
    const req = { query: {}, user: { id: 42, tipo_usuario: 'cliente' } };

    await getAllPayments(req, res);

    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toMatch(/r\.usuario_id = \$\d+/);
    expect(params).toContain(42);
    expect(res.status).not.toHaveBeenCalledWith(500);
  });

  test('admin: a query NÃO adiciona filtro de usuario_id (vê pagamentos de todos)', async () => {
    const req = { query: {}, user: { id: 1, tipo_usuario: 'admin' } };

    await getAllPayments(req, res);

    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).not.toMatch(/r.usuario_id = \$/);
    expect(params).not.toContain(1);
  });

  test('recepcionista: a query NÃO adiciona filtro de usuario_id', async () => {
    const req = { query: {}, user: { id: 2, tipo_usuario: 'recepcionista' } };

    await getAllPayments(req, res);

    const [sql] = pool.query.mock.calls[0];
    expect(sql).not.toMatch(/r.usuario_id = \$/);
  });

  test('cliente + filtro reserva_id: os dois filtros (reserva_id e usuario_id) são aplicados juntos', async () => {
    const req = { query: { reserva_id: '7' }, user: { id: 42, tipo_usuario: 'cliente' } };

    await getAllPayments(req, res);

    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toMatch(/p\.reserva_id = \$\d+/);
    expect(sql).toMatch(/r\.usuario_id = \$\d+/);
    expect(params).toEqual(expect.arrayContaining(['7', 42]));
  });
});

describe('getPaymentById — correção F08', () => {
  let res;

  beforeEach(() => {
    jest.clearAllMocks();
    res = criarRes();
  });

  test('cliente: a query filtra pelo dono da reserva (p.id = $1 AND r.usuario_id = $2)', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 99 }] });
    const req = { params: { id: '99' }, user: { id: 42, tipo_usuario: 'cliente' } };

    await getPaymentById(req, res);

    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toMatch(/r\.usuario_id = \$2/);
    expect(params).toEqual(['99', 42]);
  });

  test('admin: a query busca só por p.id, sem restrição de dono', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 99 }] });
    const req = { params: { id: '99' }, user: { id: 1, tipo_usuario: 'admin' } };

    await getPaymentById(req, res);

    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).not.toMatch(/r.usuario_id = \$/);
    expect(params).toEqual(['99']);
  });

  test('pagamento de outro usuário: a query retorna vazio e o controller responde 404', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] }); // dono diferente -> WHERE não bate -> 0 linhas
    const req = { params: { id: '99' }, user: { id: 42, tipo_usuario: 'cliente' } };

    await getPaymentById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Pagamento não encontrado ou você não tem permissão para acessá-lo.',
    });
  });
});
