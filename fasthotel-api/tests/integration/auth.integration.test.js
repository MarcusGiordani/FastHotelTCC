// fasthotel-api/tests/integration/auth.integration.test.js
//
// Testes de INTEGRAÇÃO reais (sem mocks de banco):
//   Supertest -> Express real (app.js) -> rota real -> middlewares de validação
//   reais (express-validator) -> controller real -> PostgreSQL "fasthotel_test" real.
//
// Pré-requisitos garantidos pela config (jest.integration.config.js):
//   - setup.env.js  : carrega .env.test e trava PGDATABASE === 'fasthotel_test'
//   - global-setup.js: cria o banco de teste e aplica database/schema.sql

const request = require('supertest');
const app = require('../../app');
const pool = require('../../config/db'); // mesmo Pool usado pelo controller (singleton)

// Só a tabela "usuarios" é tocada por estes testes; nenhuma reserva/chat é criada,
// então um DELETE simples basta e não esbarra em foreign keys.
const limparUsuarios = () => pool.query('DELETE FROM usuarios');

beforeAll(() => {
  // Defesa em profundidade (a trava principal está em setup.env.js).
  if (process.env.PGDATABASE !== 'fasthotel_test') {
    throw new Error(`Abortado: conectado a "${process.env.PGDATABASE}", não a "fasthotel_test".`);
  }
});

beforeEach(async () => {
  await limparUsuarios();
});

afterAll(async () => {
  await limparUsuarios();
  await pool.end(); // fecha o Pool para o Jest encerrar sem handles abertos
});

// Helpers -------------------------------------------------------------------

const cadastrar = (body) => request(app).post('/api/usuarios').send(body);
const logar = (body) => request(app).post('/api/usuarios/login').send(body);

const contarPorEmail = async (email) => {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM usuarios WHERE email = $1', [email]);
  return rows[0].n;
};

// =========================================================================
// 1) Cadastro de usuário válido
// =========================================================================
describe('POST /api/usuarios — cadastro', () => {
  test('cadastra usuário válido: HTTP 201 e registro realmente persistido no PostgreSQL', async () => {
    const res = await cadastrar({
      nome: 'Ana Souza',
      email: 'ana.souza@empresa.com',
      senha: 'senhaSegura1',
      tipo_usuario: 'cliente',
    });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Usuário criado com sucesso!');
    expect(res.body.user).toMatchObject({
      nome: 'Ana Souza',
      email: 'ana.souza@empresa.com',
      tipo_usuario: 'cliente',
    });
    expect(res.body.user).toHaveProperty('id');
    expect(res.body.user).not.toHaveProperty('senha');

    // Verificação REAL no banco
    const { rows } = await pool.query(
      'SELECT nome, email, tipo_usuario, senha FROM usuarios WHERE email = $1',
      ['ana.souza@empresa.com'],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].nome).toBe('Ana Souza');
    expect(rows[0].tipo_usuario).toBe('cliente');
    // a senha foi gravada com hash bcrypt, nunca em texto puro
    expect(rows[0].senha).not.toBe('senhaSegura1');
    expect(rows[0].senha).toMatch(/^\$2[aby]\$/);
  });
});

