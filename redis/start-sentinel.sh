#!/bin/sh
# Inject redis-sentinel runtime variables and start sentinel.
set -e

cat > /tmp/sentinel.conf <<EOF
bind 0.0.0.0
port ${SENTINEL_PORT}
sentinel monitor redis-master ${REDIS_HOST} ${REDIS_PORT} 2
$( [ -n "$REDIS_PASSWORD" ] && echo "sentinel auth-pass redis-master ${REDIS_PASSWORD}" )
sentinel down-after-milliseconds redis-master 5000
sentinel parallel-syncs redis-master 1
sentinel failover-timeout redis-master 10000
sentinel resolve-hostnames yes
EOF

exec redis-sentinel /tmp/sentinel.conf
