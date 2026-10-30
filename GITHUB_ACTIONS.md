# CI/CD do FastHotel — GitHub Actions

Documentação dos dois pontos extras da atividade acadêmica:
1. **Testes de segurança automáticos em Pull Requests** (`.github/workflows/security-tests.yml`).
2. **Deploy automático via CI/CD** (`.github/workflows/deploy.yml` + `render.yaml`).

O workflow `ci.yml` já existente (`npm run test:unit`, `test:integration`,
E2E e build do frontend) **não foi alterado** — os dois workflows novos são
independentes e rodam em paralelo com ele.

---

## 1. Workflow de testes de segurança (`security-tests.yml`)

### Quando ele é executado

- Automaticamente em **todo Pull Request destinado à branch `main`**.
- Manualmente, a qualquer momento, pela aba **Actions** do GitHub
  (`workflow_dispatch`) — útil para a apresentação presencial, sem precisar
  abrir um PR de verdade.

### O que ele faz

1. Sobe um PostgreSQL 16 isolado como *service container* do próprio GitHub
   Actions (igual ao `ci.yml`) — nunca toca banco de desenvolvimento/produção.
2. Instala as dependências do backend com `npm ci` (respeita
   `fasthotel-api/package-lock.json`).
3. Roda os **4 grupos obrigatórios**, cada um em um *step* separado (para
   aparecerem individualmente na aba Actions):
   - **Tema 1 — IDOR** (`tests/security/idor.test.js`)
   - **Tema 2 — Criptografia e senhas** (`tests/security/passwords.test.js`)
   - **Tema 3 — Injeção de código / SQL Injection** (`tests/security/injection.test.js`)
   - **Tema 4 — Bots / requisições automatizadas** (`tests/security/bots.test.js`)

As tabelas do banco de teste são criadas automaticamente a partir de
`fasthotel-api/database/schema.sql` (mesmo mecanismo de
`tests/integration/global-setup.js`, reaproveitado pela config de segurança).
Nenhum resultado é simulado: cada step chama `jest` de verdade contra a API
real e o Postgres do service container.

Não há `continue-on-error` em nenhum step — se qualquer teste falhar, o step
falha e os seguintes **não rodam**, e o workflow fica vermelho.

### Como criar um Pull Request para disparar os testes

```bash
git checkout -b teste/seguranca-demo
# qualquer alteração pequena, ex.: editar um comentário
git commit -am "docs: PR de demonstração dos testes de segurança"
git push -u origin teste/seguranca-demo
```
Depois, no GitHub: **Compare & pull request** → base `main` ← compare
`teste/seguranca-demo` → **Create pull request**. O workflow começa a rodar
automaticamente; acompanhe na aba **Checks** do próprio PR ou em **Actions**.

### Como executar manualmente

GitHub → aba **Actions** → workflow **"Testes de Segurança"** (menu da
esquerda) → botão **"Run workflow"** → escolher a branch → **Run workflow**.

### Como rodar localmente (antes de abrir o PR)

```bash
cd fasthotel-api
cp .env.test.example .env.test   # se ainda não existir
npm run test:security
```

---

## 2. CI/CD — Deploy automático (`deploy.yml`)

### Hospedagem escolhida: Render

