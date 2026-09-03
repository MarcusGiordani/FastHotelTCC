// fasthotel-app/playwright.config.ts
//
// Testes de SISTEMA / E2E do FastHotel: navegador real -> frontend real (CRA)
// -> API real -> PostgreSQL fasthotel_test.
//
// - Backend e frontend são iniciados automaticamente pelo Playwright (webServer),
//   sem depender de nada aberto manualmente.
// - O backend E2E roda numa porta isolada (5001) apontando para o banco de TESTE.
// - O frontend E2E é forçado a falar com essa API (REACT_APP_API_URL).
// - Não conflita com o Jest do backend nem com o `react-scripts test` (pasta e
//   runner próprios).

import { defineConfig, devices } from '@playwright/test';
import path from 'path';

const FRONTEND_PORT = 3000;
const API_PORT = 5001;
const API_URL = `http://localhost:${API_PORT}`;
const FRONTEND_URL = `http://localhost:${FRONTEND_PORT}`;

const API_DIR = path.resolve(__dirname, '../fasthotel-api');
const ENV_TEST_FILE = path.join(API_DIR, '.env.test');

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1, // servidores e banco de teste compartilhados -> execução serial
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 10_000 },

  reporter: [['list'], ['html', { open: 'never' }]],

  globalSetup: './tests/e2e/global-setup.ts',
  globalTeardown: './tests/e2e/global-teardown.ts',

  use: {
    baseURL: FRONTEND_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'setup',
      testMatch: /seed\.setup\.ts$/,
    },
    {
      name: 'chromium',
      testMatch: /.*\.spec\.ts$/,
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: [
    {
      // API de teste: dotenv pré-carrega fasthotel-api/.env.test; PORT/PGDATABASE
      // são forçados aqui para garantir isolamento mesmo se o .env.test faltar.
      command: 'node -r dotenv/config server.js',
      cwd: API_DIR,
      env: {
        DOTENV_CONFIG_PATH: ENV_TEST_FILE,
        PORT: String(API_PORT),
        PGDATABASE: 'fasthotel_test',
      },
      url: `${API_URL}/`,
      reuseExistingServer: false,
      stdout: 'pipe',
      stderr: 'pipe',
      timeout: 60_000,
    },
    {
      // Frontend CRA apontando para a API de teste (variável de ambiente vence o .env).
      command: 'npm start',
      cwd: __dirname,
      env: {
        BROWSER: 'none',
        PORT: String(FRONTEND_PORT),
        REACT_APP_API_URL: `${API_URL}/api`,
      },
      url: FRONTEND_URL,
      reuseExistingServer: false,
      stdout: 'pipe',
      stderr: 'pipe',
      timeout: 180_000,
    },
  ],
});
