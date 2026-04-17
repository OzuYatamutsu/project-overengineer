FROM ollama/ollama:latest
ENV OLLAMA_MODELS=/home/ollama/.ollama
ENV NODE_OPTIONS=--use-openssl-ca
ENV MODEL_NAME="ministral-3:3b"

# Install curl for initial model load
RUN apt update && apt install -y curl

# Install local vault certificates
COPY vault/vault-ca.crt /usr/local/share/ca-certificates/vault-ca.crt
RUN update-ca-certificates --fresh --verbose

# EXPOSE 11434
RUN useradd -m -u 1002 ollama
RUN mkdir $OLLAMA_MODELS && chown ollama:ollama $OLLAMA_MODELS

USER ollama
RUN ollama serve & sleep 5; ollama pull $MODEL_NAME
