#!/bin/sh
set -e
VAULT_ADDR="https://svc-vault.default.svc.cluster.local:8200"
ROOT_TOKEN=$(jq -r '.root_token' /vault/data/vault-unseal-info.json)

vault login -address="$VAULT_ADDR" $ROOT_TOKEN

while true; do
  echo "Renewing vault read token..."
  vault token renew -address="$VAULT_ADDR" "$RO_KEY"
  
  echo "(Re)generating image encryption key..."
  vault kv put -address="$VAULT_ADDR" secret/data/IMAGE_KEY value="$(LC_ALL=C tr -dc A-Za-z0-9 </dev/urandom | head -c 32)"
  
  echo "Done. Sleeping..."
  sleep 1800
done
