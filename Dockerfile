# MooBee production image: builds the site, then runs the small Express server that serves it and
# proxies TMDB (so the TMDB token stays on the server).
#
#   docker build -t moobee .
#   docker run -p 8787:8787 -e TMDB_READ_ACCESS_TOKEN=... moobee
#
# Optional build argument: PLAYBACK_BASE_URL, the origin of your own video player (see README,
# "Playback status"). It is compiled into the site, so changing it means building again.

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG PLAYBACK_BASE_URL=
RUN if [ -n "$PLAYBACK_BASE_URL" ]; then export VITE_PLAYBACK_PROVIDER_BASE_URL="$PLAYBACK_BASE_URL"; fi; \
    npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production \
    PORT=8787
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY server ./server
COPY --from=build /app/dist ./dist
USER node
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- "http://127.0.0.1:${PORT}/" >/dev/null || exit 1
CMD ["node_modules/.bin/tsx", "server/index.ts"]
