// fasthotel-api/tests/integration/inventory.integration.test.js
//
// Testes de integração REAIS (Supertest -> app.js -> rotas reais -> middlewares
// reais -> controllers reais -> PostgreSQL "fasthotel_test" real) do módulo de
// Controle de Estoque.

const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../../app');
const pool = require('../../config/db');

const EMAIL_SUFFIX = '@stock.fasthotel.test';
const PRODUCT_PREFIX = 'E2E-Produto-';

const limparDados = async () => {
  await pool.query(`DELETE FROM movimentacoes_estoque WHERE produto_id IN (SELECT id FROM produtos WHERE nome LIKE $1)`, [`${PRODUCT_PREFIX}%`]);
  await pool.query('DELETE FROM produtos WHERE nome LIKE $1', [`${PRODUCT_PREFIX}%`]);
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

// Helpers --------------------------------------------------------------

const auth = (token) => ({ 'x-auth-token': token });
let contador = 0;

async function criarAdminDireto(email, senha) {
  const hash = await bcrypt.hash(senha, 10);
  await pool.query(
    `INSERT INTO usuarios (nome, email, senha, tipo_usuario) VALUES ($1, $2, $3, 'admin')`,
    ['Admin Estoque', email, hash],
  );
  const login = await request(app).post('/api/usuarios/login').send({ email, senha });
  return login.body.token;
}

async function criarClienteELogar(email, senha) {
  await request(app).post('/api/usuarios').send({ nome: 'Cliente Estoque', email, senha });
  const login = await request(app).post('/api/usuarios/login').send({ email, senha });
  return login.body;
}

function nomeProduto() {
  contador += 1;
  return `${PRODUCT_PREFIX}${Date.now()}-${contador}`;
}

async function criarProduto(adminToken, overrides = {}) {
  const res = await request(app)
    .post('/api/estoque/produtos')
    .set(auth(adminToken))
    .send({ nome: nomeProduto(), unidade_medida: 'un', categoria: 'Limpeza', estoque_minimo: 5, ...overrides });
  expect(res.status).toBe(201);
  return res.body.product;
}

async function entrada(adminToken, produtoId, quantidade) {
  return request(app).post(`/api/estoque/produtos/${produtoId}/entrada`).set(auth(adminToken)).send({ quantidade });
}

async function saida(adminToken, produtoId, quantidade) {
  return request(app).post(`/api/estoque/produtos/${produtoId}/saida`).set(auth(adminToken)).send({ quantidade });
}

// =========================================================================
// Cadastro, edição e desativação de produtos
// =========================================================================
describe('Cadastro, edição e desativação de produtos', () => {
  test('cadastra um produto com quantidade_atual = 0, independente do que for enviado', async () => {
    const adminToken = await criarAdminDireto(`admin1${Date.now()}${EMAIL_SUFFIX}`, 'senha123');

    const res = await request(app)
      .post('/api/estoque/produtos')
      .set(auth(adminToken))
      .send({ nome: nomeProduto(), unidade_medida: 'un', estoque_minimo: 3, quantidade_atual: 999 });

    expect(res.status).toBe(201);
    expect(Number(res.body.product.quantidade_atual)).toBe(0);
  });

  test('nome ou unidade_medida ausentes → 400', async () => {
    const adminToken = await criarAdminDireto(`admin2${Date.now()}${EMAIL_SUFFIX}`, 'senha123');

    const semNome = await request(app).post('/api/estoque/produtos').set(auth(adminToken)).send({ unidade_medida: 'un' });
    expect(semNome.status).toBe(400);

    const semUnidade = await request(app).post('/api/estoque/produtos').set(auth(adminToken)).send({ nome: nomeProduto() });
    expect(semUnidade.status).toBe(400);
  });

  test('edição altera nome/categoria/estoque_minimo mas NUNCA quantidade_atual, mesmo se enviada', async () => {
    const adminToken = await criarAdminDireto(`admin3${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const produto = await criarProduto(adminToken);
    await entrada(adminToken, produto.id, 20); // quantidade_atual vira 20

    const res = await request(app)
      .put(`/api/estoque/produtos/${produto.id}`)
      .set(auth(adminToken))
      .send({ categoria: 'Nova Categoria', estoque_minimo: 8, quantidade_atual: 0 });

    expect(res.status).toBe(200);
    expect(res.body.product.categoria).toBe('Nova Categoria');
    expect(Number(res.body.product.estoque_minimo)).toBe(8);
    expect(Number(res.body.product.quantidade_atual)).toBe(20); // não foi zerada
  });

  test('desativação preserva o produto e o histórico; produto some da listagem padrão', async () => {
    const adminToken = await criarAdminDireto(`admin4${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const produto = await criarProduto(adminToken);
    await entrada(adminToken, produto.id, 10);

    const desativar = await request(app).put(`/api/estoque/produtos/${produto.id}/desativar`).set(auth(adminToken));
    expect(desativar.status).toBe(200);
    expect(desativar.body.product.ativo).toBe(false);

    const listaPadrao = await request(app).get('/api/estoque/produtos').set(auth(adminToken));
    expect(listaPadrao.body.find((p) => p.id === produto.id)).toBeUndefined();

    const listaInativos = await request(app).get('/api/estoque/produtos').query({ situacao: 'inativo' }).set(auth(adminToken));
    expect(listaInativos.body.find((p) => p.id === produto.id)).toBeDefined();

    const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM movimentacoes_estoque WHERE produto_id = $1', [produto.id]);
    expect(rows[0].n).toBe(1); // histórico preservado
  });
});

// =========================================================================
// Entrada e saída de estoque
// =========================================================================
describe('Entrada e saída de estoque', () => {
  test('entrada soma a quantidade e grava o funcionário responsável', async () => {
    const adminToken = await criarAdminDireto(`admin5${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const produto = await criarProduto(adminToken);

    const res = await entrada(adminToken, produto.id, 15);

    expect(res.status).toBe(201);
    expect(Number(res.body.product.quantidade_atual)).toBe(15);
    expect(res.body.movimentacao.tipo).toBe('entrada');
    expect(res.body.movimentacao.funcionario_id).not.toBeNull();
  });

  test('saída subtrai a quantidade quando há saldo suficiente', async () => {
    const adminToken = await criarAdminDireto(`admin6${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const produto = await criarProduto(adminToken);
    await entrada(adminToken, produto.id, 20);

    const res = await saida(adminToken, produto.id, 7);

    expect(res.status).toBe(201);
    expect(Number(res.body.product.quantidade_atual)).toBe(13);
  });

  test('bloqueia saída maior que o estoque disponível (sem deixar negativo)', async () => {
    const adminToken = await criarAdminDireto(`admin7${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const produto = await criarProduto(adminToken);
    await entrada(adminToken, produto.id, 5);

    const res = await saida(adminToken, produto.id, 6);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/insuficiente/i);

    const { rows } = await pool.query('SELECT quantidade_atual FROM produtos WHERE id = $1', [produto.id]);
    expect(Number(rows[0].quantidade_atual)).toBe(5);
  });

  test('bloqueia quantidade zero ou negativa em entrada e saída', async () => {
    const adminToken = await criarAdminDireto(`admin8${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const produto = await criarProduto(adminToken);

    const zeroEntrada = await entrada(adminToken, produto.id, 0);
    expect(zeroEntrada.status).toBe(400);

    const negativaSaida = await saida(adminToken, produto.id, -3);
    expect(negativaSaida.status).toBe(400);
  });

  test('produto desativado não aceita entrada nem saída', async () => {
    const adminToken = await criarAdminDireto(`admin9${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const produto = await criarProduto(adminToken);
    await entrada(adminToken, produto.id, 10);
    await request(app).put(`/api/estoque/produtos/${produto.id}/desativar`).set(auth(adminToken));

    const tentativaEntrada = await entrada(adminToken, produto.id, 5);
    expect(tentativaEntrada.status).toBe(400);
    expect(tentativaEntrada.body.message).toMatch(/desativado/i);

    const tentativaSaida = await saida(adminToken, produto.id, 1);
    expect(tentativaSaida.status).toBe(400);
  });
});

// =========================================================================
// Movimentações simultâneas
// =========================================================================
describe('Movimentações simultâneas não geram estoque negativo', () => {
  test('duas saídas concorrentes que juntas excedem o saldo: só uma é aceita', async () => {
    const adminToken = await criarAdminDireto(`admin10${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const produto = await criarProduto(adminToken);
    await entrada(adminToken, produto.id, 10);

    const [r1, r2] = await Promise.all([
      saida(adminToken, produto.id, 6),
      saida(adminToken, produto.id, 6),
    ]);

    const statuses = [r1.status, r2.status].sort();
    expect(statuses).toEqual([201, 400]); // exatamente uma passa, a outra é rejeitada

    const { rows } = await pool.query('SELECT quantidade_atual FROM produtos WHERE id = $1', [produto.id]);
    const quantidadeFinal = Number(rows[0].quantidade_atual);
    expect(quantidadeFinal).toBe(4); // 10 - 6 (só a que teve sucesso)
    expect(quantidadeFinal).toBeGreaterThanOrEqual(0);

    const { rows: movimentacoes } = await pool.query(
      'SELECT COUNT(*)::int AS n FROM movimentacoes_estoque WHERE produto_id = $1 AND tipo = $2',
      [produto.id, 'saida'],
    );
    expect(movimentacoes[0].n).toBe(1); // só a saída bem-sucedida foi registrada
  });

  test('várias entradas concorrentes somam corretamente (sem perda por condição de corrida)', async () => {
    const adminToken = await criarAdminDireto(`admin11${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const produto = await criarProduto(adminToken);

    const respostas = await Promise.all([
      entrada(adminToken, produto.id, 5),
      entrada(adminToken, produto.id, 5),
      entrada(adminToken, produto.id, 5),
      entrada(adminToken, produto.id, 5),
    ]);
    respostas.forEach((r) => expect(r.status).toBe(201));

    const { rows } = await pool.query('SELECT quantidade_atual FROM produtos WHERE id = $1', [produto.id]);
    expect(Number(rows[0].quantidade_atual)).toBe(20);
  });
});

// =========================================================================
// Histórico de movimentações
// =========================================================================
describe('Histórico de movimentações', () => {
  test('lista todas as movimentações do produto, mais recente primeiro, com filtros', async () => {
    const adminToken = await criarAdminDireto(`admin12${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const produto = await criarProduto(adminToken);
    await entrada(adminToken, produto.id, 10);
    await saida(adminToken, produto.id, 3);

    const historico = await request(app).get('/api/estoque/movimentacoes').query({ produto_id: produto.id }).set(auth(adminToken));
    expect(historico.status).toBe(200);
    expect(historico.body).toHaveLength(2);
    expect(historico.body[0].tipo).toBe('saida'); // mais recente primeiro
    expect(historico.body[1].tipo).toBe('entrada');

    const apenasEntradas = await request(app)
      .get('/api/estoque/movimentacoes')
      .query({ produto_id: produto.id, tipo: 'entrada' })
      .set(auth(adminToken));
    expect(apenasEntradas.body).toHaveLength(1);
    expect(apenasEntradas.body[0].tipo).toBe('entrada');
  });
});

// =========================================================================
// Alertas de estoque baixo / dashboard
// =========================================================================
describe('Indicadores e alertas de estoque', () => {
  test('resumo conta produtos sem estoque e com estoque baixo corretamente', async () => {
    const adminToken = await criarAdminDireto(`admin13${Date.now()}${EMAIL_SUFFIX}`, 'senha123');

    const semEstoque = await criarProduto(adminToken, { estoque_minimo: 5 }); // fica em 0
    const baixo = await criarProduto(adminToken, { estoque_minimo: 10 });
    await entrada(adminToken, baixo.id, 4); // 4 <= 10 -> baixo
    const normal = await criarProduto(adminToken, { estoque_minimo: 5 });
    await entrada(adminToken, normal.id, 50); // 50 > 5 -> normal

    const resumo = await request(app).get('/api/estoque/resumo').set(auth(adminToken));
    expect(resumo.status).toBe(200);
    expect(resumo.body.sem_estoque).toBeGreaterThanOrEqual(1);
    expect(resumo.body.estoque_baixo).toBeGreaterThanOrEqual(1);

    const listaBaixo = await request(app).get('/api/estoque/produtos').query({ situacao: 'baixo' }).set(auth(adminToken));
    expect(listaBaixo.body.map((p) => p.id)).toContain(baixo.id);
    expect(listaBaixo.body.map((p) => p.id)).not.toContain(normal.id);

    const listaSemEstoque = await request(app).get('/api/estoque/produtos').query({ situacao: 'sem_estoque' }).set(auth(adminToken));
    expect(listaSemEstoque.body.map((p) => p.id)).toContain(semEstoque.id);
  });

  test('pesquisa por nome encontra o produto certo', async () => {
    const adminToken = await criarAdminDireto(`admin14${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const nome = nomeProduto();
    const res = await request(app).post('/api/estoque/produtos').set(auth(adminToken)).send({ nome, unidade_medida: 'un' });

    const busca = await request(app).get('/api/estoque/produtos').query({ nome: nome.slice(-8) }).set(auth(adminToken));
    expect(busca.body.map((p) => p.id)).toContain(res.body.product.id);
  });
});

// =========================================================================
// Autenticação e permissões
// =========================================================================
describe('Autorização das rotas de estoque', () => {
  test('sem token → 401 nas rotas principais', async () => {
    const respostas = await Promise.all([
      request(app).get('/api/estoque/produtos'),
      request(app).get('/api/estoque/resumo'),
      request(app).get('/api/estoque/movimentacoes'),
      request(app).post('/api/estoque/produtos').send({ nome: 'x', unidade_medida: 'un' }),
    ]);
    respostas.forEach((r) => expect(r.status).toBe(401));
  });

  test('cliente autenticado → 403 nas rotas principais', async () => {
    const cliente = await criarClienteELogar(`cliente1${Date.now()}${EMAIL_SUFFIX}`, 'senha123');

    const respostas = await Promise.all([
      request(app).get('/api/estoque/produtos').set(auth(cliente.token)),
      request(app).get('/api/estoque/resumo').set(auth(cliente.token)),
      request(app).post('/api/estoque/produtos').set(auth(cliente.token)).send({ nome: 'x', unidade_medida: 'un' }),
    ]);
    respostas.forEach((r) => expect(r.status).toBe(403));
  });

  test('recepcionista tem acesso completo (cadastrar, movimentar, consultar)', async () => {
    const adminToken = await criarAdminDireto(`admin15${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const staff = await request(app)
      .post('/api/usuarios/staff')
      .set(auth(adminToken))
      .send({ nome: 'Recep Estoque', email: `recep1${Date.now()}${EMAIL_SUFFIX}`, senha: 'senha123', tipo_usuario: 'recepcionista' });
    const login = await request(app).post('/api/usuarios/login').send({ email: staff.body.user.email, senha: 'senha123' });

    const produto = await criarProduto(login.body.token);
    const mov = await entrada(login.body.token, produto.id, 5);

    expect(mov.status).toBe(201);
  });
});
