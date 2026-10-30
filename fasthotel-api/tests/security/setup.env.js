// fasthotel-api/tests/security/setup.env.js
//
// setupFiles do Jest (segurança: idor/passwords/injection), roda antes de
// qualquer require('../../app') — igual a tests/integration/setup.env.js,
// mesmo banco de teste (fasthotel_test), mesma trava de segurança.
//
// Estes três temas não testam rate limiting, mas cada um cria vários
// usuários/logins fictícios por arquivo. Por isso usamos o MESMO ajuste de
// tests/integration/setup.env.js: limites de login/cadastro altos, só para
// não travar nestes testes (o bloqueio real e determinístico é testado à
// parte, com limites baixos, em tests/security/bots.test.js — ver
// tests/security/setup.bots.env.js).

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

process.env.RATE_LIMIT_LOGIN_MAX = process.env.RATE_LIMIT_LOGIN_MAX || '100000';
process.env.RATE_LIMIT_REGISTER_MAX = process.env.RATE_LIMIT_REGISTER_MAX || '100000';
