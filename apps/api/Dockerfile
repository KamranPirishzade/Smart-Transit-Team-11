# Build from the repo root:  docker build -f apps/api/Dockerfile -t smart-transit-api .
FROM node:22-bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /repo
# The whole repo is copied first: the postinstall hook runs `prisma generate`, which needs the schema.
COPY . .
RUN npm ci
RUN npm run build -w @smart-transit/api

FROM node:22-bookworm-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
WORKDIR /repo
COPY --from=build /repo/package.json ./package.json
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/packages ./packages
COPY --from=build /repo/data ./data
COPY --from=build /repo/apps/api ./apps/api
WORKDIR /repo/apps/api
EXPOSE 4000
# Apply migrations, then start. Seed once with:  docker compose run --rm api npx prisma db seed
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
