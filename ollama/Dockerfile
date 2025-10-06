FROM ollama/ollama:latest
ENV OLLAMA_MODELS=/home/ollama/.ollama

# EXPOSE 11434
RUN useradd -m -u 1002 ollama
RUN mkdir $OLLAMA_MODELS && chown ollama:ollama $OLLAMA_MODELS

USER ollama
RUN ollama serve & sleep 5; ollama pull ibm/granite3.3-vision:2b-q8_0
