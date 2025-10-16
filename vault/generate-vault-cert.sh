#!/bin/sh
# Generates the key and certificate used for services to authenticate against vault.
# Run this from the project root, before building the container.
openssl req -x509 -nodes -days 36135 -newkey rsa:2048 -keyout vault.key -out vault.crt -config vault/vault-openssl.conf
openssl x509 -in vault.crt -noout -text
