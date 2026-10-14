# Plano de Correção de Vulnerabilidades — FastHotel

Este documento explica **como corrigir** os achados da auditoria de segurança (ver `relatorio-auditoria-seguranca.pdf`). É um guia para a atividade em grupo.

**Nenhuma correção foi implementada.** O código do FastHotel permanece exatamente como estava antes da auditoria. Este arquivo é só o plano.

Convenção de IDs: os IDs (F01–F09) são os mesmos usados no relatório PDF.

---

## F01 — Autocadastro público permite criar conta administradora

**1. Vulnerabilidade**
Qualquer visitante, sem estar autenticado, pode se cadastrar como `admin` através da tela pública de registro.

**2. Onde está**
- `fasthotel-api/routes/userRoutes.js:9-18` — `router.post('/', [validações], userController.createUser)` não tem middleware `auth`.
- `fasthotel-app/src/pages/UserRegistration/index.tsx:22,41,81-90` — formulário público com `<select>` de "Tipo de acesso" oferecendo `admin`, `recepcionista` e `cliente` livremente.
- `fasthotel-app/src/routes/index.tsx:24` — a rota `/register` não está dentro de `<PrivateRoute>`.

**3. Por que acontece**
A rota de cadastro foi criada para permitir o primeiro cadastro do sistema (bootstrapping), mas nunca foi restringida depois. O `tipo_usuario` é aceito do próprio corpo da requisição, sem checar quem está fazendo a chamada.

**4. Risco**
Comprometimento total do sistema: qualquer pessoa na internet pode obter uma conta `admin` e, a partir dela, gerenciar usuários, quartos, reservas, pagamentos e hóspedes.

**5. Solução recomendada**
- A rota pública `POST /api/usuarios` deve **sempre** criar o usuário como `cliente`, ignorando qualquer `tipo_usuario` enviado no corpo.
- Criar uma rota **separada e protegida** (ex.: `POST /api/usuarios/admin`, com `auth` + `authorize(['admin'])`) para que um administrador já existente crie contas de `admin`/`recepcionista`.
- O primeiro usuário `admin` do sistema deve ser criado por um script de setup/seed administrativo (fora da API pública), não pelo formulário de cadastro.

**6. Como implementar**
- Em `userController.createUser`, remover a leitura de `tipo_usuario` do `req.body` para a rota pública e fixar `'cliente'` sempre.
- Criar `createStaffUser` (ou parâmetro de rota) que só existe atrás de `auth` + `authorize(['admin'])`, reaproveitando a mesma lógica de hash/validação.
- No frontend, remover a opção `admin`/`recepcionista` do formulário público (`UserRegistration`) ou mover a criação de contas de equipe para uma tela dentro da área autenticada, acessível apenas a `admin`.

**7. Como testar a correção**
- Requisição não autenticada para `POST /api/usuarios` com `tipo_usuario: 'admin'` deve criar o usuário como `cliente` (ou ser rejeitada, dependendo da solução escolhida).
- Requisição autenticada como `cliente` para a rota de criação de staff deve retornar `403`.
- Requisição autenticada como `admin` para a rota de criação de staff deve funcionar normalmente.
- Teste de integração cobrindo os três casos acima.

**8. Critério para considerar corrigido**
Não existe mais nenhum caminho, autenticado ou não, pelo qual um usuário sem privilégio de `admin` consiga criar ou se tornar uma conta `admin`/`recepcionista`.

---

## F02 — `PUT /api/usuarios/:id` permite auto-promoção a administrador

**1. Vulnerabilidade**
Um usuário autenticado com qualquer papel (inclusive `cliente`) pode alterar `nome`, `email` e `tipo_usuario` de **qualquer** usuário, incluindo o próprio, bastando informar o `id` na URL.

**2. Onde está**
- `fasthotel-api/routes/userRoutes.js:22` — `authorize(['admin', 'recepcionista', 'cliente'])`, ou seja, todos os papéis válidos passam.
- `fasthotel-api/controllers/userController.js:73-96` (`updateUser`), especialmente linhas 78-81, onde o `UPDATE` usa o `id` da URL sem comparar com `req.user.id` e grava `tipo_usuario` vindo do corpo sem restrição.

**3. Por que acontece**
A rota foi pensada para "permitir que o cliente atualize o próprio perfil" (ver comentário na linha 22), mas a implementação nunca chegou a validar que `id === req.user.id`, nem impediu a alteração do campo `tipo_usuario`.

