// fasthotel-app/tests/e2e/login.spec.ts
//
// Cenários 1..5: navegador real -> frontend CRA -> API real (porta 5001) ->
// PostgreSQL fasthotel_test. O usuário de teste é semeado por seed.setup.ts.

import { test, expect } from '@playwright/test';
import { USUARIO_VALIDO, SENHA_ERRADA } from './helpers/users';

const API_PORT = 5001;
const LOGIN_ENDPOINT = '/api/usuarios/login';

const emailInput = (page: import('@playwright/test').Page) => page.getByPlaceholder('E-mail');
const senhaInput = (page: import('@playwright/test').Page) => page.getByPlaceholder('Senha');
const loginButton = (page: import('@playwright/test').Page) => page.getByRole('button', { name: 'Login' });

const pathOf = (url: string) => new URL(url).pathname;

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(loginButton(page)).toBeVisible();
  // garante estado limpo entre testes
  await page.evaluate(() => localStorage.clear());
});

// =====================================================================
// 1) Login válido
// =====================================================================
test('1) login válido: chama a API, é aceito, redireciona para /home e mostra a Home', async ({ page }) => {
  await emailInput(page).fill(USUARIO_VALIDO.email);
  await senhaInput(page).fill(USUARIO_VALIDO.senha);

  const [loginResponse] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes(LOGIN_ENDPOINT) && r.request().method() === 'POST',
    ),
    loginButton(page).click(),
  ]);

  // 8) a API de login foi realmente chamada (na API de teste, porta 5001)
  expect(loginResponse.url()).toContain(`:${API_PORT}${LOGIN_ENDPOINT}`);

  // 9) o login foi aceito
  expect(loginResponse.status()).toBe(200);
  const body = await loginResponse.json();
  expect(body.message).toBe('Login bem-sucedido!');
  expect(typeof body.token).toBe('string');
  expect(body.token.split('.')).toHaveLength(3);
  expect(body.user).toMatchObject({
    nome: USUARIO_VALIDO.nome,
    email: USUARIO_VALIDO.email,
    tipo_usuario: USUARIO_VALIDO.tipo_usuario,
  });
  expect(body.user).not.toHaveProperty('senha');

  // 10) redirecionamento para /home
  await expect(page).toHaveURL(/\/home$/);

  // 11) elemento real da página Home (SideMenu é renderizado em qualquer estado)
  await expect(page.getByRole('heading', { name: 'FASTHOTEL', exact: true })).toBeVisible();
  await expect(page.getByText('Sair', { exact: true })).toBeVisible();

  // token armazenado conforme a implementação atual (localStorage 'token' + 'user_info')
  const stored = await page.evaluate(() => ({
    token: localStorage.getItem('token'),
    userInfo: localStorage.getItem('user_info'),
  }));
  expect(stored.token).toBeTruthy();
  expect(stored.userInfo).toContain(USUARIO_VALIDO.email);
});

// =====================================================================
// 2) Login com senha incorreta
// =====================================================================
test('2) senha incorreta: permanece no login e exibe "Credenciais inválidas."', async ({ page }) => {
  await emailInput(page).fill(USUARIO_VALIDO.email);
  await senhaInput(page).fill(SENHA_ERRADA);

  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes(LOGIN_ENDPOINT)),
    loginButton(page).click(),
  ]);

  expect(resp.status()).toBe(400);

  // mensagem de erro renderizada pelo frontend
  await expect(page.getByText('Credenciais inválidas.')).toBeVisible();

  // não saiu da tela de login e não autenticou
  expect(pathOf(page.url())).toBe('/');
  const token = await page.evaluate(() => localStorage.getItem('token'));
  expect(token).toBeNull();
});

