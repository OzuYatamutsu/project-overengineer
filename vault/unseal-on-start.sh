#!/bin/sh
set -e

echo "[INFO] Vault unseal init container starting..."

# Wait for vault to be ready
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if curl -k https://127.0.0.1:8200/v1/sys/health 2>/dev/null; then
    echo "[INFO] Vault API is ready"
    break
  fi
  
  RETRY_COUNT=$((RETRY_COUNT + 1))
  echo "[INFO] Waiting for Vault API to be ready (attempt $RETRY_COUNT/$MAX_RETRIES)..."
  sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
  echo "[WARN] Vault API did not become ready within expected time, continuing anyway..."
fi

# Check if vault is initialized
if ! vault status -address=https://127.0.0.1:8200 -tls-skip-verify >/dev/null 2>&1; then
  echo "[INFO] Vault not initialized yet, skipping unseal (will be initialized by init job)"
  exit 0
fi

# Check vault status
VAULT_STATUS=$(vault status -address=https://127.0.0.1:8200 -tls-skip-verify -format=json 2>/dev/null || echo "{}")
INITIALIZED=$(echo "$VAULT_STATUS" | jq -r '.initialized // false')
SEALED=$(echo "$VAULT_STATUS" | jq -r '.sealed // false')

if [ "$INITIALIZED" != "true" ]; then
  echo "[INFO] Vault not initialized yet, skipping unseal (will be initialized by init job)"
  exit 0
fi

if [ "$SEALED" != "true" ]; then
  echo "[INFO] Vault is already unsealed"
  exit 0
fi

# Vault is sealed, attempt to unseal
echo "[INFO] Vault is sealed, attempting to unseal..."

# Wait for the vault-init-keys secret to be available
SECRET_RETRY=0
MAX_SECRET_RETRIES=30

while [ $SECRET_RETRY -lt $MAX_SECRET_RETRIES ]; do
  if kubectl get secret vault-init-keys >/dev/null 2>&1; then
    echo "[INFO] Found vault-init-keys secret"
    break
  fi
  
  SECRET_RETRY=$((SECRET_RETRY + 1))
  echo "[INFO] Waiting for vault-init-keys secret (attempt $SECRET_RETRY/$MAX_SECRET_RETRIES)..."
  sleep 2
done

if [ $SECRET_RETRY -eq $MAX_SECRET_RETRIES ]; then
  echo "[ERROR] vault-init-keys secret not found after $MAX_SECRET_RETRIES attempts"
  echo "[INFO] Vault will remain sealed until initialized by init job"
  exit 0
fi

# Retrieve unseal key from secret
echo "[INFO] Retrieving unseal key from secret..."
kubectl get secret vault-init-keys -o jsonpath='{.data.vault-unseal-info\.json}' | base64 -d > /tmp/vault-unseal-info.json
UNSEAL_KEY=$(jq -r '.unseal_keys_b64[0]' /tmp/vault-unseal-info.json)

if [ -z "$UNSEAL_KEY" ] || [ "$UNSEAL_KEY" = "null" ]; then
  echo "[ERROR] Failed to retrieve unseal key from secret"
  rm -f /tmp/vault-unseal-info.json
  exit 1
fi

# Unseal vault
echo "[INFO] Unsealing vault..."
if vault operator unseal -address=https://127.0.0.1:8200 -tls-skip-verify "$UNSEAL_KEY"; then
  echo "[INFO] Vault successfully unsealed"
else
  echo "[ERROR] Failed to unseal vault"
  rm -f /tmp/vault-unseal-info.json
  exit 1
fi

# Clean up
rm -f /tmp/vault-unseal-info.json
echo "[INFO] Vault unseal init container complete"
