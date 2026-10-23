#!/usr/bin/with-contenv bashio
echo "Starting Tunet Dashboard..."
cd /app
export NODE_ENV=production
export PORT=3002
export TUNET_TRUST_SUPERVISOR_INGRESS=1

if bashio::config.has_value 'internal_ha_url'; then
	export TUNET_INTERNAL_HA_URL="$(bashio::config 'internal_ha_url')"
fi
if bashio::config.has_value 'internal_ha_fallback_url'; then
	export TUNET_INTERNAL_HA_FALLBACK_URL="$(bashio::config 'internal_ha_fallback_url')"
fi

if bashio::config.has_value 'data_encryption_mode'; then
	export TUNET_ENCRYPTION_MODE="$(bashio::config 'data_encryption_mode')"
fi

if bashio::config.has_value 'data_encryption_key'; then
	export TUNET_DATA_KEY="$(bashio::config 'data_encryption_key')"
fi

if bashio::config.has_value 'data_encryption_salt'; then
	export TUNET_DATA_KEY_SALT="$(bashio::config 'data_encryption_salt')"
fi

if [ "${TUNET_ENCRYPTION_MODE}" = "dual" ] || [ "${TUNET_ENCRYPTION_MODE}" = "enc_only" ]; then
	if [ -z "${TUNET_DATA_KEY}" ]; then
		bashio::log.fatal "data_encryption_key is required when data_encryption_mode is '${TUNET_ENCRYPTION_MODE}'"
		exit 1
	fi
fi

exec node server/index.js
