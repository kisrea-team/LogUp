FROM node:22-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

RUN apt-get update \
  && apt-get install -y --no-install-recommends git ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

COPY . .
RUN npm run build
RUN npm prune --omit=dev

FROM node:22-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=7860
ENV BACKEND_NODE_PORT=8000
ENV DISABLE_SSH_TUNNEL=false

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/next.config.mjs ./
COPY --from=build /app/public ./public
COPY --from=build /app/.next ./.next
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/backend-repo ./backend-repo
COPY --from=build /app/lib ./lib
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/start-production.js ./start-production.js

EXPOSE 7860
CMD ["node", "start-production.js"]
