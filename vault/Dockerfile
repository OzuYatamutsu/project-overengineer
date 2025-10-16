FROM hashicorp/vault:1.18

# Install vault certificates and key
COPY vault.crt /usr/local/share/ca-certificates/vault.crt
COPY vault.crt /vault/tls/vault.crt
COPY vault.key /vault/tls/vault.key
RUN update-ca-certificates

CMD vault server -dev -dev-root-token-id=root -dev-listen-address="0.0.0.0:8200"
