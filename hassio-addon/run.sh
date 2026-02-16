#!/usr/bin/with-contenv bashio

BRANCH=$(bashio::config 'branch')
REPO="https://github.com/jaburges/Tunet.git"
BUILD_DIR="/data/build"
NODE_VER=$(node --version)
CACHE_KEY="${BRANCH}|${NODE_VER}"
LAST_KEY=$(cat "${BUILD_DIR}/.cache_key" 2>/dev/null || echo "")

echo "─────────────────────────────────────────"
echo "  Tunet Dashboard (Jaburges)"
echo "  Branch: ${BRANCH}  Node: ${NODE_VER}"
echo "─────────────────────────────────────────"

if [ "${LAST_KEY}" != "${CACHE_KEY}" ] || [ ! -d "${BUILD_DIR}/dist" ]; then
  echo "Building branch ${BRANCH}..."
  rm -rf "${BUILD_DIR}"
  mkdir -p "${BUILD_DIR}"

  git clone --depth 1 --branch "${BRANCH}" "${REPO}" "${BUILD_DIR}/src"
  cd "${BUILD_DIR}/src"
  npm ci
  npm run build

  cp -r dist "${BUILD_DIR}/dist"
  cp -r server "${BUILD_DIR}/server"
  cp package.json "${BUILD_DIR}/package.json"
  cp package-lock.json "${BUILD_DIR}/package-lock.json"

  cd "${BUILD_DIR}"
  npm ci --omit=dev
  rm -rf "${BUILD_DIR}/src"
  echo "${CACHE_KEY}" > "${BUILD_DIR}/.cache_key"
  echo "Build complete."
else
  echo "Using cached build for branch ${BRANCH}."
fi

cd "${BUILD_DIR}"
export NODE_ENV=production
export PORT=3002
exec node server/index.js
