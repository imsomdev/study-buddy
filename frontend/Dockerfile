FROM node:18-slim AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Build the application
# We use build-time env if needed, but for Next.js 13+ it's often better to handle at runtime or build
RUN npm run build

FROM node:18-slim AS runner

WORKDIR /app

# Copy only necessary files from builder
# Next.js standalone build is preferred but standard build works too
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production

# Run the application
CMD ["npm", "run", "start"]
