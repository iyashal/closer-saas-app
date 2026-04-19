FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
COPY apps/server/package.json ./apps/server/
COPY packages/shared/package.json ./packages/shared/
RUN npm ci --workspace=apps/server --workspace=packages/shared

# Build shared package first
COPY packages/shared ./packages/shared
RUN npm run build -w packages/shared

# Build server
COPY apps/server ./apps/server
RUN npm run build -w apps/server

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/apps/server/dist ./dist
COPY --from=base /app/packages/shared/dist ./packages/shared/dist

EXPOSE 8080
CMD ["node", "dist/index.js"]
