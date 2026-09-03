// fasthotel-app/tests/e2e/global-teardown.ts
//
// Roda UMA vez, depois de todos os testes: remove os usuários criados pelos
// testes E2E do banco fasthotel_test (não deixa dados acumulando).

import { limparUsuariosE2E, fecharPool } from './helpers/testdb';

export default async function globalTeardown() {
  const removidos = await limparUsuariosE2E();
  console.log(`[e2e] pós-limpeza: ${removidos} usuário(s) E2E removido(s).`);
  await fecharPool();
}
