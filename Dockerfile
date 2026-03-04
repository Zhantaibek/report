# build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY client/package.json client/package-lock.json client/
RUN npm ci --prefix client
COPY . .
RUN npm run build

# run (Node + Java for Oracle JDBC bridge)
FROM node:20-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openjdk-17-jre-headless \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/client/dist ./client/dist
COPY server/oracle-bridge ./server/oracle-bridge
ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "server/dist/index.js"]
