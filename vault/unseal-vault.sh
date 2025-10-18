#!/bin/sh
set -e

case "$HA_ROLE" in
  primary)
    echo "[INFO] HA_ROLE=primary → running unseal-vault-primary.sh"
    exec ./unseal-vault-primary.sh
    ;;
  secondary)
    echo "[INFO] HA_ROLE=secondary → running unseal-vault-secondary.sh"
    exec ./unseal-vault-secondary.sh
    ;;
  *)
    echo "[ERROR] Unknown or unset HA_ROLE: '$HA_ROLE'" >&2
    echo "Expected 'primary' or 'secondary'." >&2
    exit 1
    ;;
esac