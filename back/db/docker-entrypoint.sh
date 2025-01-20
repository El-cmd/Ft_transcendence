#!/bin/bash
set -e

# Substitute environment variables in init.sql
envsubst < /docker-entrypoint-initdb.d/init.sql > /docker-entrypoint-initdb.d/init.sql.tmp
mv /docker-entrypoint-initdb.d/init.sql.tmp /docker-entrypoint-initdb.d/init.sql

# Run the original entrypoint script
exec /usr/local/bin/docker-entrypoint.sh "$@"