// fasthotel-api/tests/unit/userController.test.js
//
// Testes unitários ISOLADOS da função loginUser (controllers/userController.js).
// Nada real é tocado: sem PostgreSQL, sem bcrypt real, sem assinatura JWT real.
// Os testes foram adaptados exatamente à implementação atual de loginUser:
//   1. const errors = validationResult(req);  -> se !isEmpty(): 400 { errors }
//   2. pool.query('SELECT * FROM usuarios WHERE email = $1', [email])
//   3. se rows.length === 0 -> 400 { message: 'Credenciais inválidas.' }
//   4. bcrypt.compare(senha, foundUser.senha) -> se false: 400 { message: 'Credenciais inválidas.' }
//   5. jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' }, cb)
//        cb(null, token) -> 200 { message, token, user: { id, nome, email, tipo_usuario } }
//   6. catch -> 500 { message: 'Erro no servidor durante o login.', error: err.message }

// --- Mocks de módulos (o Jest iça estas chamadas para o topo do arquivo) ---

// config/db.js faz `module.exports = pool`; loginUser usa somente pool.query(...).
jest.mock('../../config/db', () => ({
  query: jest.fn(),
}));

// loginUser usa bcrypt.compare(...); createUser/createStaffUser usam genSalt(...)+hash(...).
jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  genSalt: jest.fn(),
  hash: jest.fn(),
}));

// loginUser usa somente jwt.sign(payload, secret, options, callback).
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
}));

// loginUser começa com `const errors = validationResult(req)`.
jest.mock('express-validator', () => ({
  validationResult: jest.fn(),
}));

const pool = require('../../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { loginUser, createUser, createStaffUser, updateUser, getUserById } = require('../../controllers/userController');

// res fake com status()/json() encadeáveis, como no Express.
const criarRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// Linha como retornada por `SELECT * FROM usuarios` — inclui a coluna `senha`.
const usuarioNoBanco = {
  id: 1,
  nome: 'Usuário Teste',
  email: 'usuario@exemplo.com',
  senha: '$2a$10$hashfake.para.teste.unitario',
  tipo_usuario: 'cliente',
  data_cadastro: '2026-01-01T00:00:00.000Z',
};

describe('loginUser — testes unitários isolados', () => {
  let req;
  let res;
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();

    req = { body: { email: 'usuario@exemplo.com', senha: 'senha-correta' } };
    res = criarRes();

    // Padrão: sem erros de validação.
    validationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => [],
    });

    // Silencia o console.error do bloco catch para não poluir a saída.
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  test('1) usuário inexistente → HTTP 400 e "Credenciais inválidas."', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    await loginUser(req, res);

    expect(pool.query).toHaveBeenCalledTimes(1);
    expect(pool.query).toHaveBeenCalledWith(
      'SELECT * FROM usuarios WHERE email = $1',
      ['usuario@exemplo.com'],
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Credenciais inválidas.' });
    expect(bcrypt.compare).not.toHaveBeenCalled();
    expect(jwt.sign).not.toHaveBeenCalled();
  });

  test('2) senha incorreta → HTTP 400 e "Credenciais inválidas."', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ ...usuarioNoBanco }] });
    bcrypt.compare.mockResolvedValueOnce(false);

    await loginUser(req, res);

    expect(bcrypt.compare).toHaveBeenCalledWith('senha-correta', usuarioNoBanco.senha);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Credenciais inválidas.' });
    expect(jwt.sign).not.toHaveBeenCalled();
  });

  test('3) login correto → HTTP 200 com token e dados do usuário', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ ...usuarioNoBanco }] });
    bcrypt.compare.mockResolvedValueOnce(true);
    jwt.sign.mockImplementationOnce((payload, secret, options, callback) => {
      callback(null, 'token-fake-123');
    });

    await loginUser(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Login bem-sucedido!',
      token: 'token-fake-123',
      user: {
        id: usuarioNoBanco.id,
        nome: usuarioNoBanco.nome,
        email: usuarioNoBanco.email,
        tipo_usuario: usuarioNoBanco.tipo_usuario,
      },
    });

    // Confere o payload e as opções passados ao jwt.sign.
    const [payloadArg, , optionsArg] = jwt.sign.mock.calls[0];
    expect(payloadArg).toEqual({
      user: { id: usuarioNoBanco.id, tipo_usuario: usuarioNoBanco.tipo_usuario },
    });
    expect(optionsArg).toEqual({ expiresIn: '1h' });
  });

  test('4) a senha nunca aparece no objeto user retornado', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ ...usuarioNoBanco }] });
    bcrypt.compare.mockResolvedValueOnce(true);
    jwt.sign.mockImplementationOnce((payload, secret, options, callback) => {
      callback(null, 'token-fake-123');
    });

    await loginUser(req, res);

    const corpoResposta = res.json.mock.calls[0][0];
    expect(corpoResposta.user).toBeDefined();
    expect(corpoResposta.user).not.toHaveProperty('senha');
    // O objeto user deve conter EXATAMENTE estas chaves.
    expect(Object.keys(corpoResposta.user).sort()).toEqual([
      'email',
      'id',
      'nome',
      'tipo_usuario',
    ]);
  });

  test('5) erro no banco → HTTP 500', async () => {
    pool.query.mockRejectedValueOnce(new Error('conexão recusada'));

    await loginUser(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Erro no servidor durante o login.',
      error: 'conexão recusada',
    });
    expect(jwt.sign).not.toHaveBeenCalled();
  });

  test('6) erro de validação (validationResult) → HTTP 400 e o banco não é consultado', async () => {
    validationResult.mockReturnValue({
      isEmpty: () => false,
      array: () => [{ msg: 'Email inválido.', param: 'email' }],
    });

    await loginUser(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      errors: [{ msg: 'Email inválido.', param: 'email' }],
    });
    expect(pool.query).not.toHaveBeenCalled();
    expect(bcrypt.compare).not.toHaveBeenCalled();
    expect(jwt.sign).not.toHaveBeenCalled();
  });
});

