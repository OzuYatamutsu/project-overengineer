#!/bin/sh
set -e
echo "Generating passwords..."

if kubectl get secret initial-redis-password >/dev/null 2>&1; then
  echo "Found existing redis password, skipping."
else
  echo "Generating new redis password..."
  kubectl create secret generic initial-redis-password \
      --from-literal=password="$(LC_ALL=C tr -dc A-Za-z0-9 </dev/urandom | head -c 32)" \
      --dry-run=client -o yaml | kubectl apply -f -
  echo "Redis password generated and saved."
fi

if kubectl get secret grafana-admin-password >/dev/null 2>&1; then
  echo "Found existing grafana password, skipping."
else
  echo "Generating new grafana password..."
  kubectl create secret generic grafana-admin-password \
      --from-literal=password="$(LC_ALL=C tr -dc A-Za-z0-9 </dev/urandom | head -c 32)" \
      --dry-run=client -o yaml | kubectl apply -n monitoring-plane -f -
  echo "Grafana password generated and saved."
fi
