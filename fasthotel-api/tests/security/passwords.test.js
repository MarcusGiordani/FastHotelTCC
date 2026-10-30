// fasthotel-api/tests/security/passwords.test.js
//
// TEMA 2 — Criptografia e segurança de senhas.
//
// Testes REAIS (Supertest -> app.js -> controllers reais -> PostgreSQL
// "fasthotel_test" real). Verificam o comportamento de verdade do sistema:
// como a senha é gravada no banco, se o algoritmo usa salt (hashes diferentes
// para a mesma senha), se login aceita/rejeita corretamente, e se a senha ou
// seu hash aparecem em alguma resposta da API.
//
// fasthotel-api/controllers/userController.js usa bcryptjs (bcrypt.hash com
// genSalt(10)) tanto no cadastro (criarUsuario) quanto em changePassword.

const request = require('supertest');
const app = require('../../app');
const pool = require('../../config/db');

const EMAIL_SUFFIX = '@pwd.fasthotel.test';

const limparDados = () => pool.query('DELETE FROM usuarios WHERE email LIKE $1', [`%${EMAIL_SUFFIX}`]);

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

const cadastrar = (body) => request(app).post('/api/usuarios').send(body);
const logar = (body) => request(app).post('/api/usuarios/login').send(body);

const BCRYPT_HASH_REGEX = /^\$2[aby]\$\d{2}\$[A-Za-z0-9./]{53}$/;

// =============================================================================
// Armazenamento: hash seguro, nunca texto puro
// =============================================================================
describe('Armazenamento de senha', () => {
  test('a senha é gravada no banco como hash bcrypt, nunca em texto puro', async () => {
    const senha = 'MinhaSenhaSegura1';
    const res = await cadastrar({ nome: 'Usuário Senha', email: `u1${EMAIL_SUFFIX}`, senha });
    expect(res.status).toBe(201);

    const { rows } = await pool.query('SELECT senha FROM usuarios WHERE email = $1', [`u1${EMAIL_SUFFIX}`]);
    expect(rows).toHaveLength(1);
    expect(rows[0].senha).not.toBe(senha);
    expect(rows[0].senha.toLowerCase()).not.toContain(senha.toLowerCase());
    expect(rows[0].senha).toMatch(BCRYPT_HASH_REGEX);
  });

  test('dois usuários com a MESMA senha recebem hashes DIFERENTES (salt por usuário)', async () => {
    const senha = 'SenhaRepetida1';
    await cadastrar({ nome: 'Usuário Um', email: `u2${EMAIL_SUFFIX}`, senha });
    await cadastrar({ nome: 'Usuário Dois', email: `u3${EMAIL_SUFFIX}`, senha });

    const { rows } = await pool.query(
      'SELECT email, senha FROM usuarios WHERE email IN ($1, $2)',
      [`u2${EMAIL_SUFFIX}`, `u3${EMAIL_SUFFIX}`],
    );
    expect(rows).toHaveLength(2);
    expect(rows[0].senha).not.toBe(rows[1].senha);
    rows.forEach((r) => expect(r.senha).toMatch(BCRYPT_HASH_REGEX));
  });
});

// =============================================================================
// Login: senha correta aceita, incorreta rejeitada
// =============================================================================
describe('Verificação de senha no login', () => {
  test('senha correta -> 200 com token', async () => {
    await cadastrar({ nome: 'Usuário Login', email: `u4${EMAIL_SUFFIX}`, senha: 'SenhaCorreta1' });

    const res = await logar({ email: `u4${EMAIL_SUFFIX}`, senha: 'SenhaCorreta1' });

    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
  });

  test('senha incorreta -> 400, sem token, mensagem genérica (não revela se o e-mail existe)', async () => {
    await cadastrar({ nome: 'Usuário Login2', email: `u5${EMAIL_SUFFIX}`, senha: 'SenhaCorreta2' });

    const res = await logar({ email: `u5${EMAIL_SUFFIX}`, senha: 'SenhaErrada999' });

    expect(res.status).toBe(400);
    expect(res.body).not.toHaveProperty('token');
    expect(res.body.message).toBe('Credenciais inválidas.');
  });

  test('e-mail inexistente recebe a MESMA mensagem genérica que senha incorreta (não há enumeração de contas)', async () => {
    const res = await logar({ email: `naoexiste${EMAIL_SUFFIX}`, senha: 'qualquer123' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Credenciais inválidas.');
  });
});

// =============================================================================
// Exposição: senha/hash nunca devem aparecer em respostas da API
// =============================================================================
describe('A senha/hash nunca é exposta nas respostas da API', () => {
  test('POST /api/usuarios (cadastro) não retorna a senha nem o hash', async () => {
    const res = await cadastrar({ nome: 'Usuário Exposto', email: `u6${EMAIL_SUFFIX}`, senha: 'SenhaSecreta1' });

    expect(res.status).toBe(201);
    expect(JSON.stringify(res.body)).not.toContain('SenhaSecreta1');
    expect(res.body.user).not.toHaveProperty('senha');
  });

  test('POST /api/usuarios/login não retorna a senha nem o hash', async () => {
    await cadastrar({ nome: 'Usuário Exposto2', email: `u7${EMAIL_SUFFIX}`, senha: 'SenhaSecreta2' });

    const res = await logar({ email: `u7${EMAIL_SUFFIX}`, senha: 'SenhaSecreta2' });

    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toContain('SenhaSecreta2');
    expect(res.body.user).not.toHaveProperty('senha');
    expect(res.body).not.toHaveProperty('senha');
  });

  test('GET /api/usuarios/:id (próprio usuário) não retorna a senha nem o hash', async () => {
    await cadastrar({ nome: 'Usuário Exposto3', email: `u8${EMAIL_SUFFIX}`, senha: 'SenhaSecreta3' });
    const login = await logar({ email: `u8${EMAIL_SUFFIX}`, senha: 'SenhaSecreta3' });

    const res = await request(app)
      .get(`/api/usuarios/${login.body.user.id}`)
      .set('x-auth-token', login.body.token);

    expect(res.status).toBe(200);
    expect(res.body).not.toHaveProperty('senha');
    expect(JSON.stringify(res.body)).not.toContain('SenhaSecreta3');
  });
});
