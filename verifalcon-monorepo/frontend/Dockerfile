# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Build arguments for Next.js public env vars (needed at build time)
ARG NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS
ARG NEXT_PUBLIC_PAYMENT_ROUTER_ADDRESS
ARG NEXT_PUBLIC_PINATA_JWT

# Set as environment variables for the build
ENV NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS=$NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS
ENV NEXT_PUBLIC_PAYMENT_ROUTER_ADDRESS=$NEXT_PUBLIC_PAYMENT_ROUTER_ADDRESS
ENV NEXT_PUBLIC_PINATA_JWT=$NEXT_PUBLIC_PINATA_JWT

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Create public folder if it doesn't exist (Next.js requires it)
RUN mkdir -p public

# Build the Next.js app
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built assets
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
