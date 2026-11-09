#!/bin/sh
# Applies pending database migrations, optionally loads the demo data, then starts the API.
#   RUN_MIGRATIONS=false   skip migrations (e.g. when a separate job runs them)
#   SEED_DEMO=true         reset and load the demo account (demo environments only)
set -e

if [ "${RUN_MIGRATIONS:-true}" != "false" ]; then
  node dist/db/migrate.js
fi

if [ "${SEED_DEMO:-false}" = "true" ]; then
  node dist/db/seed/seed.js
fi

exec node dist/main.js
