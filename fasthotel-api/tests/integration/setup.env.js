// fasthotel-api/tests/integration/setup.env.js
//
// setupFiles do Jest (integração): roda em cada worker ANTES do arquivo de teste
// ser carregado — ou seja, antes de `require('../../app')` e, portanto, antes de
// `config/db.js` criar o Pool. É aqui que as credenciais de teste entram no
// process.env e onde travamos a execução contra qualquer banco que não seja o de teste.

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

// --- Trava de segurança: NUNCA rodar integração fora do banco de teste ---
const EXPECTED_DB = 'fasthotel_test';
if (process.env.PGDATABASE !== EXPECTED_DB) {
  throw new Error(
    `Execução recusada: PGDATABASE="${process.env.PGDATABASE}" (esperado "${EXPECTED_DB}"). ` +
    'A suíte de integração faz DELETE/INSERT e só pode tocar o banco de teste.'
  );
}

process.env.NODE_ENV = 'test';

// Os testes de integração funcionais (não são os de segurança) criam e autenticam
// dezenas de usuários descartáveis por arquivo, no mesmo processo Node, o que
// tropeçaria no rate limiting real de login/cadastro (middleware/rateLimiter.js).
// Mantemos o middleware ativo (não é mockado) mas com um teto alto, só neste
// ambiente funcional — o comportamento real de bloqueio é verificado à parte,
// com limites baixos, em tests/security/bots.test.js.
process.env.RATE_LIMIT_LOGIN_MAX = process.env.RATE_LIMIT_LOGIN_MAX || '100000';
process.env.RATE_LIMIT_REGISTER_MAX = process.env.RATE_LIMIT_REGISTER_MAX || '100000';