// =====================================================================
// F01 — createUser (cadastro público) deve SEMPRE criar como 'cliente',
// ignorando qualquer tipo_usuario enviado no corpo da requisição.
// createStaffUser (rota protegida /usuarios/staff) deve respeitar o
// tipo_usuario enviado — a restrição de QUEM pode chamá-la é do
// middleware authorize(['admin']), validado nos testes de integração.
// =====================================================================
describe('createUser / createStaffUser — correção F01', () => {
  let req;
  let res;
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    res = criarRes();
    validationResult.mockReturnValue({ isEmpty: () => true, array: () => [] });
    bcrypt.genSalt.mockResolvedValue('salt-fake');
    bcrypt.hash.mockResolvedValue('hash-fake');
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  test('createUser ignora tipo_usuario="admin" enviado por um visitante e grava "cliente"', async () => {
    req = {
      body: { nome: 'Fulano', email: 'fulano@teste.com', senha: 'senha123', tipo_usuario: 'admin' },
    };
    pool.query
      .mockResolvedValueOnce({ rows: [] }) // SELECT: e-mail ainda não existe
      .mockResolvedValueOnce({
        rows: [{ id: 10, nome: 'Fulano', email: 'fulano@teste.com', tipo_usuario: 'cliente', data_cadastro: '2026-01-01' }],
      }); // INSERT ... RETURNING

    await createUser(req, res);

    const [, insertParams] = pool.query.mock.calls[1];
    expect(insertParams).toEqual(['Fulano', 'fulano@teste.com', 'hash-fake', 'cliente']);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Usuário criado com sucesso!',
      user: expect.objectContaining({ tipo_usuario: 'cliente' }),
    });
  });

  test('createUser: e-mail já cadastrado → 400, sem tentar inserir', async () => {
    req = { body: { nome: 'Fulano', email: 'fulano@teste.com', senha: 'senha123' } };
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

    await createUser(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Email já cadastrado.' });
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  test('createUser: erro de validação → 400, banco não é consultado', async () => {
    validationResult.mockReturnValue({
      isEmpty: () => false,
      array: () => [{ msg: 'Email inválido.' }],
    });
    req = { body: { nome: 'x', email: 'invalido', senha: '123' } };

    await createUser(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('createStaffUser grava o tipo_usuario enviado (rota já é protegida por authorize([\'admin\']))', async () => {
    req = {
      body: { nome: 'Equipe', email: 'equipe@teste.com', senha: 'senha123', tipo_usuario: 'recepcionista' },
    };
    pool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{ id: 11, nome: 'Equipe', email: 'equipe@teste.com', tipo_usuario: 'recepcionista', data_cadastro: '2026-01-01' }],
      });

    await createStaffUser(req, res);

    const [, insertParams] = pool.query.mock.calls[1];
    expect(insertParams).toEqual(['Equipe', 'equipe@teste.com', 'hash-fake', 'recepcionista']);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Usuário criado com sucesso!',
      user: expect.objectContaining({ tipo_usuario: 'recepcionista' }),
    });
  });
});

