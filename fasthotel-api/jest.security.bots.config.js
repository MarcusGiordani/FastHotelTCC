// fasthotel-api/jest.security.bots.config.js
//
// Config dedicada a tests/security/bots.test.js (Tema 4 — rate limiting).
// Separada de jest.security.config.js porque este teste precisa de limites
// de login/cadastro BAIXOS (ver tests/security/setup.bots.env.js) para
// disparar o HTTP 429 real de forma determinística, enquanto idor/passwords/
// injection precisam de limites altos para não travar com suas dezenas de
// logins/cadastros fictícios por arquivo.
//
// Rodar com: npm run test:security (chama as duas configs em sequência)

module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/security/bots.test.js'],

  setupFiles: ['<rootDir>/tests/security/setup.bots.env.js'],

  globalSetup: '<rootDir>/tests/integration/global-setup.js',

  maxWorkers: 1,
  testTimeout: 20000,
};
