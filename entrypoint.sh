#!/bin/sh
set -e
node server/dist/db/migrate.js
exec node server/dist/index.js
