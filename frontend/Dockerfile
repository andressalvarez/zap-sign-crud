# Multi-stage Dockerfile for Angular

# Development stage
FROM node:20-alpine AS development

WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies (including devDependencies for development)
RUN npm ci

# Copy source code
COPY . .

# Expose port for development
EXPOSE 4200

# Development command with hot reload
CMD ["npm", "start"]

# Build stage
FROM node:20-alpine AS build

WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build --prod

# Production stage
FROM nginx:alpine AS production

# Copy built assets from build stage
COPY --from=build /usr/src/app/dist/zap-sign-frontend/browser /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
