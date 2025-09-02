FROM ollama/ollama:latest

RUN ollama serve & sleep 5; ollama pull llama3.2-vision;
    ps -ef | grep 'ollama serve' | grep -v grep | awk '{print $2}' | xargs -r kill -9