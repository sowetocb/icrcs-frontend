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

# Stage 1: Build the app — OFFLINE.
# The build network can't reach the npm registry (or Google Fonts) reliably, so
# we do NOT run `npm ci`. Instead we reuse the locally installed node_modules
# (copied via the build context; see .dockerignore). It already ships both the
# glibc and musl @next/swc native binaries, so it runs fine on this Alpine base.
FROM base AS builder
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