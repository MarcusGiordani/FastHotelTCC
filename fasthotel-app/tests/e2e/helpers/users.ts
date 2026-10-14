// fasthotel-app/tests/e2e/helpers/users.ts
//
// Dados dos usuários usados pelos testes E2E. As senhas aqui são fictícias e
// exclusivas do ambiente de teste (não são credenciais reais de ninguém).

import { E2E_EMAIL_DOMAIN } from './testdb';

// Criado via POST /api/usuarios (cadastro público). Desde a correção F01, essa
// rota sempre grava tipo_usuario='cliente' no banco, independente do que for
// enviado — por isso o valor abaixo precisa ser 'cliente' para bater com a
// resposta real da API (ver seed.setup.ts e login.spec.ts).
export const USUARIO_VALIDO = {
  nome: 'E2E Usuario Valido',
  email: `usuario.valido@${E2E_EMAIL_DOMAIN}`,
  senha: 'E2ePassw0rd!',
  tipo_usuario: 'cliente' as const,
};

export const SENHA_ERRADA = 'senha-errada-999';
