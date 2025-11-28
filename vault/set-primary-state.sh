#!/bin/sh
IS_PRIMARY=""

echo "Setting primary state..."

ready=$(kubectl get statefulset vault -o jsonpath='{.status.readyReplicas}' || echo 0)
if [ "${ready:-0}" -ge 2 ]; then
  echo "This looks like a secondary."
  IS_PRIMARY=false
else
  echo "This looks like a primary."
  IS_PRIMARY=true
fi

echo "IS_PRIMARY=$IS_PRIMARY" > state.sh
