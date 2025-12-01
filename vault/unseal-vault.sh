#!/bin/sh
set -e
echo "Starting Vault initialization script for pod ${HOSTNAME}..."

UNSEAL_KEY=""
ROOT_TOKEN=""
IS_PRIMARY="${IS_PRIMARY}"
VAULT_ADDR="https://svc-vault.default.svc.cluster.local:8200"
PREVIOUSLY_INITED=false

until curl -k ${VAULT_ADDR}/v1/sys/health; do
  echo "Waiting for vault API to be ready..."
  sleep 30
done

# Check if vault-init-keys secret exists
if kubectl get secret vault-init-keys >/dev/null 2>&1; then
  PREVIOUSLY_INITED=true
  echo "Found existing unseal key, retrieving..."
  kubectl get secret vault-init-keys -o jsonpath='{.data.vault-unseal-info\.json}' | base64 -d > /vault/data/vault-unseal-info.json
  UNSEAL_KEY=$(jq -r '.unseal_keys_b64[0]' /vault/data/vault-unseal-info.json)
  ROOT_TOKEN=$(jq -r '.root_token' /vault/data/vault-unseal-info.json)
  RO_KEY=$(jq -r '.auth.client_token' /vault/data/vault-unseal-info.json)
else
  echo "No existing unseal key found."
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
    RO_KEY=$(jq -r '.auth.client_token' /vault/data/vault-unseal-info.json)
  else
    echo "This appears to be the first Vault pod. Initializing new cluster..."

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

if [ "$IS_PRIMARY" = true ] && [ "$PREVIOUSLY_INITED" = false ]; then
  echo "Enabling secret/ kv store..."
  vault login -address="$VAULT_ADDR" "$ROOT_TOKEN"
  vault secrets enable -address="$VAULT_ADDR" -path=secret/ kv

  echo "Creating read token..."
  vault policy write -address="$VAULT_ADDR" read-config - <<EOF
  path "secret/*" {
    capabilities = ["read", "list"]
  }
EOF
  vault token create -address="$VAULT_ADDR" -policy="read-config" -period=1h -format=json > /vault/data/vault-unseal-info.json
  RO_KEY=$(jq -r '.auth.client_token' /vault/data/vault-unseal-info.json)

  echo "Saving Vault read token to Kubernetes secret..."
  kubectl create secret generic vault-ro-token \
    --from-literal=token=$RO_KEY \
    --dry-run=client -o yaml | kubectl apply -f -
  
  until kubectl get secret initial-redis-password >/dev/null 2>&1; do
    echo "Waiting for Redis config..."
    sleep 2
  done

  echo "Inserting Redis config..."
  INITIAL_REDIS_PASSWORD=$(kubectl get secret initial-redis-password -o jsonpath='{.data.password}' | base64 -d)

  vault kv put -address="$VAULT_ADDR" secret/data/REDIS_HOST value="svc-redis-master.default.svc.cluster.local"
  vault kv put -address="$VAULT_ADDR" secret/data/REDIS_PORT value="6379"
  vault kv put -address="$VAULT_ADDR" secret/data/REDIS_PASSWORD value="$INITIAL_REDIS_PASSWORD"
fi

echo "Done."
