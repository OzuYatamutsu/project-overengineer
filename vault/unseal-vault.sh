#!/bin/sh
echo "Starting Vault initialization script for pod ${HOSTNAME}..."

UNSEAL_KEY=""
ROOT_TOKEN=""
IS_PRIMARY=""
VAULT_ADDR="https://${HOSTNAME}.svc-vault.default.svc.cluster.local:8200"

ready=$(kubectl get statefulset vault -o jsonpath='{.status.readyReplicas}' || echo 0)
if [ "${ready:-0}" -ge 2 ]; then
  IS_PRIMARY=false
else
  IS_PRIMARY=true
fi

until curl -k ${VAULT_ADDR}/v1/sys/health; do
  echo "Waiting for vault API to be ready..."
  sleep 5
done

# Check if vault-init-keys secret exists
if kubectl get secret vault-init-keys >/dev/null 2>&1; then
  echo "Found existing unseal key, retrieving..."
  kubectl get secret vault-init-keys -o jsonpath='{.data.vault-unseal-info\.json}' | base64 -d > /vault/data/vault-unseal-info.json
  UNSEAL_KEY=$(jq -r '.unseal_keys_b64[0]' /vault/data/vault-unseal-info.json)
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

if [ "$IS_PRIMARY" = true ]; then
  echo "Enabling auth for vault-agent..."
  vault login -address=https://svc-vault.default.svc.cluster.local:8200 "$ROOT_TOKEN"
  vault auth enable -address=https://svc-vault.default.svc.cluster.local:8200 kubernetes

  CA_CERT=$(kubectl get secret vault-agent-token -o go-template='{{ index .data "ca.crt" }}' | base64 -d)
  TOKEN_REVIEW_JWT=$(kubectl get secret vault-agent-token -o go-template='{{ .data.token }}' | base64 -d)

  vault write -address=https://svc-vault.default.svc.cluster.local:8200 auth/kubernetes/config kubernetes_host="https://$KUBERNETES_PORT_443_TCP_ADDR:443" kubernetes_ca_cert=$CA_CERT token_reviewer_jwt=$TOKEN_REVIEW_JWT disable_local_ca_jwt="true"
  vault write -address=https://svc-vault.default.svc.cluster.local:8200 auth/kubernetes/role/vault-agent-injector bound_service_account_names=vault-agent-injector bound_service_account_namespaces=default policies=vault-agent-injector ttl=24h
  vault policy write -address=https://svc-vault.default.svc.cluster.local:8200 vault-agent-injector - <<EOF
  path "*" {
    capabilities = ["create", "read", "update", "patch", "delete", "list"]
  }
  path "auth/kubernetes/config/*" {
    capabilities = ["create", "read", "update", "patch", "delete", "list"]
  }
EOF
  vault policy write -address=https://svc-vault.default.svc.cluster.local:8200 vault-agent-injector - <<EOF
  path "*" {
    capabilities = ["create", "read", "update", "patch", "delete", "list"]
  }
EOF
  vault secrets enable -address=https://svc-vault.default.svc.cluster.local:8200 -path secret/ kv
  vault kv put -address=https://svc-vault.default.svc.cluster.local:8200 secret/data/redis/config REDIS_PASSWORD="TEST_PASSWORD" ttl="60s"
fi

echo "Done. Sleeping..."

# Idle forever to prevent crash status (TODO: hack)
tail -f /dev/null