# Hello world with Vibe

This sample has a bilingual React page and an API written in ordinary sentences. No programming is needed to write the backend `.md` files. `vibe build` uses an AI model to turn those sentences into generated locks.

- `GET /api/web/v1/hello` returns `{"message":"hello world"}`.
- `GET /api/web/v1/counter` returns `{"value": n}`, starting at zero.
- `POST /api/web/v1/increment-counter` adds one atomically and returns `{"value": n}`.

Anyone can use these APIs. The project uses default slug `dev`; URLs need no slug. Public writes are limited to 50 per client IP per day and 1000 per tenant per day; further writes return 429. Data lives in memory and is lost when the runtime restarts.

`backend/` holds `api/`, `models/`, `slugs.example.json`, `Dockerfile`, and `.gitignore`. `frontend/` holds the React page.

Install SDK `v1.0.0-rc.8` with `curl`, `tar`, and an authenticated GitHub CLI (`gh auth login`). The installer verifies checksums and GitHub attestations. Add `--runtime` to install `vibe-runtime` too.

```sh
curl -fsSL https://raw.githubusercontent.com/vibe-backend/sdk/v1.0.0-rc.8/scripts/vibe-install.sh -o vibe-install.sh
sh vibe-install.sh install --version v1.0.0-rc.8
export PATH="$HOME/.local/bin:$PATH"
cd backend
vibe
vibe build
vibe run
```

Run `vibe` once to set up AI settings. It stores them in your user config, `~/.config/vibe/llm.env`, with the key in a separate private file, outside the project. Never commit AI credentials. `vibe run` serves on `127.0.0.1:8080` by default.

CI and Docker build with the fake provider, so no AI key is needed:

```sh
cd backend
LLM_PROVIDER=fake vibe build --check
LLM_PROVIDER=fake vibe build
vibe run --allow-test-build
```

Recording model answers locally is optional and must not be committed. From `backend/`:

```sh
VIBE_LLM_RECORD=fixtures/llm vibe build
```

That writes `fixtures/llm/`. Git ignores that directory. Do not commit those files. Never commit locks (`*.lock.md`), `.vibe/` (keys and cache), or `manifest.json`.

From the repository root:

```sh
docker build -t sample-hello-world:test backend
docker run --rm -p 8080:8080 sample-hello-world:test
curl http://127.0.0.1:8080/api/web/v1/hello
curl http://127.0.0.1:8080/api/web/v1/counter
curl -X POST http://127.0.0.1:8080/api/web/v1/increment-counter
```

Docker builds with the fake provider (`VIBE_LLM=fake`). The image has no AI key and no recorded answers. Local recordings, if you make them, stay on your machine and are not copied into the image.

