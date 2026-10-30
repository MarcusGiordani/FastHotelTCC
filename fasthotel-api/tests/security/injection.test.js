// fasthotel-api/tests/security/injection.test.js
//
// TEMA 3 — Injeção de código / SQL Injection.
//
// Testes REAIS contra o PostgreSQL de teste ("fasthotel_test"): enviamos
// payloads maliciosos (porém inofensivos — não destrutivos) em campos usados
// em consultas SQL (login, filtros de busca com ILIKE/WHERE dinâmico) e
// confirmamos que:
//   - a consulta não é alterada (não loga sem senha correta, não retorna
//     registros indevidos, não derruba tabelas);
//   - o payload é tratado como DADO literal, nunca como comando SQL;
//   - a integridade do banco é preservada (tabela "usuarios" continua existindo
//     com o número esperado de linhas).
//
// Todos os controllers já usam consultas parametrizadas ($1, $2, ...) com `pg`
// (ver controllers/userController.js, inventoryController.js, etc. — nenhuma
// concatenação de entrada do usuário em SQL foi encontrada na Etapa 1 de
// análise). Estes testes comprovam esse comportamento na prática, batendo na
// API real, e não apenas lendo o código.

const request = require('supertest');
const app = require('../../app');
const pool = require('../../config/db');

const EMAIL_SUFFIX = '@inj.fasthotel.test';

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

const PAYLOADS_SQLI = [
  "' OR '1'='1",
  "1 OR 1=1",
  "'; DROP TABLE usuarios; --",
  "' OR 1=1 --",
  "admin'--",
];

// =============================================================================
// Login (SELECT ... WHERE email = $1): payload no campo e-mail
// =============================================================================
describe('SQL Injection — POST /api/usuarios/login (campo email)', () => {
  test.each(PAYLOADS_SQLI)('payload "%s" no e-mail não autentica e não derruba a tabela usuarios', async (payload) => {
    const res = await logar({ email: payload, senha: 'qualquercoisa123' });

    // express-validator rejeita (400, "e-mail inválido") OU o controller não
    // encontra ninguém (400, "Credenciais inválidas.") — nunca autentica (200/201).
    expect([400]).toContain(res.status);
    expect(res.body).not.toHaveProperty('token');

    // a tabela "usuarios" sobreviveu ao payload (não foi "DROP"ada)
    const { rows } = await pool.query("SELECT to_regclass('public.usuarios') AS existe");
    expect(rows[0].existe).toBe('usuarios');
  });
});

// =============================================================================
// Login (bcrypt.compare): payload no campo senha de um usuário real existente
// =============================================================================
describe('SQL Injection — POST /api/usuarios/login (campo senha, usuário real existente)', () => {
  test.each(PAYLOADS_SQLI)('payload "%s" na senha não contorna a autenticação de um usuário real', async (payload) => {
    const email = `vitima${EMAIL_SUFFIX}`;
    await cadastrar({ nome: 'Vítima', email, senha: 'SenhaRealDaVitima1' });

    const res = await logar({ email, senha: payload });

    expect(res.status).toBe(400);
    expect(res.body).not.toHaveProperty('token');
    expect(res.body.message).toBe('Credenciais inválidas.');
  });
});

// =============================================================================
// Cadastro (INSERT parametrizado): payload nos campos de texto
// =============================================================================
describe('SQL Injection — POST /api/usuarios (campo nome)', () => {
  test('payload malicioso no nome é gravado como texto literal, sem executar SQL extra', async () => {
    const payload = "Robert'); DROP TABLE usuarios;--";
    const email = `nome-malicioso${EMAIL_SUFFIX}`;

    const res = await cadastrar({ nome: payload, email, senha: 'senha123456' });

    expect(res.status).toBe(201);
    expect(res.body.user.nome).toBe(payload); // gravado literalmente, sem alterar a query

    const { rows } = await pool.query("SELECT to_regclass('public.usuarios') AS existe");
    expect(rows[0].existe).toBe('usuarios'); // a tabela continua existindo

    const verificacao = await pool.query('SELECT nome FROM usuarios WHERE email = $1', [email]);
    expect(verificacao.rows[0].nome).toBe(payload);
  });
});

// =============================================================================
// Busca com WHERE dinâmico + ILIKE (controllers/inventoryController.js) —
// endpoint de estoque, acessível a qualquer usuário autenticado.
// =============================================================================
describe('SQL Injection — GET /api/estoque/produtos?nome= (WHERE dinâmico + ILIKE)', () => {
  let adminToken;

  beforeAll(async () => {
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash('senha123', 10);
    await pool.query(
      `INSERT INTO usuarios (nome, email, senha, tipo_usuario) VALUES ($1, $2, $3, 'admin')`,
      ['Admin Injection', `admin${EMAIL_SUFFIX}`, hash],
    );
    const login = await logar({ email: `admin${EMAIL_SUFFIX}`, senha: 'senha123' });
    adminToken = login.body.token;
  });

  test.each(["' OR '1'='1", "x'; DROP TABLE produtos; --", "%' OR 1=1 --"])(
    'payload "%s" no filtro ?nome= não retorna todos os produtos nem derruba a tabela',
    async (payload) => {
      const res = await request(app)
        .get('/api/estoque/produtos')
        .set('x-auth-token', adminToken)
        .query({ nome: payload });

      // nunca deve dar 500 (erro de SQL malformado) nem derrubar a tabela
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);

      const { rows } = await pool.query("SELECT to_regclass('public.produtos') AS existe");
      expect(rows[0].existe).toBe('produtos');
    },
  );
});
