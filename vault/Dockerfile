FROM hashicorp/vault:1.18

ENV SKIP_CHOWN="true"
ENV SKIP_SETCAP="true"
ENV NODE_OPTIONS=--use-openssl-ca

# Install vault certificates and key
RUN apk add --no-cache curl ca-certificates kubectl jq
COPY vault/vault-ca.crt /usr/local/share/ca-certificates/vault-ca.crt
COPY vault/vault-ca.crt /vault/tls/vault-ca.crt
COPY vault/vault.crt /vault/tls/vault.crt
COPY vault/vault.key /vault/tls/vault.key
COPY vault/vault-chain.pem /vault/tls/vault-chain.pem
RUN update-ca-certificates --fresh --verbose

# Copy unseal script
COPY vault/unseal-vault.sh /vault/unseal-vault.sh
RUN chmod +x /vault/unseal-vault.sh

CMD ["vault", "server", "-config=/vault/config/vault.hcl"]
