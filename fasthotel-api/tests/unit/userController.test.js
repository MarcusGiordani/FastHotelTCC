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

// loginUser usa somente bcrypt.compare(...).
jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
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
const { loginUser } = require('../../controllers/userController');

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
