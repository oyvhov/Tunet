ARG BUILD_VERSION
# ── Stage 1: Build from source ────────────────────────────────────────
FROM node:26-alpine AS builder
ARG BUILD_VERSION
RUN apk add --no-cache curl tar python3 make g++ \
 && set -eux \
 && REF="${BUILD_VERSION:-}" \
 && URL="" \
 && if [ -n "$REF" ]; then URL="https://codeload.github.com/oyvhov/Tunet/tar.gz/refs/tags/v${REF}"; fi \
 && if [ -n "$URL" ] && ! curl -fsSL "$URL" -o /tmp/tunet.tar.gz; then \
			URL="https://codeload.github.com/oyvhov/Tunet/tar.gz/refs/tags/${REF}"; \
		fi \
 && if [ -n "$URL" ] && ! curl -fsSL "$URL" -o /tmp/tunet.tar.gz; then \
			URL="https://codeload.github.com/oyvhov/Tunet/tar.gz/refs/heads/main"; \
		fi \
 && if [ -z "$URL" ]; then URL="https://codeload.github.com/oyvhov/Tunet/tar.gz/refs/heads/main"; fi \
 && if [ ! -f /tmp/tunet.tar.gz ]; then curl -fsSL "$URL" -o /tmp/tunet.tar.gz; fi \
 && mkdir -p /src \
 && tar -xzf /tmp/tunet.tar.gz --strip-components=1 -C /src \
 && cd /src \
 && npm ci \
 && npm run build

# ── Stage 2: Production image ────────────────────────────────────────
FROM ghcr.io/hassio-addons/base:21.0.0
ARG BUILD_VERSION
ARG BUILD_ARCH
LABEL \
	io.hass.version="${BUILD_VERSION}" \
	io.hass.type="app" \
	io.hass.arch="${BUILD_ARCH}"

# The base image pins musl in /etc/apk/world; let apk move it to the version
# the current Alpine repo's musl-dev (pulled in by g++) requires.
RUN apk add --no-cache --upgrade musl nodejs npm python3 make g++

WORKDIR /app

# Copy only what's needed for production
COPY --from=builder /src/dist ./dist
COPY --from=builder /src/server ./server
COPY --from=builder /src/package.json .
COPY --from=builder /src/package-lock.json .

# Install production dependencies only
RUN npm ci --omit=dev \
 && apk del python3 make g++

# Copy run script from build context (hassio-addon/)
COPY run.sh /run.sh
RUN chmod a+x /run.sh

CMD [ "/run.sh" ]