// =====================================================================
// F02 — updateUser não pode mais permitir que um usuário altere dados de
// outra conta nem o próprio tipo_usuario, a menos que quem chama já seja
// admin. Edição do próprio nome/e-mail continua funcionando (regressão).
// =====================================================================
describe('updateUser — correção F02', () => {
  let req;
  let res;

  beforeEach(() => {
    jest.clearAllMocks();
    res = criarRes();
  });

  test('cliente tentando alterar o próprio tipo_usuario → 403, UPDATE não executado', async () => {
    req = { params: { id: '5' }, body: { tipo_usuario: 'admin' }, user: { id: 5, tipo_usuario: 'cliente' } };

    await updateUser(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('cliente tentando alterar dados de outro usuário → 403, UPDATE não executado', async () => {
    req = { params: { id: '7' }, body: { nome: 'Novo Nome' }, user: { id: 5, tipo_usuario: 'cliente' } };

    await updateUser(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('cliente alterando o próprio nome/e-mail (sem tipo_usuario) continua permitido', async () => {
    req = {
      params: { id: '5' },
      body: { nome: 'Nome Novo', email: 'novo@teste.com' },
      user: { id: 5, tipo_usuario: 'cliente' },
    };
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 5, nome: 'Nome Novo', email: 'novo@teste.com', tipo_usuario: 'cliente' }],
    });

    await updateUser(req, res);

    expect(pool.query).toHaveBeenCalledWith(
      'UPDATE usuarios SET nome = COALESCE($1, nome), email = COALESCE($2, email), tipo_usuario = COALESCE($3, tipo_usuario) WHERE id = $4 RETURNING id, nome, email, tipo_usuario',
      ['Nome Novo', 'novo@teste.com', null, '5'],
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('admin alterando tipo_usuario de outro usuário → permitido, 200', async () => {
    req = {
      params: { id: '9' },
      body: { tipo_usuario: 'recepcionista' },
      user: { id: 1, tipo_usuario: 'admin' },
    };
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 9, nome: 'X', email: 'x@x.com', tipo_usuario: 'recepcionista' }],
    });

    await updateUser(req, res);

    expect(pool.query).toHaveBeenCalledWith(
      expect.any(String),
      [undefined, undefined, 'recepcionista', '9'],
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('usuário não encontrado → 404', async () => {
    req = { params: { id: '5' }, body: { nome: 'X' }, user: { id: 5, tipo_usuario: 'cliente' } };
    pool.query.mockResolvedValueOnce({ rows: [] });

    await updateUser(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe('getUserById — correção F03', () => {
  let req;
  let res;

  beforeEach(() => {
    jest.clearAllMocks();
    res = criarRes();
  });

  test('cliente consultando o PRÓPRIO id → 200, consulta o banco', async () => {
    req = { params: { id: '5' }, user: { id: 5, tipo_usuario: 'cliente' } };
    pool.query.mockResolvedValueOnce({ rows: [{ id: 5, nome: 'X', email: 'x@x.com', tipo_usuario: 'cliente' }] });

    await getUserById(req, res);

    expect(pool.query).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('cliente consultando id de OUTRO usuário → 403, banco não é consultado', async () => {
    req = { params: { id: '7' }, user: { id: 5, tipo_usuario: 'cliente' } };

    await getUserById(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('admin consultando qualquer id → 200', async () => {
    req = { params: { id: '7' }, user: { id: 1, tipo_usuario: 'admin' } };
    pool.query.mockResolvedValueOnce({ rows: [{ id: 7, nome: 'Y', email: 'y@y.com', tipo_usuario: 'cliente' }] });

    await getUserById(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('recepcionista consultando qualquer id → 200', async () => {
    req = { params: { id: '7' }, user: { id: 2, tipo_usuario: 'recepcionista' } };
    pool.query.mockResolvedValueOnce({ rows: [{ id: 7, nome: 'Y', email: 'y@y.com', tipo_usuario: 'cliente' }] });

    await getUserById(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });
});