**4. Risco**
Escalonamento de privilégio trivial: qualquer conta `cliente` chama `PUT /api/usuarios/<seu_id>` com `{ "tipo_usuario": "admin" }` e se torna administrador. Também permite alterar e-mail/nome/papel de contas de terceiros, incluindo rebaixar outros administradores.

**5. Solução recomendada**
- Separar duas operações:
  - **Perfil próprio**: usuário autenticado só pode alterar `nome`/`email` do **seu próprio** `req.user.id` (nunca `tipo_usuario`).
  - **Gestão de usuários**: só `admin` pode alterar `tipo_usuario` ou os dados de outra conta, através de uma rota/validação distinta.

**6. Como implementar**
- Em `updateUser`, comparar `req.params.id` com `req.user.id`. Se forem diferentes, exigir `req.user.tipo_usuario === 'admin'`.
- Ignorar/rejeitar o campo `tipo_usuario` no corpo quando quem chama não é `admin`.
- Ajustar `userRoutes.js:22` para `authorize(['admin', 'recepcionista', 'cliente'])` continuar existindo (o acesso à rota está OK), mas a **regra de negócio dentro do controller** é quem deve decidir o que pode ser alterado.

**7. Como testar a correção**
- `cliente` autenticado chamando `PUT /api/usuarios/<próprio id>` com `{tipo_usuario:'admin'}` → o campo é ignorado ou a requisição é rejeitada; o usuário continua `cliente`.
- `cliente` chamando `PUT /api/usuarios/<id de outro usuário>` → `403`.
- `admin` chamando `PUT /api/usuarios/<id de qualquer usuário>` com `tipo_usuario` → funciona.
- Teste de integração para os três casos.

**8. Critério para considerar corrigido**
Nenhum usuário consegue alterar `tipo_usuario` (de si mesmo ou de outro) a menos que quem faz a chamada já seja `admin`; nenhum usuário não-admin consegue alterar dados de outra conta.

---

## F03 — `GET /api/usuarios/:id` expõe dados de qualquer usuário

**1. Vulnerabilidade**
Qualquer usuário autenticado pode consultar `nome`, `email`, `tipo_usuario` e `data_cadastro` de qualquer outro usuário pelo ID, sem relação com sua própria conta.

**2. Onde está**
- `fasthotel-api/routes/userRoutes.js:21`
- `fasthotel-api/controllers/userController.js:58-70` (`getUserById`)

**3. Por que acontece**
A consulta busca diretamente por `id` da URL sem comparar com `req.user.id` nem restringir a `admin`/`recepcionista`.

**4. Risco**
Enumeração de contas: um atacante autenticado (mesmo como `cliente`) pode percorrer IDs sequenciais e descobrir quantos usuários existem, quais são `admin`/`recepcionista`, e seus e-mails — informação útil para ataques direcionados (ex.: engenharia social, tentativa de login).

**5. Solução recomendada**
Restringir a consulta por ID de outro usuário a `admin`/`recepcionista`; permitir que qualquer usuário veja apenas o próprio registro (`/api/usuarios/me` ou comparação `id === req.user.id`).

**6. Como implementar**
Em `getUserById`, se `req.user.tipo_usuario` não for `admin`/`recepcionista`, exigir `req.params.id === String(req.user.id)`; caso contrário, `403`.

**7. Como testar a correção**
`cliente` consultando o próprio ID → `200`. `cliente` consultando ID de outro usuário → `403`. `admin`/`recepcionista` consultando qualquer ID → `200`.

**8. Critério para considerar corrigido**
Um usuário comum só consegue ler os próprios dados; `admin`/`recepcionista` continuam podendo consultar qualquer conta (necessário para a operação do sistema).

---

## F04 — Rotas de Quartos sem qualquer autenticação

**1. Vulnerabilidade**
`POST`, `GET`, `PUT` e `DELETE` em `/api/quartos` e `/api/quartos/:id` não exigem login. Qualquer pessoa na internet pode criar, listar, alterar e excluir quartos.

**2. Onde está**
- `fasthotel-api/routes/roomRoutes.js:7-11` — nenhuma das 5 rotas usa `auth`.
- `fasthotel-api/controllers/roomController.js` — `createRoom` (5-30), `updateRoom` (72-95), `deleteRoom` (98-110) não fazem nenhuma verificação adicional.

**3. Por que acontece**
Ao que parece, o middleware `auth`/`authorize` foi adicionado em outras rotas (reservas, hóspedes, etc.) mas esquecido especificamente em `roomRoutes.js`.

**4. Risco**
Sabotagem operacional sem necessidade de credenciais: apagar todos os quartos, zerar preços, mudar status de "disponível" para bloquear reservas, ou inserir quartos falsos.

