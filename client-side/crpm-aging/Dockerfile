# Multi-stage build: build with Node, serve with nginx
FROM node:20 AS builder

WORKDIR /app
ARG VITE_API_BASE_URL=http://backend:3000
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# Install deps and build
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

COPY . .
RUN npm run build

# Production image: nginx serving built files
FROM nginx:stable-alpine

# Remove default nginx html
RUN rm -rf /usr/share/nginx/html/*

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files from builder
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

# If missing, add a multi-stage Dockerfile that builds the Vite app and serves with nginx.
