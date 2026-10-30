// fasthotel-api/scripts/apply-schema.js
//
// Aplica database/schema.sql no banco apontado pelas variáveis de ambiente
// padrão do projeto (PGUSER/PGHOST/PGDATABASE/PGPASSWORD/PGPORT — as mesmas
// usadas por config/db.js). É seguro rodar em todo deploy: o schema.sql é
// 100% idempotente (CREATE TABLE/COLUMN IF NOT EXISTS), nunca apaga dados.
//
// Uso: node scripts/apply-schema.js
// Pensado para rodar como parte do build do serviço de hospedagem (Render),
// nunca contra o banco de testes (fasthotel_test) nem a partir do GitHub
// Actions — aqui não trafega nenhuma credencial de produção.

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function main() {
  const dbName = process.env.PGDATABASE;
  if (!dbName) {
    throw new Error('PGDATABASE não definido — configure as variáveis de ambiente do banco antes de rodar este script.');
  }

  const client = new Client({
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    database: dbName,
    password: process.env.PGPASSWORD,
    port: process.env.PGPORT,
    ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : undefined,
  });

  const schemaSql = fs.readFileSync(path.resolve(__dirname, '../database/schema.sql'), 'utf8');

  await client.connect();
  try {
    await client.query(schemaSql);
    console.log(`[db:migrate] schema.sql aplicado com sucesso em "${dbName}".`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('[db:migrate] falhou ao aplicar schema.sql:', err.message);
  process.exit(1);
});