**5. Solução recomendada**
- Leitura (`GET /`, `GET /:id`): manter pública ou exigir apenas `auth`, dependendo da regra de negócio (ex.: exibir quartos disponíveis para clientes).
- Escrita (`POST /`, `PUT /:id`, `DELETE /:id`): exigir `auth` + `authorize(['admin', 'recepcionista'])`.

**6. Como implementar**
Em `roomRoutes.js`, importar `auth`/`authorize` (como já é feito em `bookingRoutes.js`) e aplicá-los às rotas de escrita.

**7. Como testar a correção**
Requisição não autenticada para `POST/PUT/DELETE /api/quartos...` → `401`. `cliente` autenticado → `403` (se a regra for admin/recepcionista). `admin`/`recepcionista` → `200/201`.

**8. Critério para considerar corrigido**
Nenhuma operação de escrita em quartos é possível sem autenticação e sem o papel adequado.

---

## F05 — CRUD de Hóspedes sem controle de acesso (exposição de PII)

**1. Vulnerabilidade**
Qualquer usuário autenticado, inclusive `cliente`, pode listar, visualizar, editar e excluir **qualquer** hóspede — incluindo CPF, RG, endereço e telefone — e a exclusão também remove reservas, pagamentos e conversas de chat associadas.

**2. Onde está**
- `fasthotel-api/routes/guestRoutes.js:7-11` — só `auth`, sem `authorize`.
- `fasthotel-api/controllers/guestController.js:96-108` (`getGuestById`), `111-142` (`updateGuest`), `145-205` (`deleteGuest`).
- Evidência no frontend: `fasthotel-app/src/pages/Guests/index.tsx:218-229` renderiza os botões de editar/reserva/pagamento/excluir para **qualquer** usuário logado, sem checar papel; `fasthotel-app/src/components/PrivateRoute/index.tsx:8-11` só verifica se existe token, não o papel do usuário.

**3. Por que acontece**
A tela de hóspedes foi construída para a recepção, mas nem a rota nem o componente de proteção de rota (`PrivateRoute`) fazem distinção por `tipo_usuario` — o controle de acesso ficou implícito ("só quem tem o menu vai usar"), o que não é garantia nenhuma no backend.

**4. Risco**
Exposição/alteração de dados pessoais sensíveis (CPF, RG) de hóspedes por contas de baixo privilégio; exclusão em cascata de reservas e histórico de terceiros.

**5. Solução recomendada**
Restringir todo o CRUD de hóspedes a `admin`/`recepcionista` (papéis de equipe). Se `cliente` precisar visualizar dados de hóspedes vinculados às próprias reservas, criar uma rota específica e filtrada por propriedade.

**6. Como implementar**
Em `guestRoutes.js`, adicionar `authorize(['admin', 'recepcionista'])` em todas as rotas (mantendo `auth` já existente).

**7. Como testar a correção**
`cliente` autenticado chamando qualquer rota de `/api/hospedes` → `403`. `recepcionista`/`admin` → funciona como hoje.

**8. Critério para considerar corrigido**
Nenhuma conta `cliente` consegue ler, alterar ou excluir registros de `hospedes` pela API.

---

## F06 — CRUD de Serviços sem controle de acesso

**1. Vulnerabilidade**
Qualquer usuário autenticado pode criar, alterar e excluir itens do catálogo de serviços (nome, descrição, **preço**).

**2. Onde está**
- `fasthotel-api/routes/serviceRoutes.js:8-12` — só `auth`.
- `fasthotel-api/controllers/serviceController.js` — `createService` (5-21), `updateService` (50-69), `deleteService` (72-84).

**3. Por que acontece**
Mesmo padrão de `guestRoutes.js`: falta `authorize` nas rotas de escrita.

**4. Risco**
Um `cliente` pode zerar o preço de serviços, apagar itens do catálogo ou criar serviços falsos, afetando faturamento e relatórios financeiros.

**5. Solução recomendada**
Leitura (`GET /`, `GET /:id`) pode continuar liberada a qualquer autenticado; escrita (`POST`, `PUT`, `DELETE`) deve exigir `admin`/`recepcionista`.

**6. Como implementar**
Adicionar `authorize(['admin', 'recepcionista'])` nas rotas `POST /`, `PUT /:id`, `DELETE /:id` de `serviceRoutes.js`.

**7. Como testar a correção**
`cliente` tentando criar/alterar/excluir serviço → `403`. `admin`/`recepcionista` → funciona.

**8. Critério para considerar corrigido**
Catálogo de serviços só pode ser alterado por `admin`/`recepcionista`.

