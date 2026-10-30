# Testes Automatizados de Segurança — FastHotel

Suíte dedicada de testes de segurança, cobrindo os 4 temas obrigatórios da
atividade acadêmica: **IDOR**, **criptografia/senhas**, **injeção de código
(SQL Injection)** e **bots/requisições automatizadas**.

Todos os testes são de **integração real**: Supertest → Express real
(`app.js`) → middlewares reais → controllers reais → **PostgreSQL de teste
real** (`fasthotel_test`). Nenhum resultado é simulado; nenhuma asserção
passa sem que a lógica real do sistema tenha sido exercitada.

## Como executar

```bash
cd fasthotel-api
cp .env.test.example .env.test   # se ainda não existir; ajuste as credenciais locais
npm run test:security
```

O comando roda `jest --config jest.security.config.js --runInBand`:
- cria o banco `fasthotel_test` (se não existir) e aplica `database/schema.sql`
  automaticamente (mesmo mecanismo usado por `npm run test:integration`);
- recusa-se a rodar se `PGDATABASE` não for exatamente `fasthotel_test`
  (trava de segurança em `tests/security/setup.env.js`), para nunca tocar o
  banco de desenvolvimento/produção;
- roda os 4 arquivos de teste de forma serializada (`--runInBand`), pois
  compartilham o mesmo banco físico.

Para rodar tudo (unitários + integração + segurança):

```bash
npm run test:all
```

## Estrutura

```
fasthotel-api/
  middleware/rateLimiter.js          <- middleware de rate limiting (novo)
  jest.security.config.js            <- config dedicada da suíte de segurança
  tests/security/
    setup.env.js                    <- carrega .env.test + trava de banco + limites baixos de rate limit
    idor.test.js                    <- Tema 1
    passwords.test.js               <- Tema 2
    injection.test.js               <- Tema 3
    bots.test.js                    <- Tema 4
```

---

## Tema 1 — IDOR (`idor.test.js`)

**O que verifica:** se um usuário autenticado consegue acessar ou alterar um
recurso de outro usuário apenas trocando o ID na URL/corpo da requisição.

**Partes do FastHotel testadas:**
| Recurso | Rota | Proteção testada |
|---|---|---|
| Usuários | `GET/PUT /api/usuarios/:id` | só o próprio usuário (ou admin/recepcionista) acessa/edita |
| Usuários | `GET /api/usuarios` | listagem completa é admin-only |
| Reservas | `GET /api/reservas/:id`, `GET /api/reservas` | cliente só vê/acessa as próprias reservas |
| Hóspedes | `GET/PUT /api/hospedes/:id` | acesso vinculado à reserva do próprio cliente (`reservas.hospede_principal_id`) |
| Pagamentos | `GET /api/pagamentos/:id` | só o dono da reserva (ou equipe) lê o pagamento |
| Consumos | `GET /api/consumos/:id` | acesso vinculado à reserva do próprio cliente |

**Comportamento esperado:** acesso indevido de terceiro é bloqueado com
`403` (quando a existência do recurso pode ser revelada, ex. usuário/hóspede)
ou `404` (quando nem a existência deve ser revelada, ex. reserva/pagamento de
terceiro — contrato já documentado nos próprios controllers). O proprietário
legítimo sempre recebe `200` com os dados corretos.

**Observação:** estas proteções já existiam no código (implementadas em
etapas anteriores do projeto — correções F03 a F09). Este arquivo é a
comprovação automatizada, dedicada e independente, exigida pela atividade.

---

## Tema 2 — Criptografia e senhas (`passwords.test.js`)

**O que verifica:** como o FastHotel armazena e valida senhas.

**Parte do FastHotel testada:** `controllers/userController.js`
(`criarUsuario`, `loginUser`), usando `bcryptjs`.

| Teste | Comportamento esperado |
|---|---|
| Armazenamento | senha gravada no banco como hash bcrypt (`$2a/$2b$10$...`), nunca em texto puro |
| Salt | duas contas com a mesma senha recebem hashes **diferentes** |
| Login correto | senha certa → `200` + token |
| Login incorreto | senha errada → `400`, "Credenciais inválidas.", sem token |
| Anti-enumeração | e-mail inexistente recebe a mesma mensagem genérica que senha errada (não revela se a conta existe) |
| Não exposição | senha/hash nunca aparecem em `POST /usuarios`, `POST /usuarios/login` nem `GET /usuarios/:id` |

