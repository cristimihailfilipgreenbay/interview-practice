# Build stage
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Runtime stage — nginx serves the static build and reverse-proxies /api/* same-origin,
# which is why this deployment shape needs no CORS at all (see ../docs/deployment.md).
FROM nginx:alpine
COPY --from=build /app/dist/interview-practice.client/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
