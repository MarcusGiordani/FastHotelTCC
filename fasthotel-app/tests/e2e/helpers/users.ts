// fasthotel-app/tests/e2e/helpers/users.ts
//
// Dados dos usuários usados pelos testes E2E. As senhas aqui são fictícias e
// exclusivas do ambiente de teste (não são credenciais reais de ninguém).

import { E2E_EMAIL_DOMAIN } from './testdb';

export const USUARIO_VALIDO = {
  nome: 'E2E Usuario Valido',
  email: `usuario.valido@${E2E_EMAIL_DOMAIN}`,
  senha: 'E2ePassw0rd!',
  tipo_usuario: 'recepcionista' as const,
};

export const SENHA_ERRADA = 'senha-errada-999';
