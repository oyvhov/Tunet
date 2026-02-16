ARG BUILD_FROM
FROM ${BUILD_FROM:-ghcr.io/hassio-addons/base:16.3.2}

RUN apk add --no-cache nodejs npm git

WORKDIR /app

COPY run.sh /run.sh
RUN chmod a+x /run.sh

CMD [ "/run.sh" ]