**Resultado da análise (Etapa 1):** o armazenamento já era seguro (bcrypt
com `genSalt(10)`, nenhuma senha em texto puro, nenhuma exposição de hash nas
respostas). Nenhuma correção foi necessária neste tema — os testes comprovam
o comportamento correto já existente.

---

## Tema 3 — Injeção de código / SQL Injection (`injection.test.js`)

**O que verifica:** se entradas maliciosas em campos usados em consultas SQL
alteram o comportamento da consulta, vazam dados indevidos ou corrompem o
banco.

**Partes do FastHotel testadas:**
- `POST /api/usuarios/login` (campos `email` e `senha`) — `userController.loginUser`.
- `POST /api/usuarios` (campo `nome`) — `userController.criarUsuario` (INSERT).
- `GET /api/estoque/produtos?nome=` — `inventoryController.getAllProducts`
  (WHERE dinâmico + `ILIKE`, o único filtro de busca por texto livre do backend).

**Payloads usados** (inofensivos, só no banco de teste):
`' OR '1'='1`, `1 OR 1=1`, `'; DROP TABLE usuarios; --`, `' OR 1=1 --`,
`admin'--`, e variantes equivalentes para o filtro `ILIKE`.

**Comportamento esperado:**
- nenhum payload autentica sem credenciais válidas;
- nenhum payload altera a cláusula `WHERE` da consulta (sempre tratado como
  valor literal via `$1`, `$2`...);
- a tabela afetada (`usuarios`, `produtos`) continua existindo depois do
  payload (`SELECT to_regclass(...)`), comprovando que nenhum `DROP TABLE`
  foi executado;
- o texto malicioso, quando é um campo de texto legítimo (ex. `nome`), é
  gravado literalmente — o sistema funciona normalmente, só não interpreta o
  conteúdo como SQL.

**Resultado da análise (Etapa 1):** **nenhuma SQL Injection foi encontrada.**
Toda consulta no backend (`grep -r "pool.query" controllers/`) usa
parâmetros posicionados (`$1, $2, ...`). Os poucos pontos com template
literals (`${...}`) só interpolam nomes de coluna/operadores fixos do código
(nunca entrada do usuário) — por exemplo
`controllers/inventoryController.js` monta o `WHERE` dinamicamente, mas cada
valor do usuário sempre entra via `params.push(...)` e `$n`, nunca
concatenado na string SQL. Nenhuma correção foi necessária; os testes
comprovam esse comportamento batendo na API real, não apenas lendo o código.

---

## Tema 4 — Bots / requisições automatizadas (`bots.test.js`)

**O que verifica:** se a API resiste a tentativas repetidas de login
(força bruta) e a cadastro em massa (criação automatizada de contas).

**Parte do FastHotel testada:** `middleware/rateLimiter.js` (**novo**,
implementado nesta atividade — o projeto não tinha nenhuma proteção contra
bots antes), aplicado em:
- `POST /api/usuarios/login` (padrão de produção: 10 tentativas / 15 min por IP);
- `POST /api/usuarios` — cadastro público (padrão de produção: 10 cadastros / hora por IP).

Os limites são configuráveis via variáveis de ambiente
(`RATE_LIMIT_LOGIN_MAX`, `RATE_LIMIT_LOGIN_WINDOW_MS`,
`RATE_LIMIT_REGISTER_MAX`, `RATE_LIMIT_REGISTER_WINDOW_MS`). Nos testes
funcionais (`npm run test:integration`), que criam dezenas de usuários
descartáveis por arquivo, os limites são elevados via
`tests/integration/setup.env.js` para não travar os próprios testes. Na
suíte de segurança (`tests/security/setup.env.js`), os limites são baixos
(5 requisições / 60s) só para tornar o `429` determinístico com poucas
chamadas — a lógica de bloqueio é a mesma; só o limiar muda.

| Teste | Comportamento esperado |
|---|---|
| Requisições dentro do limite | funcionam normalmente (login retorna 400 "Credenciais inválidas", cadastro retorna 201) |
| Acima do limite (login) | `429`, mesmo com a senha **correta** — o bloqueio é por volume, não por credencial |
| Acima do limite (cadastro) | `429`, e a conta **não é criada** no banco |

**Por que não usamos CAPTCHA/serviço externo:** a atividade pede uma
proteção básica e testável sem depender de serviços pagos; `express-rate-limit`
(biblioteca local, gratuita, padrão de mercado para Express) atende isso
diretamente.

---

## Diferenciação exigida pela atividade

