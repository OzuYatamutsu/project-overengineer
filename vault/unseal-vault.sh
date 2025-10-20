#!/bin/sh
UNSEAL_KEY=""
ROOT_TOKEN=""
echo "Initing vault..."

echo "Joining raft cluster..."
vault operator raft join -address=https://svc-vault.default.svc.cluster.local:8200 -tls-skip-verify

if kubectl get secret vault-init-keys; then
  echo "Retrieving unseal key..."
  kubectl get secret vault-init-keys -o jsonpath='{.data.vault-unseal-info\.json}' | base64 -d > /tmp/vault-unseal-info.json
  UNSEAL_KEY=$(jq -r '.unseal_keys_b64[0]' /tmp/vault-unseal-info.json)
else
  echo "Vault unseal key not found, initing a new cluster"
fi

if $UNSEAL_KEY -eq ""; then
  if kubectl get statefulset vault -o jsonpath='{.status.readyReplicas}' -ge 1; then
    until kubectl get secret vault-init-keys; do
      echo "Waiting for primary to unseal..."
      sleep 5
    done

    kubectl get secret vault-init-keys -o jsonpath='{.data.vault-unseal-info\.json}' | base64 -d > /tmp/vault-unseal-info.json
    UNSEAL_KEY=$(jq -r '.unseal_keys_b64[0]' /tmp/vault-unseal-info.json)
  else
    echo "Initing as vault primary..."
    vault operator init -address=https://${HOSTNAME}.svc-vault.default.svc.cluster.local:8200 -key-shares=1 -key-threshold=1 -format=json -tls-skip-verify > /tmp/vault-unseal-info.json
    UNSEAL_KEY=$(jq -r '.unseal_keys_b64[0]' /tmp/vault-unseal-info.json)
    ROOT_TOKEN=$(jq -r '.root_token' /tmp/vault-unseal-info.json)

    echo "Saving credentials to a secret..."
    kubectl create secret generic vault-init-keys --from-file=/tmp/vault-unseal-info.json --dry-run=client -o yaml | kubectl apply -f -

    rm -f /tmp/vault-unseal-info.json
    echo "Initialization of vault primary complete."
  fi
fi

echo "Unsealing Vault..."
vault operator unseal -address=https://${CONTAINER_NAME}.svc-vault.default.svc.cluster.local:8200 -tls-skip-verify $UNSEAL_KEY

echo "Unseal complete, vault node ready."
