// fasthotel-api/jest.integration.config.js
//
// Configuração dedicada aos testes de INTEGRAÇÃO (rota -> middleware -> controller
// -> PostgreSQL real). Separada da configuração padrão (jest.config.js) para não
// misturar com os testes unitários e para não exigir banco em `npm test`.
//
// Rodar com: npm run test:integration

module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/integration/**/*.test.js'],

  // Carrega .env.test e aplica a trava de segurança ANTES de qualquer require do app.
  setupFiles: ['<rootDir>/tests/integration/setup.env.js'],

  // Cria o banco fasthotel_test (se não existir) e aplica database/schema.sql.
  globalSetup: '<rootDir>/tests/integration/global-setup.js',

  // Serializa os arquivos de teste — todos compartilham o mesmo banco físico.
  maxWorkers: 1,

  testTimeout: 20000,
};
