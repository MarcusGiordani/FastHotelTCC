// fasthotel-api/tests/unit/consumptionController.test.js
//
// Testes unitários ISOLADOS da checagem de propriedade adicionada ao
// consumptionController para a correção F07 (vínculo com a reserva).
// Sem PostgreSQL real — pool.query mockado.

jest.mock('../../config/db', () => ({
  query: jest.fn(),
}));

const pool = require('../../config/db');
const {
  createConsumption,
  getConsumptionById,
  updateConsumption,
  deleteConsumption,
} = require('../../controllers/consumptionController');

const criarRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('createConsumption — correção F07', () => {
  let res;

  beforeEach(() => {
    jest.clearAllMocks();
    res = criarRes();
  });

  test('cliente registrando consumo em reserva de TERCEIRO → 403, serviço nunca é consultado', async () => {
    const req = {
      body: { reserva_id: 1, servico_id: 2, quantidade: 1 },
      user: { id: 5, tipo_usuario: 'cliente' },
    };
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1, usuario_id: 99 }] }); // reserva é de outro usuário

    await createConsumption(req, res);

    expect(pool.query).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('cliente registrando consumo na PRÓPRIA reserva → segue para o INSERT', async () => {
    const req = {
      body: { reserva_id: 1, servico_id: 2, quantidade: 1 },
      user: { id: 5, tipo_usuario: 'cliente' },
    };
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 1, usuario_id: 5 }] }) // reserva é do próprio cliente
      .mockResolvedValueOnce({ rows: [{ preco: 50 }] })
      .mockResolvedValueOnce({ rows: [{ id: 10, reserva_id: 1, servico_id: 2, quantidade: 1, preco_unitario: 50 }] });

    await createConsumption(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('admin registra consumo em qualquer reserva sem checar dono', async () => {
    const req = {
      body: { reserva_id: 1, servico_id: 2, quantidade: 1 },
      user: { id: 1, tipo_usuario: 'admin' },
    };
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 1, usuario_id: 999 }] })
      .mockResolvedValueOnce({ rows: [{ preco: 50 }] })
      .mockResolvedValueOnce({ rows: [{ id: 10 }] });

    await createConsumption(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
  });
});

describe('getConsumptionById / updateConsumption / deleteConsumption — correção F07', () => {
  let res;

  beforeEach(() => {
    jest.clearAllMocks();
    res = criarRes();
  });

  test('getConsumptionById: cliente lendo consumo de TERCEIRO → 403', async () => {
    const req = { params: { id: '10' }, user: { id: 5, tipo_usuario: 'cliente' } };
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 10, reserva_id: 1, reserva_usuario_id: 99 }],
    });

    await getConsumptionById(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('getConsumptionById: cliente lendo o PRÓPRIO consumo → 200, sem vazar reserva_usuario_id', async () => {
    const req = { params: { id: '10' }, user: { id: 5, tipo_usuario: 'cliente' } };
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 10, reserva_id: 1, reserva_usuario_id: 5 }],
    });

    await getConsumptionById(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ id: 10, reserva_id: 1 });
  });

  test('updateConsumption: cliente atualizando consumo de TERCEIRO → 403, UPDATE nunca roda', async () => {
    const req = { params: { id: '10' }, body: { quantidade: 5 }, user: { id: 5, tipo_usuario: 'cliente' } };
    pool.query.mockResolvedValueOnce({ rows: [{ usuario_id: 99 }] });

    await updateConsumption(req, res);

    expect(pool.query).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('deleteConsumption: cliente excluindo consumo de TERCEIRO → 403, DELETE nunca roda', async () => {
    const req = { params: { id: '10' }, user: { id: 5, tipo_usuario: 'cliente' } };
    pool.query.mockResolvedValueOnce({ rows: [{ usuario_id: 99 }] });

    await deleteConsumption(req, res);

    expect(pool.query).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('deleteConsumption: recepcionista exclui consumo de qualquer reserva → 200', async () => {
    const req = { params: { id: '10' }, user: { id: 2, tipo_usuario: 'recepcionista' } };
    pool.query
      .mockResolvedValueOnce({ rows: [{ usuario_id: 99 }] })
      .mockResolvedValueOnce({ rows: [{ id: 10 }] });

    await deleteConsumption(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });
});
