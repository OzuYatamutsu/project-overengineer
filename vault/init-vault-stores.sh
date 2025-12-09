#!/bin/sh
set -e
VAULT_ADDR="https://${HOSTNAME}:8200"
ROOT_TOKEN=$(kubectl get secret vault-init-keys -o jsonpath='{.data.vault-unseal-info\.json}' | base64 -d | jq -r '.root_token')

echo "Enabling secret/ kv store..."
vault login -address="$VAULT_ADDR" "$ROOT_TOKEN"
vault secrets enable -address="$VAULT_ADDR" -path=secret/ kv

echo "Creating read token..."
vault policy write -address="$VAULT_ADDR" jwt-and-config-ro - <<EOF
path "secret/*" {
  capabilities = ["read", "list"]
}
path "transit/sign/jwt-signer" {
  capabilities = ["update"]
}
path "transit/verify/jwt-signer" {
  capabilities = ["update"]
}
path "pki/issue/svc-role" {
  capabilities = ["create","update"]
}
path "pki/roles/svc-role" {
  capabilities = ["read"]
}
EOF
vault token create -address="$VAULT_ADDR" -policy="jwt-and-config-ro" -period=1h -format=json > /vault/data/vault-unseal-info.json
VAULT_TOKEN=$(jq -r '.auth.client_token' /vault/data/vault-unseal-info.json)

echo "Saving Vault read token to Kubernetes secret..."
kubectl create secret generic vault-token \
  --from-literal=token=$VAULT_TOKEN \
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

echo "Enabling transit/ store..."
vault secrets enable -address="$VAULT_ADDR" transit

echo "Generating and storing new JWT signing token..."
vault write -address="$VAULT_ADDR" transit/keys/jwt-signer type=ed25519

echo "Enabling pki/ store..."
vault secrets enable -address="$VAULT_ADDR" pki

echo "Importing CA..."
vault write -address="$VAULT_ADDR" pki/config/ca pem_bundle=@/vault/tls/vault-ca.pem

echo "Configuring CRL locations..."
vault write -address="$VAULT_ADDR" pki/config/urls \
  issuing_certificates="${VAULT_ADDR}/v1/pki/ca" \
  crl_distribution_points="${VAULT_ADDR}/v1/pki/crl"

echo "Creating certificate role..."
vault write -address="$VAULT_ADDR" pki/roles/project-overengineer \
    allowed_domains=svc.cluster.local \
    allow_subdomains=true \
    max_ttl=24h

echo "Done initing vault stores."