// =====================================================================
// 3) E-mail inválido (validação do formulário)
// =====================================================================
test('3) e-mail inválido: validação nativa do campo impede o envio (API não é chamada)', async ({ page }) => {
  let loginRequested = false;
  page.on('request', (req) => {
    if (req.url().includes(LOGIN_ENDPOINT)) loginRequested = true;
  });

  await emailInput(page).fill('isto-nao-e-um-email');
  await senhaInput(page).fill('qualquerSenha1');
  await loginButton(page).click();

  // dá tempo de uma eventual requisição sair (não deve sair)
  await page.waitForTimeout(500);

  expect(pathOf(page.url())).toBe('/'); // continua no login
  expect(loginRequested).toBe(false); // formulário não prosseguiu

  const validity = await emailInput(page).evaluate(
    (el: HTMLInputElement) => ({ valid: el.validity.valid, typeMismatch: el.validity.typeMismatch, msg: el.validationMessage }),
  );
  expect(validity.valid).toBe(false);
  expect(validity.typeMismatch).toBe(true);
  expect(validity.msg.length).toBeGreaterThan(0);
});

// =====================================================================
// 4) Campos obrigatórios
// =====================================================================
test('4a) sem e-mail: campo obrigatório bloqueia o envio', async ({ page }) => {
  let loginRequested = false;
  page.on('request', (req) => {
    if (req.url().includes(LOGIN_ENDPOINT)) loginRequested = true;
  });

  await senhaInput(page).fill('qualquerSenha1');
  await loginButton(page).click();
  await page.waitForTimeout(500);

  expect(pathOf(page.url())).toBe('/');
  expect(loginRequested).toBe(false);

  const emailValidity = await emailInput(page).evaluate(
    (el: HTMLInputElement) => ({ valueMissing: el.validity.valueMissing, valid: el.validity.valid }),
  );
  expect(emailValidity.valueMissing).toBe(true);
  expect(emailValidity.valid).toBe(false);
});

test('4b) sem senha: campo obrigatório bloqueia o envio', async ({ page }) => {
  let loginRequested = false;
  page.on('request', (req) => {
    if (req.url().includes(LOGIN_ENDPOINT)) loginRequested = true;
  });

  await emailInput(page).fill(USUARIO_VALIDO.email);
  await loginButton(page).click();
  await page.waitForTimeout(500);

  expect(pathOf(page.url())).toBe('/');
  expect(loginRequested).toBe(false);

  const senhaValidity = await senhaInput(page).evaluate(
    (el: HTMLInputElement) => ({ valueMissing: el.validity.valueMissing, valid: el.validity.valid }),
  );
  expect(senhaValidity.valueMissing).toBe(true);
  expect(senhaValidity.valid).toBe(false);
});

test('4c) e-mail e senha vazios: envio bloqueado, nenhuma requisição de login', async ({ page }) => {
  let loginRequested = false;
  page.on('request', (req) => {
    if (req.url().includes(LOGIN_ENDPOINT)) loginRequested = true;
  });

  await loginButton(page).click();
  await page.waitForTimeout(500);

  expect(pathOf(page.url())).toBe('/');
  expect(loginRequested).toBe(false);
  const emailValid = await emailInput(page).evaluate((el: HTMLInputElement) => el.validity.valid);
  expect(emailValid).toBe(false);
});

// =====================================================================
// 5) Persistência do login
// =====================================================================
test('5) persistência: após login válido, recarregar /home mantém a sessão', async ({ page }) => {
  await emailInput(page).fill(USUARIO_VALIDO.email);
  await senhaInput(page).fill(USUARIO_VALIDO.senha);
  await Promise.all([
    page.waitForResponse((r) => r.url().includes(LOGIN_ENDPOINT) && r.status() === 200),
    loginButton(page).click(),
  ]);
  await expect(page).toHaveURL(/\/home$/);

  // token armazenado conforme implementação atual
  const token = await page.evaluate(() => localStorage.getItem('token'));
  expect(token).toBeTruthy();

  // recarregar a página mantém o usuário em /home (PrivateRoute lê localStorage)
  await page.reload();
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByRole('heading', { name: 'FASTHOTEL', exact: true })).toBeVisible();

  // acessar /home diretamente numa nova navegação também continua autenticado
  await page.goto('/home');
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByText('Sair', { exact: true })).toBeVisible();
});
