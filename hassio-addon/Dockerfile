ARG BUILD_FROM
# ── Stage 1: Build from source ────────────────────────────────────────
FROM node:20 AS builder

WORKDIR /src
COPY package*.json ./
RUN npm ci
COPY . .
RUN SKIP_POSTBUILD=1 npm run build

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

# Copy run script from build context (repo root)
COPY hassio-addon/run.sh /run.sh
RUN chmod a+x /run.sh

CMD [ "/run.sh" ]
