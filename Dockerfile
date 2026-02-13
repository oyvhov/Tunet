# Stage 1: Build frontend
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Skip postbuild (docker compose build) inside Docker
RUN SKIP_POSTBUILD=1 npm run build

# Stage 2: Production server (Express + static files)
FROM node:20-alpine

# Install build tools for native modules (better-sqlite3)
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

# Clean up build tools to reduce image size
RUN apk del python3 make g++

# Copy server code
COPY server ./server
# Copy built frontend
COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
ENV PORT=3002
ENV DATA_DIR=/app/data

EXPOSE 3002
VOLUME ["/app/data"]

CMD ["node", "server/index.js"]
