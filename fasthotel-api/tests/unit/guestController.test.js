// fasthotel-api/tests/unit/guestController.test.js
//
// Testes unitários ISOLADOS da checagem de propriedade adicionada ao
// guestController para a correção F05 (getGuestById / updateGuest).
// Sem PostgreSQL real — pool.query mockado.

jest.mock('../../config/db', () => ({
  query: jest.fn(),
}));

// createGuest usa validationResult(req) — no app real, express-validator só valida
// nome/email/senha de USUÁRIO (userRoutes), não de hóspede; aqui mockamos para
// sempre "sem erros", já que guestRoutes não registra nenhum validador.
jest.mock('express-validator', () => ({
  validationResult: jest.fn(() => ({ isEmpty: () => true, array: () => [] })),
}));

const pool = require('../../config/db');
const { getGuestById, updateGuest, createGuest } = require('../../controllers/guestController');

const criarRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('getGuestById — correção F05', () => {
  let res;

  beforeEach(() => {
    jest.clearAllMocks();
    res = criarRes();
  });

  test('admin: acessa qualquer hóspede sem consultar vínculo de reserva', async () => {
    const req = { params: { id: '10' }, user: { id: 1, tipo_usuario: 'admin' } };
    pool.query.mockResolvedValueOnce({ rows: [{ id: 10, nome: 'Hóspede' }] });

    await getGuestById(req, res);

    expect(pool.query).toHaveBeenCalledTimes(1); // só o SELECT do hóspede, sem checagem de vínculo
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('cliente com reserva vinculada ao hóspede → 200', async () => {
    const req = { params: { id: '10' }, user: { id: 5, tipo_usuario: 'cliente' } };
    pool.query
      .mockResolvedValueOnce({ rows: [{ '?column?': 1 }] }) // vínculo encontrado
      .mockResolvedValueOnce({ rows: [{ id: 10, nome: 'Hóspede' }] });

    await getGuestById(req, res);

    expect(pool.query).toHaveBeenNthCalledWith(
      1,
      'SELECT 1 FROM reservas WHERE hospede_principal_id = $1 AND usuario_id = $2 LIMIT 1',
      ['10', 5],
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('cliente sem vínculo com o hóspede → 403, SELECT do hóspede nunca roda', async () => {
    const req = { params: { id: '10' }, user: { id: 5, tipo_usuario: 'cliente' } };
    pool.query.mockResolvedValueOnce({ rows: [] }); // sem vínculo

    await getGuestById(req, res);

    expect(pool.query).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe('createGuest — CPF: máscara/checksum/normalização', () => {
  let res;

  beforeEach(() => {
    jest.clearAllMocks();
    res = criarRes();
  });

  test('CPF com pontuação é normalizado (dígitos puros) antes de checar duplicidade e inserir', async () => {
    const req = { body: { nome: 'Hóspede', cpf: '529.982.247-25' } };
    pool.query
      .mockResolvedValueOnce({ rows: [] }) // checagem de duplicidade
      .mockResolvedValueOnce({ rows: [{ id: 1, cpf: '52998224725' }] }); // INSERT

    await createGuest(req, res);

    expect(pool.query).toHaveBeenNthCalledWith(1, 'SELECT id FROM hospedes WHERE cpf = $1', ['52998224725']);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('CPF colado sem pontuação (mesmo valor) é tratado identicamente', async () => {
    const req = { body: { nome: 'Hóspede', cpf: '52998224725' } };
    pool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 1, cpf: '52998224725' }] });

    await createGuest(req, res);

    expect(pool.query).toHaveBeenNthCalledWith(1, 'SELECT id FROM hospedes WHERE cpf = $1', ['52998224725']);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('CPF com dígito verificador inválido → 400, banco nunca é consultado', async () => {
    const req = { body: { nome: 'Hóspede', cpf: '529.982.247-20' } };

    await createGuest(req, res);

    expect(pool.query).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'CPF inválido.' });
  });

  test('CPF com todos os dígitos iguais (ex: 111.111.111-11) → 400', async () => {
    const req = { body: { nome: 'Hóspede', cpf: '111.111.111-11' } };

    await createGuest(req, res);

    expect(pool.query).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('CPF já cadastrado (em formato diferente do enviado) → 400', async () => {
    const req = { body: { nome: 'Hóspede', cpf: '529.982.247-25' } };
    pool.query.mockResolvedValueOnce({ rows: [{ id: 9 }] }); // já existe (gravado como "52998224725")

    await createGuest(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'CPF já cadastrado para outro hóspede.' });
  });

  test('CPF ausente: cadastro segue normalmente (CPF é opcional)', async () => {
    const req = { body: { nome: 'Hóspede' } };
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // INSERT direto, sem checagem de CPF/RG

    await createGuest(req, res);

    expect(pool.query).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(201);
  });
});

describe('updateGuest — correção F05', () => {
  let res;

  beforeEach(() => {
    jest.clearAllMocks();
    res = criarRes();
  });

  test('cliente sem vínculo tentando editar → 403, UPDATE nunca roda', async () => {
    const req = { params: { id: '10' }, body: { nome: 'Novo' }, user: { id: 5, tipo_usuario: 'cliente' } };
    pool.query.mockResolvedValueOnce({ rows: [] }); // sem vínculo

    await updateGuest(req, res);

    expect(pool.query).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('recepcionista edita qualquer hóspede sem checar vínculo', async () => {
    const req = { params: { id: '10' }, body: { nome: 'Novo' }, user: { id: 2, tipo_usuario: 'recepcionista' } };
    pool.query.mockResolvedValueOnce({ rows: [{ id: 10, nome: 'Novo' }] });

    await updateGuest(req, res);

    expect(pool.query).toHaveBeenCalledTimes(1); // direto no UPDATE, sem checagem de vínculo
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('CPF inválido na edição → 400, UPDATE nunca roda', async () => {
    const req = {
      params: { id: '10' },
      body: { cpf: '111.111.111-11' },
      user: { id: 2, tipo_usuario: 'recepcionista' },
    };

    await updateGuest(req, res);

    expect(pool.query).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('CPF duplicado (de OUTRO hóspede) na edição → 400, exclui o próprio id da checagem', async () => {
    const req = {
      params: { id: '10' },
      body: { cpf: '529.982.247-25' },
      user: { id: 2, tipo_usuario: 'recepcionista' },
    };
    pool.query.mockResolvedValueOnce({ rows: [{ id: 99 }] }); // outro hóspede já tem esse CPF

    await updateGuest(req, res);

    expect(pool.query).toHaveBeenNthCalledWith(
      1,
      'SELECT id FROM hospedes WHERE cpf = $1 AND id != $2',
      ['52998224725', '10'],
    );
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('editar mantendo o próprio CPF (nenhum outro hóspede com esse CPF) → 200', async () => {
    const req = {
      params: { id: '10' },
      body: { cpf: '529.982.247-25' },
      user: { id: 2, tipo_usuario: 'recepcionista' },
    };
    pool.query
      .mockResolvedValueOnce({ rows: [] }) // ninguém mais tem esse CPF
      .mockResolvedValueOnce({ rows: [{ id: 10, cpf: '52998224725' }] }); // UPDATE

    await updateGuest(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });
});
