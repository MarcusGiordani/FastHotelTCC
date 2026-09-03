// fasthotel-app/tests/e2e/logout.spec.ts
//
// Cenário 6: Logout. O sistema ATUAL possui logout — botão "Sair" no SideMenu
// (src/components/SideMenu/index.tsx): remove 'token' e 'user_info' do
// localStorage e navega para '/'. Este teste exercita esse fluxo real.

import { test, expect } from '@playwright/test';
import { USUARIO_VALIDO } from './helpers/users';

const LOGIN_ENDPOINT = '/api/usuarios/login';
const pathOf = (url: string) => new URL(url).pathname;

test('6) logout: após login, "Sair" limpa a sessão e volta para a tela de login', async ({ page }) => {
  // 1) login
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.getByPlaceholder('E-mail').fill(USUARIO_VALIDO.email);
  await page.getByPlaceholder('Senha').fill(USUARIO_VALIDO.senha);
  await Promise.all([
    page.waitForResponse((r) => r.url().includes(LOGIN_ENDPOINT) && r.status() === 200),
    page.getByRole('button', { name: 'Login' }).click(),
  ]);

  // 2) está em /home autenticado
  await expect(page).toHaveURL(/\/home$/);
  expect(await page.evaluate(() => localStorage.getItem('token'))).toBeTruthy();

  // 3) executar logout
  await page.getByText('Sair', { exact: true }).click();

  // 4) retorno para a tela de login
  await expect(page).toHaveURL((url) => pathOf(url.toString()) === '/');
  await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();

  // 5) usuário não continua autenticado
  const stored = await page.evaluate(() => ({
    token: localStorage.getItem('token'),
    userInfo: localStorage.getItem('user_info'),
  }));
  expect(stored.token).toBeNull();
  expect(stored.userInfo).toBeNull();

  // e rota protegida redireciona de volta ao login
  await page.goto('/home');
  await expect(page).toHaveURL((url) => pathOf(url.toString()) === '/');
});
