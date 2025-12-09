#!/bin/sh
set -e
echo "Starting Vault initialization script for pod ${HOSTNAME}..."

UNSEAL_KEY=""
ROOT_TOKEN=""
IS_PRIMARY="${IS_PRIMARY}"
VAULT_ADDR="https://${HOSTNAME}:8200"
PREVIOUSLY_INITED=${PREVIOUSLY_INITED}

until curl -k $VAULT_ADDR; do
  echo "Waiting for vault API to be ready..."
  sleep 30
done

if [ "$PREVIOUSLY_INITED" = true ]; then
  echo "Retrieving existing init key..."
  kubectl get secret vault-init-keys -o jsonpath='{.data.vault-unseal-info\.json}' | base64 -d > /vault/data/vault-unseal-info.json
  UNSEAL_KEY=$(jq -r '.unseal_keys_b64[0]' /vault/data/vault-unseal-info.json)
  ROOT_TOKEN=$(jq -r '.root_token' /vault/data/vault-unseal-info.json)
  VAULT_TOKEN=$(jq -r '.auth.client_token' /vault/data/vault-unseal-info.json)
else
  if [ "$IS_PRIMARY" = false ]; then
    echo "This looks like a secondary."
    echo "Waiting for primary Vault to become initialized..."
    until kubectl get secret vault-init-keys >/dev/null 2>&1; do
      echo "Waiting for vault-init-keys secret..."
      sleep 5
    done
    kubectl get secret vault-init-keys -o jsonpath='{.data.vault-unseal-info\.json}' | base64 -d > /vault/data/vault-unseal-info.json
    UNSEAL_KEY=$(jq -r '.unseal_keys_b64[0]' /vault/data/vault-unseal-info.json)
    ROOT_TOKEN=$(jq -r '.root_token' /vault/data/vault-unseal-info.json)
    VAULT_TOKEN=$(jq -r '.auth.client_token' /vault/data/vault-unseal-info.json)
  else
    echo "This looks like an uninited primary. Initializing new cluster..."

    vault operator init \
      -address="$VAULT_ADDR" \
      -key-shares=1 \
      -key-threshold=1 \
      -format=json \
      > /vault/data/vault-unseal-info.json

    UNSEAL_KEY=$(jq -r '.unseal_keys_b64[0]' /vault/data/vault-unseal-info.json)
    ROOT_TOKEN=$(jq -r '.root_token' /vault/data/vault-unseal-info.json)

    echo "Saving Vault credentials to Kubernetes secret..."
    kubectl create secret generic vault-init-keys \
      --from-file=/vault/data/vault-unseal-info.json \
      --dry-run=client -o yaml | kubectl apply -f -
  fi
fi

echo "Attempting to join raft cluster..."
vault operator raft join -address="$VAULT_ADDR" || true

echo "Unsealing Vault..."
vault operator unseal -address="$VAULT_ADDR" "$UNSEAL_KEY"

rm -fv /vault/data/vault-unseal-info.json
echo "Vault unseal complete."
