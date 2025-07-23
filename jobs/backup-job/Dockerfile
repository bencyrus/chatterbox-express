# Simple Dockerfile for Google Cloud Run Job
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy files
COPY package.json ./
COPY backup-job.js ./

# Run as non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nodeuser -u 1001
USER nodeuser

# Run the backup job
CMD ["node", "backup-job.js"] 