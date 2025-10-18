#!/bin/sh

# Wait for vault-0 to start
until kubectl get pod vault-0 -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}' | grep -q True; do
  echo "Waiting for vault-0 pod to be ready..."
  sleep 5
done

# Make sure vault-0's vault API is ready
until curl -k https://vault-0.svc-vault.default.svc.cluster.local:8200/v1/sys/health; do
  echo "Waiting for Vault API..."
  sleep 5
done

# Initialize Vault if not already initialized
if ! vault status -address=https://vault-0.svc-vault.default.svc.cluster.local:8200 -tls-skip-verify | grep -q 'Initialized.*true'; then
  echo "Initializing Vault..."
  vault operator init -address=https://vault-0.svc-vault.default.svc.cluster.local:8200 -key-shares=1 -key-threshold=1 -format=json -tls-skip-verify > /tmp/vault-unseal-info.json
  UNSEAL_KEY=$(jq -r '.unseal_keys_b64[0]' /tmp/vault-unseal-info.json)
  ROOT_TOKEN=$(jq -r '.root_token' /tmp/vault-unseal-info.json)

  echo "Unsealing Vault..."
  vault operator unseal -address=https://vault-0.svc-vault.default.svc.cluster.local:8200 -tls-skip-verify $UNSEAL_KEY

  echo "Saving credentials to a secret..."
  kubectl create secret generic vault-init-keys --from-file=/tmp/vault-unseal-info.json --dry-run=client -o yaml | kubectl apply -f -

  rm -f /tmp/vault-unseal-info.json
  echo "Vault initialization complete."
else
  echo "Vault already initialized."
fi