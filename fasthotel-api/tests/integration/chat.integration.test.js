// fasthotel-api/tests/integration/chat.integration.test.js
//
// Testes de integração REAIS (Supertest -> app.js -> rotas reais -> middlewares
// reais -> controllers reais -> PostgreSQL "fasthotel_test" real) para a
// correção do chat: a tabela "conversas_chat" não tinha as colunas "status" e
// "data_fim", que chatController sempre dependeu (erro "coluna cc.status não
// existe" encontrado na Etapa 5 de validação). Cobre listagem, criação/dedup,
// mensagens (histórico + marcação como lida) e permissões.

const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../../app');
const pool = require('../../config/db');

const EMAIL_SUFFIX = '@chat.fasthotel.test';
const GUEST_MARKER = 'CHAT-';

const limparDados = async () => {
  await pool.query(
    `DELETE FROM mensagens_chat WHERE conversa_id IN (
       SELECT id FROM conversas_chat WHERE hospede_id IN (SELECT id FROM hospedes WHERE cpf LIKE $1)
     )`,
    [`${GUEST_MARKER}%`],
  );
  await pool.query(
    `DELETE FROM conversas_chat WHERE hospede_id IN (SELECT id FROM hospedes WHERE cpf LIKE $1)`,
    [`${GUEST_MARKER}%`],
  );
  await pool.query('DELETE FROM hospedes WHERE cpf LIKE $1', [`${GUEST_MARKER}%`]);
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

// Helpers ------------------------------------------------------------------

const auth = (token) => ({ 'x-auth-token': token });
let contador = 0;

async function criarAdminDireto(email, senha) {
  const hash = await bcrypt.hash(senha, 10);
  await pool.query(
    `INSERT INTO usuarios (nome, email, senha, tipo_usuario) VALUES ($1, $2, $3, 'admin')`,
    ['Admin Chat', email, hash],
  );
  const login = await request(app).post('/api/usuarios/login').send({ email, senha });
  return { token: login.body.token, id: login.body.user.id };
}

async function criarClienteELogar(email, senha) {
  await request(app).post('/api/usuarios').send({ nome: 'Cliente Chat', email, senha });
  const login = await request(app).post('/api/usuarios/login').send({ email, senha });
  return { token: login.body.token, id: login.body.user.id };
}

async function criarHospede() {
  contador += 1;
  const { rows } = await pool.query(
    `INSERT INTO hospedes (nome, sobrenome, cpf) VALUES ($1, $2, $3) RETURNING id`,
    ['Hóspede', `Chat${contador}`, `${GUEST_MARKER}${contador}`],
  );
  return rows[0].id;
}

// =========================================================================
// Correção do bug "coluna cc.status não existe"
// =========================================================================
describe('Correção do chat — colunas status/data_fim', () => {
  test('GET /api/chat não falha mais e devolve status/data_fim de cada conversa', async () => {
    const admin = await criarAdminDireto(`a1${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const hospedeId = await criarHospede();
    const criada = await request(app).post('/api/chat').set(auth(admin.token)).send({ hospede_id: hospedeId });
    expect(criada.status).toBe(201);

    const lista = await request(app).get('/api/chat').set(auth(admin.token));
    expect(lista.status).toBe(200);
    const conversa = lista.body.find((c) => c.conversa_id === criada.body.conversa.id);
    expect(conversa).toBeDefined();
    expect(conversa.status).toBe('aberta');
    expect(conversa.data_fim).toBeNull();
  });

  test('conversa recém-criada direto no banco (sem status explícito) usa o default "aberta"', async () => {
    const hospedeId = await criarHospede();
    const { rows } = await pool.query(
      `INSERT INTO conversas_chat (hospede_id) VALUES ($1) RETURNING status, data_fim`,
      [hospedeId],
    );
    expect(rows[0].status).toBe('aberta');
    expect(rows[0].data_fim).toBeNull();
  });
});

// =========================================================================
// Criação de conversa: reaproveita conversa aberta (evita duplicar)
// =========================================================================
describe('POST /api/chat — criação e deduplicação', () => {
  test('duas chamadas para o mesmo hóspede não criam duas conversas abertas', async () => {
    const admin = await criarAdminDireto(`a2${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const hospedeId = await criarHospede();

    const primeira = await request(app).post('/api/chat').set(auth(admin.token)).send({ hospede_id: hospedeId });
    expect(primeira.status).toBe(201);

    const segunda = await request(app).post('/api/chat').set(auth(admin.token)).send({ hospede_id: hospedeId });
    expect(segunda.status).toBe(200);
    expect(segunda.body.conversa.id).toBe(primeira.body.conversa.id);

    const { rows } = await pool.query('SELECT COUNT(*) FROM conversas_chat WHERE hospede_id = $1', [hospedeId]);
    expect(Number(rows[0].count)).toBe(1);
  });

  test('sem hospede_id → 400', async () => {
    const admin = await criarAdminDireto(`a3${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const res = await request(app).post('/api/chat').set(auth(admin.token)).send({});
    expect(res.status).toBe(400);
  });
});

// =========================================================================
// Mensagens: histórico (ordem) e marcação como lida
// =========================================================================
describe('Mensagens — histórico e leitura', () => {
  test('GET /api/chat/:conversaId/mensagens devolve o histórico em ordem cronológica', async () => {
    const admin = await criarAdminDireto(`a4${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const hospedeId = await criarHospede();
    const conversa = await request(app).post('/api/chat').set(auth(admin.token)).send({ hospede_id: hospedeId });
    const conversaId = conversa.body.conversa.id;

    // Mensagens são gravadas via Socket.IO em produção (server.js), mas a tabela
    // é a mesma — inserir direto aqui testa a leitura (histórico) isoladamente.
    await pool.query(
      `INSERT INTO mensagens_chat (conversa_id, remetente_tipo, remetente_id_interno, conteudo, data_envio)
       VALUES ($1, 'hospede', $2, 'Primeira mensagem', NOW() - INTERVAL '1 minute')`,
      [conversaId, hospedeId],
    );
    await pool.query(
      `INSERT INTO mensagens_chat (conversa_id, remetente_tipo, remetente_id_interno, conteudo)
       VALUES ($1, 'usuario', $2, 'Segunda mensagem')`,
      [conversaId, admin.id],
    );

    const res = await request(app).get(`/api/chat/${conversaId}/mensagens`).set(auth(admin.token));
    expect(res.status).toBe(200);
    expect(res.body.map((m) => m.conteudo)).toEqual(['Primeira mensagem', 'Segunda mensagem']);
  });

  test('PUT /:conversaId/mensagens/lida marca como lidas somente as mensagens do remetente informado', async () => {
    const admin = await criarAdminDireto(`a5${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const hospedeId = await criarHospede();
    const conversa = await request(app).post('/api/chat').set(auth(admin.token)).send({ hospede_id: hospedeId });
    const conversaId = conversa.body.conversa.id;

    await pool.query(
      `INSERT INTO mensagens_chat (conversa_id, remetente_tipo, remetente_id_interno, conteudo)
       VALUES ($1, 'hospede', $2, 'Do hóspede')`,
      [conversaId, hospedeId],
    );
    await pool.query(
      `INSERT INTO mensagens_chat (conversa_id, remetente_tipo, remetente_id_interno, conteudo)
       VALUES ($1, 'usuario', $2, 'Do atendente')`,
      [conversaId, admin.id],
    );

    const res = await request(app)
      .put(`/api/chat/${conversaId}/mensagens/lida`)
      .set(auth(admin.token))
      .send({ remetente_tipo_lido: 'hospede' });
    expect(res.status).toBe(200);

    const { rows } = await pool.query(
      `SELECT remetente_tipo, lida FROM mensagens_chat WHERE conversa_id = $1 ORDER BY remetente_tipo`,
      [conversaId],
    );
    expect(rows.find((r) => r.remetente_tipo === 'hospede').lida).toBe(true);
    expect(rows.find((r) => r.remetente_tipo === 'usuario').lida).toBe(false);
  });
});

// =========================================================================
// Permissões (comportamento pré-existente, confirmado ainda válido)
// =========================================================================
describe('Permissões do chat', () => {
  test('sem token → 401 em todas as rotas principais', async () => {
    const semToken1 = await request(app).get('/api/chat');
    expect(semToken1.status).toBe(401);

    const semToken2 = await request(app).post('/api/chat').send({ hospede_id: 1 });
    expect(semToken2.status).toBe(401);
  });

  test('cliente autenticado não acessa a listagem de conversas (recurso interno da recepção) → 403', async () => {
    const cliente = await criarClienteELogar(`c1${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const res = await request(app).get('/api/chat').set(auth(cliente.token));
    expect(res.status).toBe(403);
  });

  test('recepcionista acessa a listagem normalmente', async () => {
    const admin = await criarAdminDireto(`a6${Date.now()}${EMAIL_SUFFIX}`, 'senha123');
    const emailRecep = `r1${Date.now()}${EMAIL_SUFFIX}`;
    await request(app)
      .post('/api/usuarios/staff')
      .set(auth(admin.token))
      .send({ nome: 'Recep Chat', email: emailRecep, senha: 'senha123', tipo_usuario: 'recepcionista' });
    const login = await request(app).post('/api/usuarios/login').send({ email: emailRecep, senha: 'senha123' });

    const res = await request(app).get('/api/chat').set(auth(login.body.token));
    expect(res.status).toBe(200);
  });
});
