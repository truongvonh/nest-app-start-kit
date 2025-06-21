# Multi-stage build for smaller production image

# Build stage
FROM node:20-alpine AS builder

# Install pnpm globally
RUN npm install -g pnpm

WORKDIR /usr/src/app

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install all dependencies (including dev dependencies for building)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm run build

# Production stage
FROM node:20-alpine AS production

# Install pnpm globally in production stage
RUN npm install -g pnpm

WORKDIR /usr/src/app

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install only production dependencies
RUN pnpm install --frozen-lockfile --prod

# Copy built application from builder stage
COPY --from=builder /usr/src/app/dist ./dist

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Change ownership of the app directory to the nodejs user
RUN chown -R nestjs:nodejs /usr/src/app
USER nestjs

EXPOSE 3000

CMD ["node", "dist/main"]
