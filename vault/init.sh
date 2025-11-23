#!/bin/sh
set -e

/bin/sh /vault/generate-pw.sh
/bin/sh /vault/unseal-vault.sh
