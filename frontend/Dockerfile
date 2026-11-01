FROM node:26.13.0-bookworm-slim@sha256:bc0a2afd3b74ce12222fc8bab99271e66257f021078f5f4a5d687a77d280c1d9 AS build
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