// =========================================================================
// 2) Login com usuário cadastrado
// =========================================================================
describe('POST /api/usuarios/login — sucesso', () => {
  test('login de usuário existente: HTTP 200, token presente, dados corretos, sem senha', async () => {
    await cadastrar({ nome: 'Bruno Lima', email: 'bruno.lima@empresa.com', senha: 'segredo123' });

    const res = await logar({ email: 'bruno.lima@empresa.com', senha: 'segredo123' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Login bem-sucedido!');

    // token JWT presente e com aparência de JWT (3 segmentos)
    expect(typeof res.body.token).toBe('string');
    expect(res.body.token.split('.')).toHaveLength(3);

    // dados do usuário
    expect(res.body.user).toEqual({
      id: expect.any(Number),
      nome: 'Bruno Lima',
      email: 'bruno.lima@empresa.com',
      tipo_usuario: 'cliente',
    });

    // senha não pode aparecer em lugar nenhum da resposta
    expect(res.body.user).not.toHaveProperty('senha');
    expect(JSON.stringify(res.body)).not.toContain('segredo123');
  });
});

// =========================================================================
// 3) Login com senha incorreta
// =========================================================================
describe('POST /api/usuarios/login — senha incorreta', () => {
  test('HTTP 400 e "Credenciais inválidas."', async () => {
    await cadastrar({ nome: 'Carla Dias', email: 'carla.dias@empresa.com', senha: 'senhaCerta1' });

    const res = await logar({ email: 'carla.dias@empresa.com', senha: 'senhaErrada9' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: 'Credenciais inválidas.' });
    expect(res.body).not.toHaveProperty('token');
  });
});

// =========================================================================
// 4) Login com usuário inexistente
// =========================================================================
describe('POST /api/usuarios/login — usuário inexistente', () => {
  test('HTTP 400 e "Credenciais inválidas."', async () => {
    const res = await logar({ email: 'ninguem.aqui@empresa.com', senha: 'qualquer123' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: 'Credenciais inválidas.' });
    expect(res.body).not.toHaveProperty('token');
  });
});

// =========================================================================
// 5) Normalização de e-mail (comportamento REAL de normalizeEmail() nas rotas)
// =========================================================================
describe('normalização de e-mail (rotas de cadastro e login)', () => {
  test('Gmail com pontos: pontos são removidos e o login funciona com qualquer grafia', async () => {
    const reg = await cadastrar({ nome: 'Joao Pereira', email: 'joao.pereira@gmail.com', senha: 'senha123' });
    expect(reg.status).toBe(201);
    expect(reg.body.user.email).toBe('joaopereira@gmail.com');

    const comPontos = await logar({ email: 'joao.pereira@gmail.com', senha: 'senha123' });
    expect(comPontos.status).toBe(200);
    expect(comPontos.body.user.email).toBe('joaopereira@gmail.com');

    const semPontos = await logar({ email: 'joaopereira@gmail.com', senha: 'senha123' });
    expect(semPontos.status).toBe(200);
  });

  test('Gmail com +tag: o subendereço é removido e o login funciona com e sem a tag', async () => {
    const reg = await cadastrar({ nome: 'Maria Nunes', email: 'maria.nunes+promo@gmail.com', senha: 'senha123' });
    expect(reg.status).toBe(201);
    expect(reg.body.user.email).toBe('marianunes@gmail.com');

    const comTag = await logar({ email: 'maria.nunes+outra@gmail.com', senha: 'senha123' });
    expect(comTag.status).toBe(200);

    const semTag = await logar({ email: 'marianunes@gmail.com', senha: 'senha123' });
    expect(semTag.status).toBe(200);
  });

  test('letras maiúsculas (Gmail): normalizado para minúsculas', async () => {
    const reg = await cadastrar({ nome: 'Pedro Alves', email: 'Pedro.Alves@Gmail.com', senha: 'senha123' });
    expect(reg.status).toBe(201);
    expect(reg.body.user.email).toBe('pedroalves@gmail.com');

    const login = await logar({ email: 'PEDRO.ALVES@GMAIL.COM', senha: 'senha123' });
    expect(login.status).toBe(200);
    expect(login.body.user.email).toBe('pedroalves@gmail.com');
  });

  test('e-mail não Gmail com diferença de maiúsculas: normalizado para minúsculas (pontos preservados)', async () => {
    const reg = await cadastrar({ nome: 'Recepcao Hotel', email: 'Recepcao.Geral@Hotel.com', senha: 'senha123' });
    expect(reg.status).toBe(201);
    expect(reg.body.user.email).toBe('recepcao.geral@hotel.com');

    const login = await logar({ email: 'RECEPCAO.GERAL@HOTEL.COM', senha: 'senha123' });
    expect(login.status).toBe(200);
    expect(login.body.user.email).toBe('recepcao.geral@hotel.com');
  });
});

// =========================================================================
// 6) E-mail equivalente duplicado
// =========================================================================
describe('POST /api/usuarios — e-mail equivalente duplicado', () => {
  test('após cadastrar a.b@gmail.com, cadastrar ab@gmail.com é rejeitado (mesmo e-mail normalizado)', async () => {
    const primeiro = await cadastrar({ nome: 'Alpha Beta', email: 'a.b@gmail.com', senha: 'senha123' });
    expect(primeiro.status).toBe(201);
    expect(primeiro.body.user.email).toBe('ab@gmail.com');

    const segundo = await cadastrar({ nome: 'Alpha Beta Dois', email: 'ab@gmail.com', senha: 'outra123' });
    expect(segundo.status).toBe(400);
    expect(segundo.body.message).toBe('Email já cadastrado.');

    // no banco existe exatamente 1 registro para o e-mail normalizado
    expect(await contarPorEmail('ab@gmail.com')).toBe(1);
  });
});

// =========================================================================
// 7) Validação da rota (acontece antes de consultar o banco)
// =========================================================================
describe('POST /api/usuarios/login — validação da rota', () => {
  test('e-mail inválido: HTTP 400 com corpo de validação (errors), sem tocar o controller/banco', async () => {
    const spyQuery = jest.spyOn(pool, 'query'); // apenas observa; não altera o comportamento

    const res = await logar({ email: 'isto-nao-e-email', senha: 'senha123' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('errors');
    expect(Array.isArray(res.body.errors)).toBe(true);
    // se o controller tivesse rodado, o corpo seria { message: 'Credenciais inválidas.' }
    expect(res.body).not.toHaveProperty('message');
    // e nenhuma query teria sido disparada por esta requisição
    expect(spyQuery).not.toHaveBeenCalled();

    spyQuery.mockRestore();
  });

  test('senha vazia: HTTP 400 com corpo de validação (errors)', async () => {
    const spyQuery = jest.spyOn(pool, 'query');

    const res = await logar({ email: 'usuario.valido@empresa.com', senha: '' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('errors');
    expect(Array.isArray(res.body.errors)).toBe(true);
    expect(res.body).not.toHaveProperty('message');
    expect(spyQuery).not.toHaveBeenCalled();

    spyQuery.mockRestore();
  });
});
