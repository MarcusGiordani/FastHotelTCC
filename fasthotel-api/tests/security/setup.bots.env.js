// fasthotel-api/tests/security/setup.bots.env.js
//
// setupFiles exclusivo de bots.test.js (ver jest.security.bots.config.js).
// Mesma trava de banco de tests/security/setup.env.js, mas aqui os limites de
// rate limiting ficam BAIXOS de propósito, para que o HTTP 429 real seja
// disparado de forma determinística com poucas requisições — exercitando o
// middleware de verdade (middleware/rateLimiter.js), não uma simulação.
//
// Isolado em sua própria config/processo Jest para não contaminar
// idor.test.js/passwords.test.js/injection.test.js, que fazem muito mais de 5
// chamadas de login/cadastro cada um.

const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../../.env.test');

if (!fs.existsSync(envPath)) {
  throw new Error(
    'fasthotel-api/.env.test não encontrado. Copie .env.test.example para .env.test ' +
    'e ajuste as credenciais do PostgreSQL local.'
  );
}

require('dotenv').config({ path: envPath });

const EXPECTED_DB = 'fasthotel_test';
if (process.env.PGDATABASE !== EXPECTED_DB) {
  throw new Error(
    `Execução recusada: PGDATABASE="${process.env.PGDATABASE}" (esperado "${EXPECTED_DB}"). ` +
    'A suíte de segurança faz DELETE/INSERT e só pode tocar o banco de teste.'
  );
}

process.env.NODE_ENV = 'test';

process.env.RATE_LIMIT_LOGIN_MAX = '5';
process.env.RATE_LIMIT_LOGIN_WINDOW_MS = String(60 * 1000);
process.env.RATE_LIMIT_REGISTER_MAX = '5';
process.env.RATE_LIMIT_REGISTER_WINDOW_MS = String(60 * 1000);
