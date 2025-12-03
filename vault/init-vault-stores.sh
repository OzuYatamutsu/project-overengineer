#!/bin/sh
VAULT_ADDR="https://svc-vault.default.svc.cluster.local:8200"
ROOT_TOKEN=$(kubectl get secret vault-init-keys -o jsonpath='{.data.vault-unseal-info\.json}' | base64 -d | jq -r '.root_token')

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

echo "Done."
