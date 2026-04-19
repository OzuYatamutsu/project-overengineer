#!/bin/sh
set -e
REFRESH_INTERVAL_SECONDS=3600
VAULT_ADDR="https://svc-vault.default.svc.cluster.local:8200"
UNSEAL_KEY=$(kubectl get secret vault-init-keys -o jsonpath='{.data.vault-unseal-info\.json}' | base64 -d | jq -r '.unseal_keys_b64[0]')
ROOT_TOKEN=$(kubectl get secret vault-init-keys -o jsonpath='{.data.vault-unseal-info\.json}' | base64 -d | jq -r '.root_token')
VAULT_TOKEN=$(kubectl get secret vault-token -o jsonpath='{.data.token}' | base64 -d)

echo "Waiting for svc-status-api to be available..."
start=$(date +%s)
timeout_sec=$REFRESH_INTERVAL_SECONDS

until kubectl get svc svc-status-api -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' >/dev/null 2>&1; do
  now=$(date +%s)
  if [ $((now - start)) -ge "$timeout_sec" ]; then
    echo "Timed out waiting for svc-status-api endpoints"
    exit 1
  fi
  sleep 1
done

STATUS_API_URL="ws://$(kubectl get svc svc-status-api \
  -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'):$(kubectl get svc svc-status-api \
  -o jsonpath='{.spec.ports[?(@.name=="ws")].port}')"

vault login -address="$VAULT_ADDR" $ROOT_TOKEN

while true; do
  echo "Refreshing status API URL..."
  STATUS_API_URL="ws://$(kubectl get svc svc-status-api \
    -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'):$(kubectl get svc svc-status-api \
    -o jsonpath='{.spec.ports[?(@.name=="ws")].port}')"
  vault kv put -address="$VAULT_ADDR" secret/data/STATUS_API_URL value="$STATUS_API_URL"

  echo "Renewing vault token..."
  vault token renew -address="$VAULT_ADDR" "$VAULT_TOKEN"

  echo "(Re)generating image encryption key..."
  vault kv put -address="$VAULT_ADDR" secret/data/IMAGE_KEY value="$(LC_ALL=C tr -dc A-Za-z0-9 </dev/urandom | head -c 32)"

  echo "Done. Sleeping..."
  sleep $REFRESH_INTERVAL_SECONDS
done