This image is a dev/demo test build and must **NOT** run with `VIBE_ENV=production`: production refuses the in-memory store. For real use, add `backend/providers/main.md` with PostgreSQL. The manifest is development-signed; production signing is tracked in [sdk#309](https://github.com/vibe-backend/sdk/issues/309).

The Dockerfile pins `VIBE_VERSION=v1.0.0-rc.8`, Debian base digests, and the v1.0.0-rc.8 `SHA256SUMS` digest (`VIBE_SHA256SUMS_SHA256`):
`65d8076674cd402eee21a23040aa59880990787a8f783091d952706ff56a0fef`.
Update version and digest together. Checksums and archive entry names are verified. Release assets must be published before building. The runtime image contains the manifest, public signing key, slug settings and runtime, runs as UID 10001, and sets `VIBE_ENV=development`, `VIBE_DB=memory`, and `VIBE_ALLOW_TEST_BUILD=1` with `--allow-test-build`. It contains no signing private key or AI settings.

## Signed releases

No release has been made yet; the first signed release happens later. A maintainer pushes a `v*` tag, then a reviewer approves the `release` environment in GitHub Actions. The SDK reusable workflow builds the manifest from the `.md` sources with the configured AI model. It signs without stored keys using GitHub OIDC and Sigstore, attests the manifest, and publishes `manifest.json` plus its signature bundle on the GitHub Release. Pull requests never sign anything.

Maintainers set up repository variables `VIBE_LLM_BASE_URL` and `VIBE_LLM_MODEL`, the `release` environment secret `VIBE_LLM_API_KEY`, and environment reviewers in GitHub settings, outside this repo. Use a public AI endpoint; private hosts are refused. The variables must be repository variables because the caller cannot read environment-scoped variables. Keep the SDK workflow tag equal to the runtime version.

Deployers download the manifest and bundle into `dist/`, check the manifest digest against the workflow output, and use the SDK `v1.0.0-rc.8` runtime with `cosign` on `PATH`:

```sh
VIBE_ENV=development VIBE_RELEASE_VERSION=<version without v> vibe-runtime verify --artifact dist \
  --expect-identity 'https://github.com/vibe-backend/sample-hello-world/.github/workflows/release.yml@refs/tags/v*' \
  --expect-issuer https://token.actions.githubusercontent.com \
  --expect-repository-id 1423874448
```

The identity is this repository's release workflow at a `v*` tag; the SDK signer half is built into the runtime and needs no flag. The issuer is GitHub Actions. The repository id is this repository's numeric id.

From `dist/`, also check the attestation against the release tag and commit, then deploy those same files without rebuilding:

```sh
gh attestation verify manifest.json --repo vibe-backend/sample-hello-world \
  --signer-workflow vibe-backend/sdk/.github/workflows/vibe-project-release.yml \
  --source-ref refs/tags/v<version> --source-digest <commit> --deny-self-hosted-runners
```

This sample stores data in memory, so even a signed release is a demo and must not run with `VIBE_ENV=production`.

For the frontend:

```sh
cd frontend
nvm use
pnpm install --frozen-lockfile
pnpm dev
```

Open http://localhost:3000. The development server proxies `/api` to `127.0.0.1:8080`; `API_PROXY_TARGET` can change that target. See `frontend/.env.example`. Public variables are baked into frontend builds.

| `PUBLIC_API_MOCK` | Hello | Counter |
| --- | --- | --- |
| `off` (default) | Real API | Real API |
| `counter` | Real API | Mock |
| `all` | Mock | Mock |

Use `PUBLIC_API_MOCK=all pnpm dev` without a backend. Mock data is labelled, lives in memory, and resets on page reload. `PUBLIC_API_MOCK_DELAY_MS` defaults to 300. Run `pnpm run lint`, `pnpm run typecheck`, `pnpm test`, and `pnpm run build` from `frontend/`.

Run `docker compose up --build` from the repository root and open http://127.0.0.1:8081/. It builds the API with the fake provider and uses real APIs by default; `PUBLIC_API_MOCK=counter docker compose up --build` mocks the counter. nginx overwrites `X-Forwarded-For` with the real client address. The runtime trusts only nginx at `10.231.0.10` via `VIBE_TRUSTED_PROXIES`. If subnet `10.231.0.0/24` conflicts with your network, change the subnet, nginx address and trusted proxy together.

CI builds with the fake provider and puts generated locks in the job summary, tests 50 concurrent writes with unique values 2..51 from a second client, and scans image layers for keys. Compose tests keep SPA routes working and verify that 49 spoofed forwarding headers still consume one client's quota, the next write returns 429 `RATE_LIMITED`, and another real client can write value 51. Pull requests from forks cannot get the id-token permission, so the signed-release self-test may fail to start on fork PRs.

## 繁體中文

本範例包含中英文 React 頁面，以及用日常句子描述的 API。編寫後端 `.md` 檔案不需寫程式；`vibe build` 透過 AI 模型將句子轉成產生的鎖定檔。

- `GET /api/web/v1/hello` 回傳 `{"message":"hello world"}`。
- `GET /api/web/v1/counter` 回傳 `{"value": n}`，初始為零。
- `POST /api/web/v1/increment-counter` 以原子操作加一並回傳 `{"value": n}`。

任何人皆可使用。專案預設 slug 為 `dev`，網址不需包含 slug。公開寫入限制為每個用戶端 IP 每日 50 次、每租戶每日 1000 次；超過回傳 429。資料只存於記憶體，runtime 重啟即遺失。

`backend/` 包含 `api/`、`models/`、`slugs.example.json`、`Dockerfile` 及 `.gitignore`。`frontend/` 包含 React 頁面。

安裝 SDK `v1.0.0-rc.8`，需要 `curl`、`tar` 及已登入的 GitHub CLI（`gh auth login`）。安裝程式驗證校驗碼及 GitHub 證明；加上 `--runtime` 可同時安裝 `vibe-runtime`。

```sh
curl -fsSL https://raw.githubusercontent.com/vibe-backend/sdk/v1.0.0-rc.8/scripts/vibe-install.sh -o vibe-install.sh
sh vibe-install.sh install --version v1.0.0-rc.8
export PATH="$HOME/.local/bin:$PATH"
cd backend
vibe
vibe build
vibe run
```

首次執行 `vibe` 設定 AI。設定儲存在專案以外的使用者設定檔 `~/.config/vibe/llm.env`，金鑰另存於私人檔案。切勿提交 AI 憑證。`vibe run` 預設監聽 `127.0.0.1:8080`。

CI 與 Docker 使用 fake provider 建置，不需 AI 金鑰：

```sh
cd backend
LLM_PROVIDER=fake vibe build --check
LLM_PROVIDER=fake vibe build
vibe run --allow-test-build
```

本機錄製模型答案是可選的，且不可提交。在 `backend/` 執行：

```sh
VIBE_LLM_RECORD=fixtures/llm vibe build
```

檔案會寫入 `fixtures/llm/`，git 會忽略該目錄。切勿提交這些錄製檔、鎖定檔（`*.lock.md`）、`.vibe/`（金鑰及快取）或 `manifest.json`。

從儲存庫根目錄執行：

```sh
docker build -t sample-hello-world:test backend
docker run --rm -p 8080:8080 sample-hello-world:test
curl http://127.0.0.1:8080/api/web/v1/hello
curl http://127.0.0.1:8080/api/web/v1/counter
curl -X POST http://127.0.0.1:8080/api/web/v1/increment-counter
```

Docker 以 fake provider 建置（`VIBE_LLM=fake`）。映像檔不含 AI 金鑰或錄製答案。若在本機錄製，檔案只留在自己的機器上，不會複製進映像檔。

此映像檔是開發／示範測試建置，**不可**使用 `VIBE_ENV=production`：正式環境會拒絕記憶體儲存。實際使用請新增搭配 PostgreSQL 的 `backend/providers/main.md`。manifest 使用開發金鑰簽署，正式簽署進度見 [sdk#309](https://github.com/vibe-backend/sdk/issues/309)。

Dockerfile 固定 `VIBE_VERSION=v1.0.0-rc.8`、Debian 基底摘要及 v1.0.0-rc.8 的 `SHA256SUMS` 摘要（`VIBE_SHA256SUMS_SHA256`）：
`65d8076674cd402eee21a23040aa59880990787a8f783091d952706ff56a0fef`。
升級時版本與摘要須一起更新。建置會驗證校驗碼及壓縮檔項目名稱；發行資產發布後才能建置。runtime 映像檔包含 manifest、簽署公鑰、slug 設定及 runtime，以 UID 10001 執行，設定 `VIBE_ENV=development`、`VIBE_DB=memory`、`VIBE_ALLOW_TEST_BUILD=1` 並傳入 `--allow-test-build`。不含簽署私鑰或 AI 設定。

### 簽署發行版本

目前尚未製作任何發行版本；首次簽署發行將於之後進行。維護者推送 `v*` 標籤後，由審閱者在 GitHub Actions 核准 `release` 環境。SDK 的可重用工作流程使用已設定的 AI 模型，從 `.md` 原始檔建置 manifest。工作流程透過 GitHub OIDC 與 Sigstore 簽署，不儲存簽署金鑰，並建立證明，將 `manifest.json` 及其簽署 bundle 發布至 GitHub Release。Pull request 絕不簽署任何檔案。

維護者須在 GitHub 設定中（而非此儲存庫內）設定儲存庫變數 `VIBE_LLM_BASE_URL`、`VIBE_LLM_MODEL`、`release` 環境的秘密 `VIBE_LLM_API_KEY` 及環境審閱者。請使用公開 AI 端點；私人主機會被拒絕。變數必須屬於儲存庫，因為呼叫端無法讀取環境範圍的變數。SDK 工作流程標籤須與 runtime 版本一致。

部署者將 manifest 及 bundle 下載至 `dist/`，比對 manifest 摘要與工作流程輸出，再使用 SDK `v1.0.0-rc.8` runtime 驗證；`cosign` 必須位於 `PATH`：

```sh
VIBE_ENV=development VIBE_RELEASE_VERSION=<version without v> vibe-runtime verify --artifact dist \
  --expect-identity 'https://github.com/vibe-backend/sample-hello-world/.github/workflows/release.yml@refs/tags/v*' \
  --expect-issuer https://token.actions.githubusercontent.com \
  --expect-repository-id 1423874448
```

identity 是此儲存庫在 `v*` 標籤下的發行工作流程；SDK 簽署者的驗證條件已內建於 runtime，不需額外旗標。issuer 是 GitHub Actions。repository id 是此儲存庫的數字識別碼。

在 `dist/` 中亦須針對發行標籤及提交檢查證明，然後直接部署同一批檔案，不重新建置：

```sh
gh attestation verify manifest.json --repo vibe-backend/sample-hello-world \
  --signer-workflow vibe-backend/sdk/.github/workflows/vibe-project-release.yml \
  --source-ref refs/tags/v<version> --source-digest <commit> --deny-self-hosted-runners
```

本範例的資料只存於記憶體，因此即使是已簽署的發行版本仍屬示範，不可使用 `VIBE_ENV=production` 執行。

啟動前端：

```sh
cd frontend
nvm use
pnpm install --frozen-lockfile
pnpm dev
```

開啟 http://localhost:3000。開發伺服器將 `/api` 代理至 `127.0.0.1:8080`；可用 `API_PROXY_TARGET` 修改目標。設定見 `frontend/.env.example`，公開變數在建置時寫入前端。

| `PUBLIC_API_MOCK` | 問候 | 計數器 |
| --- | --- | --- |
| `off`（預設） | 真實 API | 真實 API |
| `counter` | 真實 API | 示範資料 |
| `all` | 示範資料 | 示範資料 |

無後端時使用 `PUBLIC_API_MOCK=all pnpm dev`。示範資料有標籤，只存在記憶體，重新載入即重設。`PUBLIC_API_MOCK_DELAY_MS` 預設為 300。在 `frontend/` 執行 `pnpm run lint`、`pnpm run typecheck`、`pnpm test` 及 `pnpm run build`。

從根目錄執行 `docker compose up --build`，開啟 http://127.0.0.1:8081/。預設以 fake provider 建置並使用真實 API；`PUBLIC_API_MOCK=counter docker compose up --build` 可模擬計數器。nginx 以真實用戶端位址覆寫 `X-Forwarded-For`，runtime 透過 `VIBE_TRUSTED_PROXIES` 僅信任 `10.231.0.10` 的 nginx。若 `10.231.0.0/24` 與本機網路衝突，請一起修改子網路、nginx 位址及信任代理設定。

CI 以 fake provider 建置並將鎖定檔寫入工作摘要，從第二個用戶端驗證 50 次並行寫入的值恰為 2..51，並掃描映像檔金鑰。Compose 測試保留 SPA 路由檢查，確認 49 個偽造轉送標頭仍計入同一用戶端配額，下一次寫入回傳 429 `RATE_LIMITED`，另一個真實用戶端仍可寫入值 51。來自 fork 的 pull request 無法取得 id-token 權限，因此簽署發行版本的自我測試可能無法啟動。
