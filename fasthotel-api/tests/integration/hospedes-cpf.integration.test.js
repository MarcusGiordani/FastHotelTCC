// fasthotel-api/tests/integration/hospedes-cpf.integration.test.js
//
// Testes de integração REAIS (Supertest -> app.js -> rotas reais -> controllers
// reais -> PostgreSQL "fasthotel_test" real) do tratamento de CPF no cadastro e
// edição de hóspedes: normalização (sempre grava só os 11 dígitos), validação
// de dígitos verificadores e prevenção de duplicidade entre formatos diferentes.

const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../../app');
const pool = require('../../config/db');

const EMAIL_SUFFIX = '@cpf.fasthotel.test';
const GUEST_MARKER = 'CPFTEST';

// CPFs válidos (dígitos verificadores corretos) e um inválido, para os testes.
const CPF_VALIDO_1_PONTUADO = '529.982.247-25';
const CPF_VALIDO_1_DIGITOS = '52998224725';
const CPF_VALIDO_2_DIGITOS = '11144477735';
const CPF_INVALIDO = '529.982.247-20'; // dígito verificador errado

const limparDados = async () => {
  await pool.query('DELETE FROM hospedes WHERE sobrenome LIKE $1', [`${GUEST_MARKER}%`]);
  await pool.query('DELETE FROM usuarios WHERE email LIKE $1', [`%${EMAIL_SUFFIX}`]);
};

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

const auth = (token) => ({ 'x-auth-token': token });
let contador = 0;

async function criarAdminDireto(email, senha) {
  const hash = await bcrypt.hash(senha, 10);
  await pool.query(
    `INSERT INTO usuarios (nome, email, senha, tipo_usuario) VALUES ($1, $2, $3, 'admin')`,
    ['Admin CPF', email, hash],
  );
  const login = await request(app).post('/api/usuarios/login').send({ email, senha });
  return login.body.token;
}

function proximoSobrenome() {
  contador += 1;
  return `${GUEST_MARKER}${contador}`;
}

describe('Cadastro de hóspede — normalização e validação de CPF', () => {
  test('CPF digitado com pontuação é salvo só com os 11 dígitos', async () => {
    const admin = await criarAdminDireto(`a1${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const res = await request(app)
      .post('/api/hospedes')
      .set(auth(admin))
      .send({ nome: 'Hóspede', sobrenome: proximoSobrenome(), cpf: CPF_VALIDO_1_PONTUADO });

    expect(res.status).toBe(201);
    expect(res.body.guest.cpf).toBe(CPF_VALIDO_1_DIGITOS);

    const { rows } = await pool.query('SELECT cpf FROM hospedes WHERE id = $1', [res.body.guest.id]);
    expect(rows[0].cpf).toBe(CPF_VALIDO_1_DIGITOS);
  });

  test('CPF colado sem pontuação é aceito e salvo da mesma forma', async () => {
    const admin = await criarAdminDireto(`a2${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const res = await request(app)
      .post('/api/hospedes')
      .set(auth(admin))
      .send({ nome: 'Hóspede', sobrenome: proximoSobrenome(), cpf: CPF_VALIDO_1_DIGITOS });

    expect(res.status).toBe(201);
    expect(res.body.guest.cpf).toBe(CPF_VALIDO_1_DIGITOS);
  });

  test('CPF com dígito verificador inválido → 400, hóspede não é criado', async () => {
    const admin = await criarAdminDireto(`a3${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const res = await request(app)
      .post('/api/hospedes')
      .set(auth(admin))
      .send({ nome: 'Hóspede', sobrenome: proximoSobrenome(), cpf: CPF_INVALIDO });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/CPF inválido/i);
  });

  test('mesmo CPF em formatos diferentes é tratado como duplicado', async () => {
    const admin = await criarAdminDireto(`a4${Date.now()}${EMAIL_SUFFIX}`, 'senha123');

    const primeiro = await request(app)
      .post('/api/hospedes')
      .set(auth(admin))
      .send({ nome: 'Hóspede', sobrenome: proximoSobrenome(), cpf: CPF_VALIDO_1_PONTUADO });
    expect(primeiro.status).toBe(201);

    // mesmo CPF, mas colado sem pontuação — deve ser reconhecido como o mesmo
    const segundo = await request(app)
      .post('/api/hospedes')
      .set(auth(admin))
      .send({ nome: 'Outro Hóspede', sobrenome: proximoSobrenome(), cpf: CPF_VALIDO_1_DIGITOS });

    expect(segundo.status).toBe(400);
    expect(segundo.body.message).toMatch(/já cadastrado/i);
  });

  test('CPF ausente: cadastro continua funcionando normalmente (campo opcional no backend)', async () => {
    const admin = await criarAdminDireto(`a5${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const res = await request(app)
      .post('/api/hospedes')
      .set(auth(admin))
      .send({ nome: 'Hóspede', sobrenome: proximoSobrenome() });

    expect(res.status).toBe(201);
    expect(res.body.guest.cpf).toBeNull();
  });
});

describe('Edição de hóspede — normalização e validação de CPF', () => {
  test('editar e corrigir a pontuação do próprio CPF não é tratado como duplicidade', async () => {
    const admin = await criarAdminDireto(`a6${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const criado = await request(app)
      .post('/api/hospedes')
      .set(auth(admin))
      .send({ nome: 'Hóspede', sobrenome: proximoSobrenome(), cpf: CPF_VALIDO_1_DIGITOS });
    const id = criado.body.guest.id;

    const edicao = await request(app)
      .put(`/api/hospedes/${id}`)
      .set(auth(admin))
      .send({ cpf: CPF_VALIDO_1_PONTUADO }); // mesmo CPF, agora pontuado

    expect(edicao.status).toBe(200);
    expect(edicao.body.guest.cpf).toBe(CPF_VALIDO_1_DIGITOS);
  });

  test('editar para um CPF inválido → 400, UPDATE não é aplicado', async () => {
    const admin = await criarAdminDireto(`a7${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const criado = await request(app)
      .post('/api/hospedes')
      .set(auth(admin))
      .send({ nome: 'Hóspede', sobrenome: proximoSobrenome(), cpf: CPF_VALIDO_1_DIGITOS });
    const id = criado.body.guest.id;

    const edicao = await request(app).put(`/api/hospedes/${id}`).set(auth(admin)).send({ cpf: CPF_INVALIDO });
    expect(edicao.status).toBe(400);

    const { rows } = await pool.query('SELECT cpf FROM hospedes WHERE id = $1', [id]);
    expect(rows[0].cpf).toBe(CPF_VALIDO_1_DIGITOS); // preservado
  });

  test('editar para um CPF já usado por OUTRO hóspede (em formato diferente) → 400', async () => {
    const admin = await criarAdminDireto(`a8${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    await request(app)
      .post('/api/hospedes')
      .set(auth(admin))
      .send({ nome: 'Hóspede A', sobrenome: proximoSobrenome(), cpf: CPF_VALIDO_1_DIGITOS });

    const hospedeB = await request(app)
      .post('/api/hospedes')
      .set(auth(admin))
      .send({ nome: 'Hóspede B', sobrenome: proximoSobrenome(), cpf: CPF_VALIDO_2_DIGITOS });

    const edicao = await request(app)
      .put(`/api/hospedes/${hospedeB.body.guest.id}`)
      .set(auth(admin))
      .send({ cpf: CPF_VALIDO_1_PONTUADO }); // tenta assumir o CPF do hóspede A, pontuado

    expect(edicao.status).toBe(400);
    expect(edicao.body.message).toMatch(/já cadastrado/i);
  });
});
