ARG BUILD_FROM
# ── Stage 1: Build from source ────────────────────────────────────────
FROM node:20-alpine AS builder
# Single RUN to prevent ALL Docker layer caching issues
RUN apk add --no-cache git \
 && git clone --depth 1 --branch main https://github.com/oyvhov/Tunet.git /src \
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
