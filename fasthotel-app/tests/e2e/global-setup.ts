// fasthotel-app/tests/e2e/global-setup.ts
//
// Roda UMA vez, antes de subir os servidores e os testes:
//   1. Garante que o banco fasthotel_test existe e tem o schema aplicado
//      (reutiliza o mesmo globalSetup dos testes de integração do backend).
//   2. Remove eventuais usuários E2E deixados por execuções anteriores.

import { limparUsuariosE2E, fecharPool, TEST_DB_NAME } from './helpers/testdb';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const ensureTestDatabase = require('../../../fasthotel-api/tests/integration/global-setup.js');

export default async function globalSetup() {
  if (TEST_DB_NAME !== 'fasthotel_test') {
    throw new Error(`global-setup E2E recusado: PGDATABASE="${TEST_DB_NAME}".`);
  }

  // 1) cria o banco (se preciso) e aplica database/schema.sql — idempotente
  await ensureTestDatabase();

  // 2) limpeza defensiva de dados E2E anteriores
  const removidos = await limparUsuariosE2E();
  console.log(`[e2e] pré-limpeza: ${removidos} usuário(s) E2E removido(s) de ${TEST_DB_NAME}.`);

  await fecharPool();
}