---

## F07 — CRUD de Consumos sem controle de acesso nem verificação da reserva

**1. Vulnerabilidade**
Qualquer usuário autenticado pode registrar, listar, alterar e excluir consumos vinculados a **qualquer** reserva, não apenas às próprias.

**2. Onde está**
- `fasthotel-api/routes/consumptionRoutes.js:8-12` — só `auth`.
- `fasthotel-api/controllers/consumptionController.js` — `createConsumption` (5-34), `getAllConsumptions` (37-70), `getConsumptionById` (73-102), `updateConsumption` (105-150), `deleteConsumption` (153-165).

**3. Por que acontece**
O mecanismo de isolamento por `usuario_id` que existe em `reservas` (implementado em `bookingController.getAllBookings`/`getBookingById`) não foi propagado para `consumos`, que é uma tabela filha de `reservas`.

**4. Risco**
Um `cliente` pode lançar consumos falsos na conta de outro hóspede/reserva, excluir consumos legítimos de terceiros (fraude/sabotagem de faturamento) ou visualizar o consumo de qualquer reserva.

**5. Solução recomendada**
Escrita (`POST`, `PUT`, `DELETE`) restrita a `admin`/`recepcionista` (quem de fato lança consumo na conta do hóspede). Leitura pode ser filtrada por propriedade da reserva (`reservas.usuario_id = req.user.id`) para papéis não-admin, análogo ao que já existe em `bookingController`.

**6. Como implementar**
- Adicionar `authorize(['admin', 'recepcionista'])` nas rotas de escrita em `consumptionRoutes.js`.
- Em `getAllConsumptions`/`getConsumptionById`, se `req.user.tipo_usuario` não for `admin`/`recepcionista`, fazer `JOIN` com `reservas` e filtrar por `r.usuario_id = req.user.id`, no mesmo padrão de `bookingController.getAllBookings`.

**7. Como testar a correção**
`cliente` tentando criar/alterar/excluir consumo → `403`. `cliente` listando consumos → só vê os das próprias reservas. `admin`/`recepcionista` → sem alteração de comportamento.

**8. Critério para considerar corrigido**
Nenhum usuário não-admin/recepcionista consegue escrever consumos de terceiros; a leitura, quando permitida a `cliente`, é sempre filtrada pela própria reserva.

---

## F08 — Leitura de Pagamentos sem controle de acesso

**1. Vulnerabilidade**
`GET /api/pagamentos` e `GET /api/pagamentos/:id` retornam dados de pagamento (valor, método, status, nome do hóspede/usuário) de **qualquer** reserva para qualquer usuário autenticado.

**2. Onde está**
- `fasthotel-api/routes/paymentRoutes.js:9,14` — só `auth`.
- `fasthotel-api/controllers/paymentController.js:29-74` (`getAllPayments`), `77-114` (`getPaymentById`).

**3. Por que acontece**
Mesmo padrão dos itens anteriores: falta propagar o filtro por propriedade que já existe em `reservas` para a tabela `pagamentos`.

**4. Risco**
Exposição do histórico financeiro de outros clientes/hóspedes (valores pagos, método de pagamento, status) para qualquer conta autenticada, incluindo `cliente`.

**5. Solução recomendada**
Para papéis não-admin/recepcionista, filtrar por `reservas.usuario_id = req.user.id`, no mesmo padrão de `bookingController`.

**6. Como implementar**
Em `getAllPayments`/`getPaymentById`, adicionar `AND r.usuario_id = $N` na query quando `req.user.tipo_usuario` não for `admin`/`recepcionista`, usando `req.user.id` como parâmetro (a tabela já faz `JOIN` com `reservas r`, então o filtro é direto).

**7. Como testar a correção**
`cliente` chamando `GET /api/pagamentos` → só recebe pagamentos das próprias reservas. `cliente` chamando `GET /api/pagamentos/:id` de uma reserva de outro usuário → `404`/`403`. `admin`/`recepcionista` → sem alteração.

**8. Critério para considerar corrigido**
Nenhum usuário comum consegue ler pagamentos de reservas que não são suas.

---

## F09 — Criação de pagamento para reserva de terceiro, aprovado por padrão

**1. Vulnerabilidade**
`POST /api/pagamentos` aceita qualquer `reserva_id` (sem checar se pertence a quem está chamando) e, se `status_pagamento` não for enviado, grava automaticamente como `'aprovado'` — sem qualquer verificação de que o pagamento de fato ocorreu.

