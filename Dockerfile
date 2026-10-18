# syntax=docker/dockerfile:1.7
# Dev/demo image, not for production: manifest is development-signed.
# Production signing: https://github.com/vibe-backend/sdk/issues/309
FROM debian:trixie-slim@sha256:a29215f6a35e51e22adffa17f89e9d2ef06214e64a2bad10d765c46aea49f11f AS download
ARG VIBE_VERSION=v1.0.0-rc.2
ARG TARGETARCH
RUN set -eu; \
    apt-get update; apt-get install -y --no-install-recommends ca-certificates curl; \
    rm -rf /var/lib/apt/lists/*; \
    case "$TARGETARCH" in amd64) T=x86_64-unknown-linux-gnu ;; arm64) T=aarch64-unknown-linux-gnu ;; *) exit 1 ;; esac; \
    mkdir -p /dist; \
    for name in SHA256SUMS "vibe-sdk-$T.tar.gz" "vibe-runtime-$T.tar.gz"; do \
      curl -fsSL --proto '=https' --tlsv1.2 "https://github.com/vibe-backend/sdk/releases/download/$VIBE_VERSION/$name" -o "/dist/$name"; \
    done

# Local testing before publication: replace this stage using --build-context assets=<dir>
# containing the same three files. Not used in CI or the README main path.
FROM scratch AS assets
COPY --from=download /dist/ /

FROM debian:trixie-slim@sha256:a29215f6a35e51e22adffa17f89e9d2ef06214e64a2bad10d765c46aea49f11f AS verify
ARG TARGETARCH
# Pinned digest of the v1.0.0-rc.2 SHA256SUMS; update it together with VIBE_VERSION.
ARG VIBE_SHA256SUMS_SHA256=8a2aa2165e711a1d6734a3e1226b096c8543e963ef7e5de065681549896dde78
COPY --from=assets / /dist/
RUN set -eu; \
    case "$TARGETARCH" in amd64) T=x86_64-unknown-linux-gnu ;; arm64) T=aarch64-unknown-linux-gnu ;; *) exit 1 ;; esac; \
    cd /dist; \
    printf "%s  SHA256SUMS\n" "$VIBE_SHA256SUMS_SHA256" | sha256sum -c -; \
    mkdir -p /opt/vibe/bin; \
    for kind in sdk runtime; do \
      name="vibe-$kind-$T.tar.gz"; binary=vibe; \
      if [ "$kind" = runtime ]; then binary=vibe-runtime; fi; \
      awk -v name="$name" '{ field=$2; sub(/^\*/, "", field); if (field == name) print }' SHA256SUMS > /tmp/checksum; \
      [ "$(wc -l < /tmp/checksum)" -eq 1 ]; \
      sha256sum -c /tmp/checksum; \
      tar -tzf "$name" > /tmp/entries; \
      [ "$(wc -l < /tmp/entries)" -eq 1 ]; \
      [ "$(cat /tmp/entries)" = "$binary" ]; \
      tar -xzf "$name" -C /opt/vibe/bin; chmod 0755 "/opt/vibe/bin/$binary"; \
    done

FROM debian:trixie-slim@sha256:a29215f6a35e51e22adffa17f89e9d2ef06214e64a2bad10d765c46aea49f11f AS build
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=verify /opt/vibe/bin/vibe /usr/local/bin/vibe
WORKDIR /src
COPY api/ ./api/
COPY providers/ ./providers/
# vibe build secret-scans the project and needs its .gitignore.
COPY .gitignore ./
ARG VIBE_FAKE=
ARG LLM_PROVIDER=
ARG LLM_MODEL=
ARG LLM_BASE_URL=
ARG LLM_API_STYLE=
ARG LLM_ALLOW_PRIVATE_HOST=
RUN --mount=type=secret,id=llm_api_key,required=false \
    --mount=type=secret,id=llm_base_url,required=false \
    set -eu; \
    case "$VIBE_FAKE" in ''|1) ;; *) printf '%s\n' 'VIBE_FAKE must be empty or 1' >&2; exit 1 ;; esac; \
    if [ "$VIBE_FAKE" = 1 ]; then \
      LLM_PROVIDER=fake vibe build -o /out/manifest.json; \
    else \
      [ -f /run/secrets/llm_api_key ] || { printf '%s\n' 'Missing required llm_api_key BuildKit secret' >&2; exit 1; }; \
      export LLM_API_KEY_FILE=/run/secrets/llm_api_key; \
      if [ -f /run/secrets/llm_base_url ]; then LLM_BASE_URL=$(cat /run/secrets/llm_base_url); fi; \
      [ -z "$LLM_PROVIDER" ] || export LLM_PROVIDER; \
      [ -z "$LLM_MODEL" ] || export LLM_MODEL; \
      [ -z "$LLM_BASE_URL" ] || export LLM_BASE_URL; \
      [ -z "$LLM_API_STYLE" ] || export LLM_API_STYLE; \
      [ -z "$LLM_ALLOW_PRIVATE_HOST" ] || export LLM_ALLOW_PRIVATE_HOST; \
      vibe build -o /out/manifest.json; \
    fi; \
    mkdir -p /out/.vibe; cp .vibe/signing.pub /out/.vibe/signing.pub; \
    test -z "$(find /out -name signing.key -print)"; \
    test "$(find /out -type f | wc -l)" -eq 2

FROM debian:trixie-slim@sha256:a29215f6a35e51e22adffa17f89e9d2ef06214e64a2bad10d765c46aea49f11f
LABEL org.opencontainers.image.source="https://github.com/vibe-backend/sample-hello-world" \
      org.opencontainers.image.description="Dev/demo image, not for production; development-signed manifest (sdk#309)"
RUN useradd --system --uid 10001 --no-create-home --shell /usr/sbin/nologin vibe
COPY --from=verify /opt/vibe/bin/vibe-runtime /usr/local/bin/vibe-runtime
COPY --from=build /out/manifest.json /app/manifest.json
COPY --from=build /out/.vibe/signing.pub /app/.vibe/signing.pub
ENV VIBE_ENV=development VIBE_DB=memory
ARG VIBE_FAKE
ENV VIBE_ALLOW_TEST_BUILD=${VIBE_FAKE:+1}
USER 10001
EXPOSE 8080
CMD ["/bin/sh","-c","exec vibe-runtime --artifact /app --addr 0.0.0.0:8080 ${VIBE_ALLOW_TEST_BUILD:+--allow-test-build}"]
