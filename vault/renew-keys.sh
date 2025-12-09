#!/bin/sh
set -e
VAULT_ADDR="https://${HOSTNAME}:8200"
UNSEAL_KEY=$(kubectl get secret vault-init-keys -o jsonpath='{.data.vault-unseal-info\.json}' | base64 -d | jq -r '.unseal_keys_b64[0]')
ROOT_TOKEN=$(kubectl get secret vault-init-keys -o jsonpath='{.data.vault-unseal-info\.json}' | base64 -d | jq -r '.root_token')
VAULT_TOKEN=$(kubectl get secret vault-token -o jsonpath='{.data.token}' | base64 -d)

vault login -address="$VAULT_ADDR" $ROOT_TOKEN

while true; do
  echo "Renewing vault token..."
  vault token renew -address="$VAULT_ADDR" "$VAULT_TOKEN"

  echo "(Re)generating image encryption key..."
  vault kv put -address="$VAULT_ADDR" secret/data/IMAGE_KEY value="$(LC_ALL=C tr -dc A-Za-z0-9 </dev/urandom | head -c 32)"

  echo "Done. Sleeping..."
  sleep 1800
done
