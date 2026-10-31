FROM node:24.22.1-bookworm-slim AS build
RUN npm install -g pnpm@12.14.0
WORKDIR /workspace
COPY . .
RUN pnpm install --frozen-lockfile --ignore-scripts
RUN pnpm --filter '@spraxium/rpc...' --filter '@spraxium/rpc-client...' build
RUN pnpm --filter @spraxium/rpc-demo build

FROM build AS discord-bot
WORKDIR /workspace/examples/backends
CMD ["node", "dist/bot/main.js"]

FROM build AS dashboard-api
WORKDIR /workspace/examples/backends
CMD ["node", "dist/hono/main.js"]
