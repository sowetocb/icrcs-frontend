# FROM node:20-alpine AS base

# WORKDIR /app

# # Install dependencies
# COPY package.json package-lock.json ./
# RUN npm ci

# # Copy source
# COPY . .

# # Build Next.js app
# RUN npm run build

# # Production image — `next start` honours PORT; the admin expects port 6060.
# ENV PORT=6060
# ENV HOSTNAME=0.0.0.0
# EXPOSE 6060

# CMD ["npm", "run", "start"]

FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

# Stage 1: Install dependencies cleanly
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Build the app
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3: Light weight production runner
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=6060
ENV HOSTNAME="0.0.0.0"

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 6060

CMD ["node", "server.js"]