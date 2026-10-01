# Build stage
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Runtime stage — nginx fills nginx.conf.template from CLIENT_PORT/SERVER_PORT/MAX_UPLOAD_MB at startup; nginx serves the static build and reverse-proxies /api/* same-origin,
# which is why this deployment shape needs no CORS at all (see ../docs/deployment.md).
FROM nginx:alpine
COPY --from=build /app/dist/interview-practice.client/browser /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
ENV CLIENT_PORT=8002 SERVER_PORT=8001 MAX_UPLOAD_MB=10
EXPOSE ${CLIENT_PORT}
