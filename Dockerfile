FROM node:20 AS builder

WORKDIR /app
COPY package*.json ./
ENV ROLLUP_SKIP_NODE_RESOLVE=true
RUN npm ci --legacy-peer-deps --platform=linux --arch=x64 \
    && npm rebuild @rollup/rollup-linux-x64-gnu
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
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 CMD curl-f http://localhost:3000/health || exit 1
EXPOSE 80