O FastHotel **não tinha nenhuma hospedagem configurada** (verificado antes de
criar qualquer arquivo — não há `Procfile`, `vercel.json`, `Dockerfile` nem
equivalente no repositório). A opção escolhida foi o **[Render](https://render.com)**:

- tem plano gratuito tanto para o **backend** (Web Service Node, com suporte
  nativo a WebSocket/Socket.IO) quanto para o **frontend** (Static Site) e
  para um **PostgreSQL gerenciado real** (não um banco "fake" em hospedagem
  estática — o item que a atividade pediu para não assumir);
- não depende de Docker local (o build acontece nos servidores do Render);
- é configurável como código (`render.yaml`, já incluído no repositório),
  então a criação dos 3 recursos é praticamente automática.

**Limitações do plano gratuito** (importante deixar claro ao professor): o
Web Service "dorme" após 15 minutos sem tráfego (a primeira requisição depois
disso demora ~30s para "acordar") e o banco gratuito expira depois de 90 dias
se não for promovido a um plano pago. Perfeitamente adequado para uma
demonstração acadêmica.

### O que o workflow faz

Dois jobs:

1. **`validate`** — repete as validações obrigatórias: testes unitários,
   testes de integração, **os 4 grupos de testes de segurança**
   (`npm run test:security`) e a compilação real do frontend
   (`yarn build`). Se qualquer um falhar, o job (e o workflow) para aqui —
   **o deploy nunca roda com código que não passou nos testes.**
2. **`deploy`** (só roda se `validate` passou **e** o push foi em `main`) —
   dispara um deploy real no Render via API, para o backend e para o
   frontend, e **acompanha o status até "live" ou até falhar**, registrando
   cada verificação no log. Se o Render reportar falha de build, o workflow
   termina com erro.

Não há nenhum "fingir que funcionou": se os GitHub Secrets necessários não
estiverem configurados, o job `deploy` falha explicitamente com uma mensagem
dizendo exatamente o que falta — nunca reporta sucesso sem checar de verdade.

### Quando o deploy é disparado

- Automaticamente em **todo push na branch `main`** (depois que `validate` passa).
- Manualmente pela aba Actions (`workflow_dispatch`), para a apresentação.

### Configurações externas que você ainda precisa fazer

Isto é trabalho que só pode ser feito por você, fora do GitHub Actions
(criar conta, serviços, etc.) — nenhuma credencial foi inventada.

**Passo 1 — Criar a conta no Render**
1. Acesse https://render.com e crie uma conta (pode usar login com GitHub).

**Passo 2 — Criar os 3 recursos a partir do Blueprint**
1. No painel do Render: **New +** → **Blueprint**.
2. Conecte o repositório `MarcusGiordani/FastHotelTCC` (autorize o acesso do
   Render ao GitHub, se pedido).
3. O Render vai ler o arquivo `render.yaml` da raiz do repositório e propor
   a criação de 3 recursos: `fasthotel-db` (PostgreSQL), `fasthotel-api`
   (Web Service) e `fasthotel-app` (Static Site). Confirme a criação.
4. Aguarde o primeiro deploy automático do Blueprint terminar (pode falhar
   na primeira vez por faltar as variáveis do Passo 3 — normal, corrija e
   rode de novo).

**Passo 3 — Preencher as variáveis de ambiente no painel do Render**
(`render.yaml` já declara essas chaves com `sync: false`, ou seja, o Render
sabe que elas existem mas não preenche automaticamente — você preenche uma
vez, manualmente, no painel):

No serviço **fasthotel-api** → Environment:
| Variável | Valor |
|---|---|
| `JWT_SECRET` | uma chave longa e aleatória, só sua (ex.: gerada com `openssl rand -base64 32`) |
| `FRONTEND_URL` | a URL pública do serviço `fasthotel-app` (o Render mostra essa URL assim que o serviço é criado, ex.: `https://fasthotel-app.onrender.com`) |

No serviço **fasthotel-app** → Environment:
| Variável | Valor |
|---|---|
| `REACT_APP_API_URL` | URL pública do `fasthotel-api` + `/api` (ex.: `https://fasthotel-api.onrender.com/api`) |
| `REACT_APP_SOCKET_URL` | URL pública do `fasthotel-api`, sem o `/api` (ex.: `https://fasthotel-api.onrender.com`) |

Depois de preencher, dispare um **Manual Deploy** de cada serviço no próprio
painel do Render para aplicar as variáveis.

As credenciais do banco (`PGUSER`, `PGPASSWORD`, `PGHOST`, `PGPORT`,
`PGDATABASE`) **não precisam ser preenchidas manualmente** — `render.yaml`
já as conecta automaticamente a partir do banco `fasthotel-db`
(`fromDatabase`). O schema (`database/schema.sql`) é aplicado automaticamente
a cada deploy pelo `buildCommand` do backend (`npm run db:migrate`, script
novo em `fasthotel-api/scripts/apply-schema.js` — idempotente, nunca apaga
dados).

**Passo 4 — Gerar a API Key do Render**
1. Painel do Render → avatar (canto superior direito) → **Account Settings** → **API Keys**.
2. **Create API Key**, dê um nome (ex. "github-actions-fasthotel") e copie a chave (só aparece uma vez).

**Passo 5 — Pegar os IDs dos serviços**
1. Abra o serviço `fasthotel-api` no painel do Render → o ID aparece na URL
   do navegador, no formato `srv-xxxxxxxxxxxxxxxxxxxx`, ou em **Settings**.
2. Repita para `fasthotel-app`.

**Passo 6 — Cadastrar os GitHub Secrets**
No repositório GitHub: **Settings** → **Secrets and variables** → **Actions** → **New repository secret**. Criar exatamente estes 3:

| Secret | Valor |
|---|---|
| `RENDER_API_KEY` | a chave gerada no Passo 4 |
| `RENDER_BACKEND_SERVICE_ID` | o ID (`srv-...`) do serviço `fasthotel-api` |
| `RENDER_FRONTEND_SERVICE_ID` | o ID (`srv-...`) do serviço `fasthotel-app` |

Nenhuma credencial de banco de dados precisa ir para o GitHub — elas nunca
saem do Render.

### Como confirmar se o deploy realmente funcionou

1. Na aba **Actions**, abra a execução do workflow **"Deploy"** → job
   **"Publicar no Render"**. Cada step mostra o status retornado pela API do
   Render (`build_in_progress`, depois `live`) a cada ~15s, até confirmar.
   Se aparecer `build_failed`/`update_failed`/`canceled`, o workflow termina
   em vermelho — é a prova de que o sistema **não finge sucesso**.
2. Abra a URL pública do `fasthotel-app` (painel do Render, ou a mesma usada
   em `REACT_APP_API_URL`/`FRONTEND_URL`) e confirme que a aplicação carrega
   e que o login funciona de verdade (contra o PostgreSQL de produção do
   Render, criado vazio pelo Blueprint — sem dados de clientes reais).

### Caso a chamada à API do Render não funcione como esperado

A API do Render pode evoluir o formato de resposta. O script
`.github/scripts/render-deploy.sh` já trata isso de forma defensiva: se não
conseguir extrair o `id`/`status` esperado, ele **falha explicitamente** e
imprime a resposta crua da API no log, em vez de fingir sucesso. Se isso
acontecer, a alternativa mais simples e estável é trocar o disparo por um
**Deploy Hook** (painel do Render → serviço → Settings → Deploy Hook → copiar
a URL) e substituir o step correspondente por:
```bash
curl -X POST "$RENDER_DEPLOY_HOOK_URL"
```
(guardando a URL do hook como Secret). Essa alternativa dispara o deploy mas
não permite acompanhar o status dentro do próprio workflow — a confirmação
passaria a ser só visual, no painel do Render.

---

## Resumo das credenciais

| Onde | O que | Tipo |
|---|---|---|
| GitHub Secrets | `RENDER_API_KEY`, `RENDER_BACKEND_SERVICE_ID`, `RENDER_FRONTEND_SERVICE_ID` | só para o GitHub Actions disparar o deploy |
| Render (painel, por serviço) | `JWT_SECRET`, `FRONTEND_URL`, `REACT_APP_API_URL`, `REACT_APP_SOCKET_URL` | segredos/config de runtime da aplicação, nunca passam pelo GitHub |
| Render (automático via Blueprint) | `PGUSER`/`PGPASSWORD`/`PGHOST`/`PGPORT`/`PGDATABASE` | gerados e injetados pelo próprio Render a partir do banco `fasthotel-db` |

Nenhuma dessas credenciais está versionada no repositório.

---

## Roteiro de apresentação presencial

### Demonstração 1 — Testes automáticos em Pull Request (~2 min)

1. Abrir o repositório no GitHub.
2. Mostrar (ou criar ao vivo) um Pull Request para `main`.
3. Abrir a aba **Checks** do PR (ou **Actions**) e apontar o workflow
   **"Testes de Segurança"** rodando.
4. Esperar/mostrar os 4 steps concluídos: Tema 1 (IDOR), Tema 2 (senhas),
   Tema 3 (SQL Injection), Tema 4 (bots) — todos verdes.
5. **Provar que falha de verdade:** fazer uma alteração proposital que quebre
   um teste (ex.: comentar temporariamente a checagem de ownership em um
   controller, ou alterar uma asserção para um valor errado só nesse commit
   de demonstração), dar push na mesma branch do PR, e mostrar o workflow
   ficando vermelho no step correspondente — depois desfazer a alteração.
6. Alternativa sem precisar quebrar nada: mostrar o botão **"Run workflow"**
   (execução manual) na aba Actions.

### Demonstração 2 — CI/CD / Deploy automático (~2 min)

1. Mostrar o arquivo `.github/workflows/deploy.yml` (explicar os 2 jobs:
   validação obrigatória e deploy condicionado a ela).
2. Mostrar `render.yaml` — os 3 recursos (API, frontend, banco) como código.
3. Fazer um push pequeno em `main` (ex.: um ajuste de texto).
4. Abrir a aba **Actions**, acompanhar o workflow **"Deploy"**: primeiro o
   job de validação (testes + build), depois o job de deploy disparando e
   acompanhando o status no Render até `live`.
5. Abrir a URL pública da aplicação no Render e mostrar o FastHotel
   funcionando de verdade (login, por exemplo) — prova de que o deploy foi
   real, não só um `build` local.
