FROM node:22.22.2-bookworm-slim@sha256:9f6d5975c7dca860947d3915877f85607946403fc55349f39b4bc3688448bb6e AS build
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml .nvmrc ./
RUN pnpm install --frozen-lockfile
COPY . .
ARG PUBLIC_API_MOCK=off
ENV PUBLIC_API_MOCK=$PUBLIC_API_MOCK
RUN pnpm run build

FROM nginxinc/nginx-unprivileged:1.30-alpine@sha256:782bb89768cc87b7f95c18b95baa1af250e5d451f26794f59363540161147c01
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