**2. Onde está**
- `fasthotel-api/routes/paymentRoutes.js:8` — só `auth`.
- `fasthotel-api/controllers/paymentController.js:5-26` (`createPayment`), especialmente a linha `status_pagamento || 'aprovado'`.

**3. Por que acontece**
A rota foi criada assumindo que o registro de pagamento seria feito pela recepção após confirmar o pagamento por outro meio (dinheiro, cartão na maquininha, etc.), mas não há restrição de papel nem de propriedade da reserva, e o valor padrão do status é otimista ("aprovado").

**4. Risco**
Fraude: um `cliente` autenticado pode registrar um pagamento "aprovado" para a própria reserva (ou até para a de outra pessoa) sem ter pago nada, fazendo o sistema (extratos, relatórios, `getPaymentExtract`) considerar a hospedagem como paga.

**5. Solução recomendada**
- Restringir `POST /api/pagamentos` a `admin`/`recepcionista` (quem de fato confirma o recebimento).
- Nunca aceitar `status_pagamento` vindo do cliente como `'aprovado'` por padrão sem confirmação explícita de quem tem autoridade para isso.

**6. Como implementar**
Adicionar `authorize(['admin', 'recepcionista'])` na rota `POST /` de `paymentRoutes.js`. Opcionalmente, remover o valor padrão `'aprovado'` e exigir que o status seja definido explicitamente por quem registra o pagamento.

**7. Como testar a correção**
`cliente` tentando criar pagamento → `403`. `admin`/`recepcionista` criando pagamento para qualquer reserva → funciona como hoje.

**8. Critério para considerar corrigido**
Nenhuma conta `cliente` consegue registrar um pagamento; todo pagamento "aprovado" no sistema foi lançado por `admin`/`recepcionista`.

---

## Categoria 4 — Chaves expostas / segredos: nenhuma correção necessária

A auditoria não encontrou segredos reais no código, no `.env.example`, no `.env.test.example`, no workflow de CI ou no histórico do Git — apenas placeholders (`troque-por-sua-senha-local`, `troque-por-uma-chave-longa-e-aleatoria`) e credenciais de teste sem valor real (`ci-tests-only-secret`, `postgres`/`postgres` no container do CI). Os arquivos `.env` e `.env.test` reais, que contêm a senha local do banco, estão corretamente listados no `.gitignore` e nunca foram commitados.

**Proteção a manter:** continuar nunca commitando `.env`/`.env.test`; continuar usando apenas credenciais de teste, definidas no próprio workflow, para o CI; manter o `.gitignore` atual (`fasthotel-api/.gitignore` e `fasthotel-app/.gitignore`) sem remover as entradas de `.env*`.

## Categoria 5 — Inputs sem tratamento / XSS: nenhuma correção necessária

Não há `dangerouslySetInnerHTML`, `innerHTML`, `eval` ou renderização de HTML/Markdown controlado pelo usuário no frontend. O conteúdo gerado pelo usuário (ex.: mensagens de chat em `ChatOnline/index.tsx`) é sempre renderizado via interpolação JSX padrão (`{msg.conteudo}`), que o React escapa automaticamente. O backend não gera e-mails, templates HTML nem qualquer resposta que misture HTML com dados do usuário.

**Proteção a manter:** ao adicionar novas telas, continuar evitando `dangerouslySetInnerHTML`/`innerHTML`; se um editor rico ou renderização de Markdown for adicionado no futuro, introduzir uma biblioteca de sanitização (ex.: DOMPurify) nesse momento, antes de renderizar o conteúdo.

## Categoria 1 — Banco sem tranca

Não há um achado isolado nesta categoria porque, no fundo, ela é a causa raiz de F07 e F08: o único mecanismo de isolamento identificado no sistema (filtro manual `WHERE usuario_id = req.user.id`, implementado corretamente em `bookingController.getAllBookings`/`getBookingById`) não foi propagado para as tabelas dependentes `pagamentos` e `consumos`. A correção está descrita em F07 e F08 acima; não é necessária uma ação adicional além da já descrita para esses dois achados.

---

## Ordem sugerida de execução

1. **F01 e F02** primeiro — são as portas de entrada para virar `admin`; corrigi-las reduz drasticamente o impacto de todos os outros achados.
2. **F04** — não exige nem login, é a segunda porta de entrada mais fácil.
3. **F09** — impacto financeiro direto.
4. **F05, F06, F07, F08** — mesma correção (adicionar `authorize`/filtro por propriedade), podem ser feitas juntas em um único PR por serem o mesmo padrão de problema.
5. **F03** — menor impacto, pode ser resolvido junto com F02 (mesmo arquivo/rota).
