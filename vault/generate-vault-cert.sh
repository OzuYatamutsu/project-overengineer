#!/bin/sh
# Generates the CA, key and certificate used for services to authenticate against vault.
# Run this from the project root, before building the container.

# Generate CA
openssl req -x509 -new -nodes -days 36135 -config vault/vault-openssl-ca.conf -keyout vault/vault-ca.key -out vault/vault-ca.crt

# Generate CSR for client cert
openssl req -new -nodes -config vault/vault-openssl.conf -keyout vault/vault.key -out vault/vault.csr

# Sign the CSR
openssl x509 -req -in vault/vault.csr -CA vault/vault-ca.crt -CAkey vault/vault-ca.key -CAcreateserial -out vault/vault.crt -days 36135 -sha256 extfile vault/vault-openssl.conf -extensions req_ext

# Verify
openssl x509 -in vault.crt -noout -text
