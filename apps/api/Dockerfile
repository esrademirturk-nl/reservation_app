# Waypad API — production image
#   docker build -t waypad-api apps/api
#   docker run -p 3000:3000 --env-file apps/api/.env waypad-api

# 1. install all dependencies and build
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

# 2. small runtime image: compiled code, production dependencies, SQL migrations
FROM node:22-alpine AS runtime
ENV NODE_ENV=production PORT=3000 STORAGE_DIR=/data/storage
WORKDIR /app
COPY --from=build --chown=node:node /app/package.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/drizzle ./drizzle
COPY --chown=node:node docker/entrypoint.sh ./entrypoint.sh
RUN mkdir -p /data/storage && chown node:node /data/storage && chmod +x entrypoint.sh
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/api/v1/health" > /dev/null || exit 1
ENTRYPOINT ["./entrypoint.sh"]
