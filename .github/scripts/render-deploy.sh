#!/usr/bin/env bash
# .github/scripts/render-deploy.sh <service_id> <rótulo>
#
# Dispara um deploy real no Render (API v1, https://api.render.com) para o
# serviço informado e aguarda o resultado, registrando cada mudança de status
# no log do GitHub Actions. Termina com erro (exit 1) se o deploy falhar, for
# cancelado, ou se a API não responder como esperado — nunca finge sucesso.
#
# Requer a variável de ambiente RENDER_API_KEY (GitHub Secret). O ID do
# serviço vem como argumento (também um GitHub Secret, um por serviço).
#
# Documentação da API: https://api-docs.render.com/reference/introduction

set -euo pipefail

SERVICE_ID="$1"
LABEL="$2"
API="https://api.render.com/v1"
MAX_TENTATIVAS=40   # 40 x 15s = até 10 minutos de espera
INTERVALO=15

if [ -z "$SERVICE_ID" ]; then
  echo "::error::ID do serviço do Render não informado para '$LABEL'."
  exit 1
fi

echo "Disparando deploy no Render para $LABEL (serviço $SERVICE_ID)..."

RESPOSTA=$(curl -sS -w '\n%{http_code}' -X POST "$API/services/$SERVICE_ID/deploys" \
  -H "Authorization: Bearer $RENDER_API_KEY" \
  -H "Accept: application/json")

HTTP_CODE=$(echo "$RESPOSTA" | tail -n1)
CORPO=$(echo "$RESPOSTA" | sed '$d')

if [ "$HTTP_CODE" -lt 200 ] || [ "$HTTP_CODE" -ge 300 ]; then
  echo "::error::Render recusou o disparo do deploy de $LABEL (HTTP $HTTP_CODE). Resposta: $CORPO"
  echo "Verifique se RENDER_API_KEY e o ID do serviço estão corretos (ver GITHUB_ACTIONS.md)."
  exit 1
fi

DEPLOY_ID=$(echo "$CORPO" | jq -r '.id // empty')
if [ -z "$DEPLOY_ID" ]; then
  echo "::error::Não foi possível extrair o ID do deploy de $LABEL na resposta do Render: $CORPO"
  exit 1
fi

echo "Deploy de $LABEL disparado: id=$DEPLOY_ID. Acompanhando status..."

for i in $(seq 1 "$MAX_TENTATIVAS"); do
  sleep "$INTERVALO"

  STATUS_RESPOSTA=$(curl -sS -X GET "$API/services/$SERVICE_ID/deploys/$DEPLOY_ID" \
    -H "Authorization: Bearer $RENDER_API_KEY" \
    -H "Accept: application/json")

  STATUS=$(echo "$STATUS_RESPOSTA" | jq -r '.status // empty')
  echo "[$i/$MAX_TENTATIVAS] status de $LABEL: ${STATUS:-desconhecido}"

  case "$STATUS" in
    live)
      echo "::notice::Deploy de $LABEL concluído com sucesso (status: live)."
      exit 0
      ;;
    build_failed|update_failed|canceled|deactivated)
      echo "::error::Deploy de $LABEL falhou (status: $STATUS). Veja os logs de build no painel do Render."
      exit 1
      ;;
    "")
      echo "::error::Resposta inesperada do Render ao consultar o status de $LABEL: $STATUS_RESPOSTA"
      exit 1
      ;;
  esac
done

echo "::error::Tempo esgotado aguardando o deploy de $LABEL ficar 'live' (último status: ${STATUS:-desconhecido})."
exit 1
