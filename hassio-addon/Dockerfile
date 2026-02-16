ARG BUILD_FROM
FROM node:22-alpine AS node-bin

FROM ${BUILD_FROM:-ghcr.io/hassio-addons/base:16.3.2}

# Copy Node.js 22 from official image (Alpine's nodejs package is too old)
COPY --from=node-bin /usr/local/bin/node /usr/local/bin/
COPY --from=node-bin /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -sf ../lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
 && ln -sf ../lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx

RUN apk add --no-cache git libstdc++

WORKDIR /app

COPY run.sh /run.sh
RUN chmod a+x /run.sh

CMD [ "/run.sh" ]
