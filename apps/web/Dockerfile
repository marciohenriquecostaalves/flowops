FROM node:22-alpine
RUN corepack enable
WORKDIR /app
COPY . .
RUN pnpm install
RUN pnpm --filter @flowops/web build
EXPOSE 3000
CMD ["pnpm", "--filter", "@flowops/web", "start"]
