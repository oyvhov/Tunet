ARG BUILD_FROM
ARG BUILD_VERSION
# ── Stage 1: Build from source ────────────────────────────────────────
FROM node:20-alpine AS builder
ARG BUILD_VERSION
RUN apk add --no-cache curl tar \
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
ARG BUILD_FROM
FROM ${BUILD_FROM:-ghcr.io/hassio-addons/base:16.3.2}

RUN apk add --no-cache nodejs npm

WORKDIR /app

# Copy only what's needed for production
COPY --from=builder /src/dist ./dist
COPY --from=builder /src/server ./server
COPY --from=builder /src/package.json .
COPY --from=builder /src/package-lock.json .

# Install production dependencies only
RUN npm ci --omit=dev

# Copy run script from build context (hassio-addon/)
COPY run.sh /run.sh
RUN chmod a+x /run.sh

CMD [ "/run.sh" ]
