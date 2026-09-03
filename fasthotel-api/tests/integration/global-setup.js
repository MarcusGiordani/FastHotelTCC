// fasthotel-api/tests/integration/global-setup.js
//
// globalSetup do Jest (integração): roda UMA vez, antes de tudo.
//   1. Conecta no banco de manutenção (PGADMIN_DB, ex.: "postgres").
//   2. Cria o banco fasthotel_test se ele ainda não existir.
//   3. Aplica database/schema.sql (idempotente: CREATE TABLE IF NOT EXISTS).
//
// Não derruba nem recria o banco a cada execução — apenas garante que ele exista
// com o schema. A limpeza de dados entre testes é feita no próprio arquivo de teste.

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

module.exports = async () => {
  require('dotenv').config({ path: path.resolve(__dirname, '../../.env.test') });

  const dbName = process.env.PGDATABASE;
  if (dbName !== 'fasthotel_test') {
    throw new Error(`global-setup recusado: PGDATABASE="${dbName}" (esperado "fasthotel_test").`);
  }

  const baseConfig = {
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    host: process.env.PGHOST,
    port: process.env.PGPORT,
  };

  // 1 + 2) cria o banco de teste, se necessário
  const admin = new Client({ ...baseConfig, database: process.env.PGADMIN_DB || 'postgres' });
  await admin.connect();
  try {
    const { rowCount } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (rowCount === 0) {
      // dbName já foi validado como a constante "fasthotel_test" acima.
      await admin.query(`CREATE DATABASE ${dbName}`);
      console.log(`[integration] banco "${dbName}" criado.`);
    } else {
      console.log(`[integration] banco "${dbName}" já existe.`);
    }
  } finally {
    await admin.end();
  }

  // 3) aplica o schema
  const schemaSql = fs.readFileSync(path.resolve(__dirname, '../../database/schema.sql'), 'utf8');
  const testDb = new Client({ ...baseConfig, database: dbName });
  await testDb.connect();
  try {
    await testDb.query(schemaSql);
    console.log(`[integration] schema aplicado em "${dbName}".`);
  } finally {
    await testDb.end();
  }
};
