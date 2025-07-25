# Multi-stage build for Angular frontend
FROM node:20-alpine as development

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Expose port for development
EXPOSE 4200

# Development command
CMD ["npm", "start", "--", "--host", "0.0.0.0", "--poll", "2000"]

# Production build stage
FROM node:20-alpine as build

WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the app
RUN npm run build

# Production stage with nginx
FROM nginx:alpine as production

# Copy built app from build stage
COPY --from=build /usr/src/app/dist/zap-sign-frontend /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
