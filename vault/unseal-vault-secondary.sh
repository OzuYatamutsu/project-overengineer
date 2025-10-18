#!/bin/sh

# Wait for secondary to start
until kubectl get pod ${CONTAINER_NAME} -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}' | grep -q True; do
  echo "Waiting for ${CONTAINER_NAME} pod to be ready..."
  sleep 5
done

# Make sure vault API is ready
until curl -k https://${CONTAINER_NAME}.svc-vault.default.svc.cluster.local:8200/v1/sys/health; do
  echo "Waiting for Vault API..."
  sleep 5
done

# Make sure key is ready
until kubectl get secret vault-init-keys; do
  echo "Waiting for primary to unseal..."
  sleep 5
done

# Initialize Vault if not already initialized
if vault status -address=https://${CONTAINER_NAME}.svc-vault.default.svc.cluster.local:8200 -tls-skip-verify | grep -q 'Sealed.*true'; then
  echo "Retrieving unseal key..."
  kubectl get secret vault-init-keys -o jsonpath='{.data.vault-unseal-info\.json}' | base64 --decode > /tmp/vault-unseal-info.json
  UNSEAL_KEY=$(jq -r '.unseal_keys_b64[0]' /tmp/vault-unseal-info.json)
  
  echo "Unsealing Vault..."
  vault operator unseal -address=https://${CONTAINER_NAME}.svc-vault.default.svc.cluster.local:8200 -tls-skip-verify $UNSEAL_KEY

  echo "Saving credentials to a secret..."
  kubectl create secret generic vault-init-keys --from-file=/tmp/vault-unseal-info.json --dry-run=client -o yaml | kubectl apply -f -

  rm -f /tmp/vault-unseal-info.json
  echo "Vault initialization complete."
else
  echo "Vault already initialized."
fi
