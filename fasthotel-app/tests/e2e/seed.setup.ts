// fasthotel-app/tests/e2e/seed.setup.ts
//
// "Setup project" do Playwright: roda depois que backend e frontend já estão no ar
// e ANTES dos testes E2E (ver `dependencies` no playwright.config.ts).
//
// Semeia o usuário de teste chamando a ROTA REAL de cadastro da API de teste
// (POST /api/usuarios -> controller real -> PostgreSQL fasthotel_test).
// Nada de INSERT manual nem hash hardcoded.

import { test as setup, expect } from '@playwright/test';
import { API_BASE_URL, contarUsuarioPorEmail, isE2EEmail } from './helpers/testdb';
import { USUARIO_VALIDO } from './helpers/users';

setup('semear usuário de teste no fasthotel_test', async ({ request }) => {
  // trava extra: só e-mails do domínio E2E
  expect(isE2EEmail(USUARIO_VALIDO.email)).toBe(true);

  const res = await request.post(`${API_BASE_URL}/api/usuarios`, {
    data: {
      nome: USUARIO_VALIDO.nome,
      email: USUARIO_VALIDO.email,
      senha: USUARIO_VALIDO.senha,
      tipo_usuario: USUARIO_VALIDO.tipo_usuario,
    },
  });

  // 201 = criado agora; 400 "Email já cadastrado." = sobra tolerável de execução anterior
  if (res.status() !== 201) {
    const body = await res.json().catch(() => ({}));
    expect(
      res.status() === 400 && body?.message === 'Email já cadastrado.',
      `Falha ao semear usuário E2E (HTTP ${res.status()}): ${JSON.stringify(body)}`,
    ).toBe(true);
  }

  // confirmação direta no banco de teste
  expect(await contarUsuarioPorEmail(USUARIO_VALIDO.email)).toBe(1);
});
