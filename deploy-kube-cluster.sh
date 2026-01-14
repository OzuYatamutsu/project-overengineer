#!/bin/bash
set -e

check_rollout() {
    local kind="$1"
    local name="$2"
    local timeout="$3"

    echo "[waiting for $name]"
    if ! kubectl rollout status "$kind/$name" --timeout="$timeout"; then
        echo "ERROR: Issue deploying $name; check kubectl logs for more details." >&2
        return 1
    fi
}

kubectl apply -f vault/service.yaml
kubectl rollout status statefulset/vault --timeout=90s
timeout=60
while ! kubectl get secret vault-token >/dev/null 2>&1; do
    sleep 1
    timeout=$((timeout-1))
    if [ "$timeout" -le 0 ]; then
        echo "ERROR: vault-token secret not found (normally created at runtime)." >&2
        echo "Check logs for vault service, vault-init sidecar." >&2
        exit 1
    fi
done
kubectl apply -f redis/service.yaml
kubectl apply -f janitor/service.yaml
kubectl apply -f status-api/service.yaml
kubectl apply -f ocr-worker/service.yaml
kubectl apply -f project-overengineer-fe/service.yaml

check_rollout statefulset redis-master 600s
check_rollout statefulset redis-replica 600s
check_rollout deployment redis-sentinel 600s
check_rollout deployment janitor 600s
check_rollout deployment status-api 600s
check_rollout statefulset ocr-worker 600s
check_rollout statefulset project-overengineer-fe 600s

kubectl get all
echo "Deploy complete!"
