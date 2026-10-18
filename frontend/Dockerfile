FROM node:22.22.2-bookworm-slim@sha256:9f6d5975c7dca860947d3915877f85607946403fc55349f39b4bc3688448bb6e AS build
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml .nvmrc ./
RUN pnpm install --frozen-lockfile
COPY . .
ARG PUBLIC_API_MOCK=counter
ARG PUBLIC_API_SLUG=dev
ENV PUBLIC_API_MOCK=$PUBLIC_API_MOCK PUBLIC_API_SLUG=$PUBLIC_API_SLUG
RUN pnpm run build

FROM nginxinc/nginx-unprivileged:1.31-alpine@sha256:378d0c32f6562f7fd9629170797f57d2b953aa09be983b3daaf4809bb039ca00
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
