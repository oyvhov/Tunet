#!/usr/bin/with-contenv bashio
echo "Starting Tunet Dashboard..."
cd /app
export NODE_ENV=production
export PORT=3002
exec node server/index.js
