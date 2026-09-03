// fasthotel-app/tests/e2e/helpers/testdb.ts
//
// Acesso controlado ao banco de TESTE (fasthotel_test) para os testes E2E.
// Reutiliza as credenciais de fasthotel-api/.env.test (não versionado) — nada
// de senha no código. Usado apenas para semear/limpar dados de teste; o fluxo
// exercitado pelos testes passa sempre pelo frontend + API reais.

import fs from 'fs';
import path from 'path';
// pg não tem tipos instalados de propósito (mínimo de dependências); require solto.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Pool } = require('pg');

const ENV_TEST_PATH = path.resolve(__dirname, '../../../../fasthotel-api/.env.test');

function parseEnvFile(file: string): Record<string, string> {
  if (!fs.existsSync(file)) {
    throw new Error(
      `Arquivo não encontrado: ${file}\n` +
      'Copie fasthotel-api/.env.test.example para fasthotel-api/.env.test e ajuste as credenciais locais.',
    );
  }
  const out: Record<string, string> = {};
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    out[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  }
  return out;
}

const env = parseEnvFile(ENV_TEST_PATH);

export const TEST_DB_NAME = env.PGDATABASE;

// Trava de segurança: os testes E2E JAMAIS podem tocar o banco de desenvolvimento.
if (TEST_DB_NAME !== 'fasthotel_test') {
  throw new Error(
    `Execução recusada: PGDATABASE="${TEST_DB_NAME}" (esperado "fasthotel_test"). ` +
    'Os testes E2E só podem usar o banco de teste.',
  );
}

// Base para compor a URL da API de teste consumida pelo frontend nos webServers.
export const API_PORT = 5001;
export const API_BASE_URL = `http://localhost:${API_PORT}`;
export const FRONTEND_URL = 'http://localhost:3000';

let pool: any;
function getPool() {
  if (!pool) {
    pool = new Pool({
      user: env.PGUSER,
      password: env.PGPASSWORD,
      host: env.PGHOST,
      port: Number(env.PGPORT),
      database: TEST_DB_NAME,
      max: 3,
    });
  }
  return pool;
}

// Prefixo único dos e-mails criados pelos testes E2E — usado para limpeza cirúrgica.
export const E2E_EMAIL_DOMAIN = 'e2e.fasthotel.test';
export const isE2EEmail = (email: string) => email.endsWith(`@${E2E_EMAIL_DOMAIN}`);

/** Remove somente os usuários criados pelos testes E2E (nunca a tabela). */
export async function limparUsuariosE2E(): Promise<number> {
  const res = await getPool().query(
    `DELETE FROM usuarios WHERE email LIKE $1`,
    [`%@${E2E_EMAIL_DOMAIN}`],
  );
  return res.rowCount ?? 0;
}

/** Consulta direta ao Postgres de teste — para asserções fora do navegador. */
export async function contarUsuarioPorEmail(email: string): Promise<number> {
  const res = await getPool().query(
    'SELECT COUNT(*)::int AS n FROM usuarios WHERE email = $1',
    [email],
  );
  return res.rows[0].n as number;
}

export async function fecharPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}
