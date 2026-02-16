#!/usr/bin/with-contenv bashio

BRANCH=$(bashio::config 'branch')
REPO="https://github.com/jaburges/Tunet.git"
BUILD_DIR="/data/build"
LAST_BRANCH=$(cat "${BUILD_DIR}/.branch" 2>/dev/null || echo "")

echo "─────────────────────────────────────────"
echo "  Tunet Dashboard (Jaburges)"
echo "  Branch: ${BRANCH}"
echo "─────────────────────────────────────────"

if [ "${LAST_BRANCH}" != "${BRANCH}" ] || [ ! -d "${BUILD_DIR}/dist" ]; then
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
  echo "${BRANCH}" > "${BUILD_DIR}/.branch"
  echo "Build complete."
else
  echo "Using cached build for branch ${BRANCH}."
fi

cd "${BUILD_DIR}"
export NODE_ENV=production
export PORT=3002
exec node server/index.js
