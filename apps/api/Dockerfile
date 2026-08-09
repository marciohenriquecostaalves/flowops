FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

COPY package.json pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install

COPY . .
RUN pnpm db:generate
RUN pnpm --filter @flowops/api build

CMD ["node", "apps/api/dist/main.js"]
