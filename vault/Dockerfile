FROM hashicorp/vault:1.18

ENV SKIP_CHOWN "true"
ENV SKIP_SETCAP "true"

# Install vault certificates and key
RUN apk add --no-cache ca-certificates kubectl
COPY vault.crt /usr/local/share/ca-certificates/vault.crt
COPY vault.crt /vault/tls/vault.crt
COPY vault.key /vault/tls/vault.key
RUN update-ca-certificates

# Copy unseal script
COPY vault/unseal-vault.sh /vault/unseal-vault.sh
RUN chmod +x /vault/unseal-vault.sh

CMD vault server -config=/vault/config/vault.hcl