FROM node:24-alpine
WORKDIR /app
COPY package.json server.js ./
COPY lib ./lib
COPY public ./public
COPY scripts ./scripts
# Railway injects its own PORT at runtime, which overrides this default.
ENV NODE_ENV=production PORT=3000 DB_FILE=/data/comms.db TRUST_PROXY=1
# Runs as root on purpose: Railway mounts volumes as root, so a non-root user can't write /data.
RUN mkdir -p /data
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:${PORT}/healthz || exit 1
CMD ["node", "--disable-warning=ExperimentalWarning", "server.js"]
