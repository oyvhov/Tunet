#!/usr/bin/with-contenv bashio
echo "Starting Tunet Dashboard..."
cd /app
export NODE_ENV=production
export PORT=3002

if bashio::config.has_value 'data_encryption_mode'; then
	export TUNET_ENCRYPTION_MODE="$(bashio::config 'data_encryption_mode')"
fi

if bashio::config.has_value 'data_encryption_key'; then
	export TUNET_DATA_KEY="$(bashio::config 'data_encryption_key')"
fi

exec node server/index.js
