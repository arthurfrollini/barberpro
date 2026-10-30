FROM node:24-alpine AS base
WORKDIR /app
COPY package.json package-lock.json ./

# dev: all dependencies, source mounted by docker compose, migrations run on start
FROM base AS dev
RUN npm ci
COPY . .
CMD ["sh", "-c", "npm run migration:run && npm run dev"]

FROM base AS build
RUN npm ci
COPY . .
RUN npm run build

FROM base AS prod
ENV NODE_ENV=production
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
USER node
CMD ["node", "dist/main.js"]
