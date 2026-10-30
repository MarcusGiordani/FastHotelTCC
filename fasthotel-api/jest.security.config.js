// fasthotel-api/jest.security.config.js
//
// Configuração dedicada aos TESTES DE SEGURANÇA (IDOR, senhas/criptografia,
// injeção SQL e bots/rate limiting). Mesmo banco de teste real (fasthotel_test)
// usado pela integração, mas com variáveis de ambiente próprias (ver
// tests/security/setup.env.js), para poder configurar limites baixos de
// rate limiting sem afetar tests/integration.
//
// Rodar com: npm run test:security

module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/security/**/*.test.js'],
  // bots.test.js roda em processo/config separado (jest.security.bots.config.js),
  // com seus próprios limites baixos de rate limiting — ver esse arquivo.
  testPathIgnorePatterns: ['/node_modules/', 'tests/security/bots.test.js'],

  setupFiles: ['<rootDir>/tests/security/setup.env.js'],

  // Reaproveita o globalSetup da integração: cria o banco fasthotel_test (se
  // não existir) e aplica database/schema.sql. É idempotente.
  globalSetup: '<rootDir>/tests/integration/global-setup.js',

  // Mesmo banco físico compartilhado entre os arquivos de teste — serializa.
  maxWorkers: 1,

  testTimeout: 20000,
};
