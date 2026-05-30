# Use Node.js 20 LTS as base
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Use a smaller runtime image
FROM node:20-alpine AS runner

WORKDIR /app

# Copy built files and production dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./

# Environment variables
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "if (process.env.DISCORD_TOKEN) process.exit(0); else process.exit(1);"

# Run the bot
CMD ["node", "dist/index.js"]
