// fasthotel-api/jest.config.js
//
// Configuração PADRÃO (usada por `npm test` / `npm run test:unit`).
// Roda somente os testes UNITÁRIOS, que são isolados e não dependem de banco.
// Os testes de INTEGRAÇÃO têm configuração própria: jest.integration.config.js
// (executados por `npm run test:integration`).

module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/unit/**/*.test.js'],
};
