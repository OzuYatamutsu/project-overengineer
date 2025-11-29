#!/bin/sh
set -e

# First, determine primary state
IS_PRIMARY=""
echo "Setting primary state..."
ready=$(kubectl get statefulset vault -o jsonpath='{.status.readyReplicas}' || echo 0)
if [ "${ready:-0}" -ge 2 ]; then
  echo "This looks like a secondary."
  IS_PRIMARY=false
else
  echo "This looks like a primary."
  IS_PRIMARY=true
fi

# Then run all other init scripts
IS_PRIMARY=$IS_PRIMARY /bin/sh /vault/generate-pw.sh
IS_PRIMARY=$IS_PRIMARY /bin/sh /vault/unseal-vault.sh
if [ "$IS_PRIMARY" = true ]; then
  IS_PRIMARY=$IS_PRIMARY /bin/sh /vault/renew-keys.sh
fi
