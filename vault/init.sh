#!/bin/sh
set -e
IS_PRIMARY=""
PREVIOUSLY_INITED=false
VAULT_ADDR="https://svc-vault.default.svc.cluster.local:8200"

if curl -k ${VAULT_ADDR}/v1/sys/health; then
  echo "Primary init may be in progress on another pod. Waiting..."
  sleep 30
fi

# First, determine primary state
echo "Setting primary state..."
ready=$(kubectl get statefulset vault -o jsonpath='{.status.readyReplicas}' || echo 0)
if [ "${ready:-0}" -ge 2 ]; then
  echo "This looks like a secondary."
  IS_PRIMARY=false
else
  echo "This looks like a primary."
  IS_PRIMARY=true
fi

# Then, determine if the cluster has been inited before
if kubectl get secret vault-init-keys >/dev/null 2>&1; then
  echo "Found existing unseal key, this cluster was previously inited."
  PREVIOUSLY_INITED=true
else
  echo "Didn't find existing unseal key, will init a new cluster."
  PREVIOUSLY_INITED=false
fi

# Then run all other init scripts
/bin/sh /vault/generate-pw.sh
IS_PRIMARY=$IS_PRIMARY PREVIOUSLY_INITED=$PREVIOUSLY_INITED /bin/sh /vault/unseal-vault.sh
if [ "$IS_PRIMARY" = true ] && [ "$PREVIOUSLY_INITED" = false ]; then
  /bin/sh /vault/init-vault-stores.sh
fi
if [ "$IS_PRIMARY" = true ]; then
  IS_PRIMARY=$IS_PRIMARY /bin/sh /vault/renew-keys.sh
fi
