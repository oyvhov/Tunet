#!/usr/bin/with-contenv bashio

BRANCH=$(bashio::config 'branch')
REPO="https://github.com/jaburges/Tunet.git"
BUILD_DIR="/data/build"
NODE_VER=$(node --version)

# Check the latest commit on the remote branch
REMOTE_HASH=$(git ls-remote "${REPO}" "refs/heads/${BRANCH}" 2>/dev/null | cut -f1)
REMOTE_HASH=${REMOTE_HASH:-unknown}

CACHE_KEY="${BRANCH}|${NODE_VER}|${REMOTE_HASH}"
LAST_KEY=$(cat "${BUILD_DIR}/.cache_key" 2>/dev/null || echo "")

echo "─────────────────────────────────────────"
echo "  Tunet Dashboard (Jaburges)"
echo "  Branch: ${BRANCH}  Node: ${NODE_VER}"
echo "  Commit: ${REMOTE_HASH:0:8}"
echo "─────────────────────────────────────────"

if [ "${LAST_KEY}" != "${CACHE_KEY}" ] || [ ! -d "${BUILD_DIR}/dist" ]; then
  echo "Building branch ${BRANCH} (${REMOTE_HASH:0:8})..."
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
