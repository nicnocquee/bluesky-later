# Dockerfile
FROM node:18-alpine as builder

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ARG VITE_STORAGE_MODE=remote
ARG VITE_API_URL=http://api:3000
ARG VITE_METADATA_FETCHER_URL=https://linkpreview.magic.coolify.nico.fyi/api/v1/preview?url=
ARG VITE_IMAGE_PROXY_URL=https://allorigins.magic.coolify.nico.fyi/raw?url=
RUN VITE_STORAGE_MODE=$VITE_STORAGE_MODE \
    VITE_API_URL=$VITE_API_URL \
    VITE_METADATA_FETCHER_URL=$VITE_METADATA_FETCHER_URL \
    VITE_IMAGE_PROXY_URL=$VITE_IMAGE_PROXY_URL \
    npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.config /etc/nginx/conf.d/default.conf