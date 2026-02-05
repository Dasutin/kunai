# Build stage
FROM node:20-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json tsconfig.json ./
COPY client ./client
COPY server ./server
COPY shared ./shared
RUN npm ci
RUN npm run build
# Remove dev deps after build to shrink the copied node_modules
RUN npm prune --omit=dev

# Runtime stage
FROM node:20-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
ENV DATA_DIR=/data
ENV PORT=3000
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/shared ./shared
COPY --from=build /app/server/migrations ./migrations
COPY package.json package-lock.json ./
EXPOSE 3000
VOLUME ["/data"]
CMD ["node", "dist/server/server/src/index.js"]
