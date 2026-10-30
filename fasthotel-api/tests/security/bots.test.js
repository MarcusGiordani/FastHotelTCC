// fasthotel-api/tests/security/bots.test.js
//
// TEMA 4 — Bots / proteção contra requisições automatizadas.
//
// Testa o middleware REAL de rate limiting (middleware/rateLimiter.js,
// baseado em express-rate-limit) aplicado a POST /api/usuarios/login e
// POST /api/usuarios (cadastro público). Antes desta tarefa o projeto não
// tinha nenhuma proteção contra força bruta/abuso nesses endpoints — foi
// implementada como parte desta atividade (ver SECURITY_TESTS.md).
//
// tests/security/setup.env.js configura limites BAIXOS e exclusivos desta
// suíte (5 requisições / 60s) para que o HTTP 429 real seja disparado de
// forma determinística com poucas chamadas, sem depender de temporizadores
// nem de mocks do middleware — a lógica de contagem/bloqueio é a mesma usada
// em produção, só o limiar é diferente.

const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../../app');
const pool = require('../../config/db');

const EMAIL_SUFFIX = '@bots.fasthotel.test';
const LOGIN_MAX = Number(process.env.RATE_LIMIT_LOGIN_MAX); // 5, definido em setup.env.js
const REGISTER_MAX = Number(process.env.RATE_LIMIT_REGISTER_MAX); // 5, definido em setup.env.js

const limparDados = () => pool.query('DELETE FROM usuarios WHERE email LIKE $1', [`%${EMAIL_SUFFIX}`]);

beforeAll(() => {
  if (process.env.PGDATABASE !== 'fasthotel_test') {
    throw new Error(`Abortado: conectado a "${process.env.PGDATABASE}", não a "fasthotel_test".`);
  }
  // Pré-condição do teste: confirma que o limite baixo de fato foi aplicado
  // (se setup.env.js não rodou antes do require('../../app'), os limites
  // seriam os padrões de produção e os testes abaixo não baterim).
  expect(LOGIN_MAX).toBe(5);
  expect(REGISTER_MAX).toBe(5);
});

afterAll(async () => {
  await limparDados();
  await pool.end();
});

const logar = (body) => request(app).post('/api/usuarios/login').send(body);
const cadastrar = (body) => request(app).post('/api/usuarios').send(body);

// =============================================================================
// Login: tentativas repetidas com senha incorreta (força bruta)
// =============================================================================
describe('Rate limiting — POST /api/usuarios/login', () => {
  test('requisições dentro do limite funcionam normalmente (não são bloqueadas)', async () => {
    for (let i = 0; i < LOGIN_MAX; i += 1) {
      const res = await logar({ email: `naoexiste-dentro-do-limite${EMAIL_SUFFIX}`, senha: 'errada' });
      expect(res.status).toBe(400); // "Credenciais inválidas." — chegou a processar, não foi bloqueado
    }
  });

  test(`após exceder ${LOGIN_MAX} tentativas de login na mesma janela, a API responde 429`, async () => {
    let ultimaResposta;
    for (let i = 0; i < LOGIN_MAX + 3; i += 1) {
      ultimaResposta = await logar({ email: `atacante${EMAIL_SUFFIX}`, senha: `tentativa${i}` });
    }

    expect(ultimaResposta.status).toBe(429);
    expect(ultimaResposta.body).toHaveProperty('message');
  });

  test('mesmo com a senha CORRETA, o login é bloqueado depois que a janela já foi esgotada pelo teste anterior (o bloqueio é por volume de requisições, não por senha errada)', async () => {
    // Criado por INSERT direto (não via POST /api/usuarios) para não consumir o
    // limite, independente, do rate limiter de CADASTRO testado mais abaixo.
    const email = `vitima-bruteforce${EMAIL_SUFFIX}`;
    const senhaReal = 'SenhaRealDaVitima1';
    const hash = await bcrypt.hash(senhaReal, 10);
    await pool.query(
      `INSERT INTO usuarios (nome, email, senha, tipo_usuario) VALUES ($1, $2, $3, 'cliente')`,
      ['Vítima Bruteforce', email, hash],
    );

    const res = await logar({ email, senha: senhaReal });
    expect(res.status).toBe(429);
  });
});

// =============================================================================
// Cadastro público: abuso de criação de contas
// =============================================================================
describe('Rate limiting — POST /api/usuarios (cadastro público)', () => {
  test('cadastros dentro do limite funcionam normalmente', async () => {
    for (let i = 0; i < REGISTER_MAX; i += 1) {
      const res = await cadastrar({
        nome: 'Usuário Normal',
        email: `normal${i}${EMAIL_SUFFIX}`,
        senha: 'senha123456',
      });
      expect(res.status).toBe(201);
    }
  });

  test(`o cadastro seguinte, já além dos ${REGISTER_MAX} permitidos na janela (teste anterior esgotou o limite), responde 429 e não cria a conta`, async () => {
    const emailExtra = `bot-extra${EMAIL_SUFFIX}`;
    const res = await cadastrar({ nome: 'Bot Extra', email: emailExtra, senha: 'senha123456' });

    expect(res.status).toBe(429);

    const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM usuarios WHERE email = $1', [emailExtra]);
    expect(rows[0].n).toBe(0); // a conta bloqueada não foi criada
  });
});
