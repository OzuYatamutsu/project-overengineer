#!/bin/sh
echo "Starting Vault initialization script for pod ${HOSTNAME}..."

UNSEAL_KEY=""
ROOT_TOKEN=""

VAULT_ADDR="https://${HOSTNAME}.svc-vault.default.svc.cluster.local:8200"

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
  echo "No existing unseal key found, checking if this should be the primary..."
  ready=$(kubectl get statefulset vault -o jsonpath='{.status.readyReplicas}' || echo 0)
  if [ "${ready:-0}" -ge 2 ]; then
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
      -tls-skip-verify > /vault/data/vault-unseal-info.json

    UNSEAL_KEY=$(jq -r '.unseal_keys_b64[0]' /vault/data/vault-unseal-info.json)
    ROOT_TOKEN=$(jq -r '.root_token' /vault/data/vault-unseal-info.json)

    echo "Saving Vault credentials to Kubernetes secret..."
    kubectl create secret generic vault-init-keys \
      --from-file=/vault/data/vault-unseal-info.json \
      --dry-run=client -o yaml | kubectl apply -f -
  fi
fi

echo "Attempting to join raft cluster..."
vault operator raft join -address="$VAULT_ADDR" -tls-skip-verify || true

echo "Unsealing Vault..."
vault operator unseal -address="$VAULT_ADDR" -tls-skip-verify "$UNSEAL_KEY"

rm -fv /vault/data/vault-unseal-info.json
echo "Vault unseal complete."