- **Vulnerabilidade encontrada:** nenhuma em IDOR, senhas ou SQL Injection
  (proteções já existentes de etapas anteriores do projeto, aqui
  comprovadas por teste automatizado dedicado). Em bots: vulnerabilidade
  real encontrada — **nenhuma proteção contra força bruta/abuso existia**.
- **Correção implementada:** apenas no Tema 4 —
  `middleware/rateLimiter.js` (novo), aplicado em
  `routes/userRoutes.js` nas rotas de login e cadastro público.
- **Teste aprovado:** ver seção "Resultados reais da execução" abaixo
  (preenchida após rodar `npm run test:security` e `npm run test:all`).

## Resultados reais da execução

Execução real em 2026-10-28, contra PostgreSQL de teste local (`fasthotel_test`):

| Comando | Resultado |
|---|---|
| `npm run test:unit` | 7 suites, **100/100** testes — sem alteração |
| `npm run test:integration` | 10 suites, **134/134** testes — sem alteração/regressão |
| `npm run test:security` | 4 suites, **42/42** testes — IDOR (18), senhas (7), injeção (7), bots (5) |
| `npm run test:all` | **276/276** testes, 0 falhas |

**Observação técnica relevante:** `bots.test.js` precisou de uma config Jest
própria (`jest.security.bots.config.js` + `tests/security/setup.bots.env.js`),
separada de `idor.test.js`/`passwords.test.js`/`injection.test.js`
(`jest.security.config.js` + `tests/security/setup.env.js`). Motivo: só
`bots.test.js` precisa de limites BAIXOS de rate limiting para forçar o `429`
de forma determinística; os outros três arquivos fazem dezenas de
logins/cadastros fictícios cada um e seriam bloqueados pelos mesmos limites
baixos se compartilhassem a mesma configuração. `npm run test:security` roda
as duas configs em sequência — nenhum teste foi enfraquecido ou simulado para
contornar isso.

---

## Roteiro de apresentação presencial (~5 minutos)

1. **(30s) Contexto.** "O FastHotel já tinha autenticação por JWT e perfis
   admin/recepcionista/cliente. Para esta atividade, analisei o código-fonte
   real em busca de 4 classes de vulnerabilidade e escrevi testes
   automatizados que comprovam o comportamento do sistema contra cada uma."

2. **(30s) Mostrar a estrutura.** Abrir `fasthotel-api/tests/security/` —
   4 arquivos, um por tema. Mostrar `package.json` → `npm run test:security`.

3. **(1 min) Rodar a suíte ao vivo.**
   ```
   npm run test:security
   ```
   Apontar o resumo final do Jest: nº de suites/testes passando, por tema.

4. **(1 min) IDOR.** Abrir `idor.test.js`, mostrar um teste de "cliente A
   tentando ler usuário/hóspede/reserva de cliente B" e o `expect(res.status).toBe(403 ou 404)`.
   Explicar: o acesso é sempre validado contra o *dono real* do recurso no
   banco (join com `reservas`), nunca confiando apenas no ID da URL.

5. **(1 min) Senhas.** Abrir `passwords.test.js`, mostrar o teste que lê
   direto do PostgreSQL e confirma `senha ~= /^\$2[aby]\$/` (hash bcrypt) e
   que duas contas com a mesma senha têm hashes diferentes (salt).

6. **(45s) SQL Injection.** Abrir `injection.test.js`, mostrar o
   `test.each` com os payloads (`' OR '1'='1'`, `DROP TABLE`, etc.) e o
   `to_regclass` confirmando que a tabela sobrevive. Explicar rapidamente:
   todas as consultas usam `$1, $2...` (parametrizadas via `pg`), nunca
   concatenação de string.

7. **(45s) Bots.** Abrir `bots.test.js` e `middleware/rateLimiter.js`.
   Explicar que esta era a única proteção que **não existia** — foi
   implementada agora. Mostrar o teste que esgota o limite e recebe `429`,
   mesmo com a senha correta.

8. **(15s) Encerramento.** "Resultado: nenhuma vulnerabilidade de IDOR,
   senha ou SQL Injection — já estavam protegidas e agora têm teste
   automatizado cobrindo isso. Em bots, a proteção não existia e foi
   implementada e testada nesta atividade."

**Dica:** se o tempo for curto, priorizar os passos 3, 4 e 7 (rodar a suíte,
IDOR e bots) — são os mais visuais e mostram tanto o que já estava certo
quanto o que foi corrigido de fato.
