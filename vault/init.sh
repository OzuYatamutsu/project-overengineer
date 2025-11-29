#!/bin/sh
set -e

/bin/sh /vault/set-primary-state.sh  # Generates state.sh
source /vault/state.sh

/bin/sh /vault/generate-pw.sh
/bin/sh /vault/unseal-vault.sh
if [ "$IS_PRIMARY" = true ]; then
  /bin/sh /vault/renew-keys.sh
fi
