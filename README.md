# Hello world with Vibe

This sample has a bilingual React page and an API written in ordinary sentences. No programming is needed to write the backend `.md` files. `vibe build` uses an AI model to turn those sentences into generated locks.

- `GET /api/web/v1/hello` returns `{"message":"hello world"}`.
- `GET /api/web/v1/counter` returns `{"value": n}`, starting at zero.
- `POST /api/web/v1/increment-counter` adds one atomically and returns `{"value": n}`.

Anyone can use these APIs. The project uses default slug `dev`; URLs need no slug. Public writes are limited to 50 per client IP per day and 1000 per tenant per day; further writes return 429. Data lives in memory and is lost when the runtime restarts.

`backend/` holds `api/`, `models/`, `fixtures/llm/`, `slugs.example.json`, `Dockerfile`, and `.gitignore`. `frontend/` holds the React page.

Install SDK `v1.0.0-rc.5` with `curl`, `tar`, and an authenticated GitHub CLI (`gh auth login`). The installer verifies checksums and GitHub attestations. Add `--runtime` to install `vibe-runtime` too.

```sh
curl -fsSL https://raw.githubusercontent.com/vibe-backend/sdk/v1.0.0-rc.5/scripts/vibe-install.sh -o vibe-install.sh
sh vibe-install.sh install --version v1.0.0-rc.5
export PATH="$HOME/.local/bin:$PATH"
cd backend
vibe
vibe build
vibe run
```

Run `vibe` once to set up AI settings. It stores them in your user config, `~/.config/vibe/llm.env`, with the key in a separate private file, outside the project. Never commit AI credentials. `vibe run` serves on `127.0.0.1:8080` by default.

After editing a `.md` file, record fresh answers locally using your configured model:

```sh
VIBE_LLM_RECORD=fixtures/llm vibe build
```

Review the new fixture files before committing. Start without generated locks, or use `--check`, to record every call. Never commit locks (`*.lock.md`), `.vibe/` (keys and cache), or `manifest.json`.

CI and Docker replay the reviewed recorded answers in `backend/fixtures/llm/`, so no AI key is needed:

```sh
cd backend
LLM_PROVIDER=replay vibe build --check
LLM_PROVIDER=replay vibe build
vibe run --allow-test-build
```

From the repository root:

```sh
docker build -t sample-hello-world:test backend
docker run --rm -p 8080:8080 sample-hello-world:test
curl http://127.0.0.1:8080/api/web/v1/hello
curl http://127.0.0.1:8080/api/web/v1/counter
curl -X POST http://127.0.0.1:8080/api/web/v1/increment-counter
```

`VIBE_LLM=replay` is the default Docker build argument; `--build-arg VIBE_LLM=fake` selects the fake provider for supported tests. Real recordings are made locally, never in the image.

This image is a dev/demo test build and must **NOT** run with `VIBE_ENV=production`: production refuses the in-memory store. For real use, add `backend/providers/main.md` with PostgreSQL. The manifest is development-signed; production signing is tracked in [sdk#309](https://github.com/vibe-backend/sdk/issues/309).

The Dockerfile pins `VIBE_VERSION=v1.0.0-rc.5`, Debian base digests, and the v1.0.0-rc.5 `SHA256SUMS` digest (`VIBE_SHA256SUMS_SHA256`):
`9bd16e72473e5d200675151e01e851c3bfd929cd7b29c27a5b7d736d03c913ae`.
Update version and digest together. Checksums and archive entry names are verified. Release assets must be published before building. The runtime image contains the manifest, public signing key, slug settings and runtime, runs as UID 10001, and sets `VIBE_ENV=development`, `VIBE_DB=memory`, and `VIBE_ALLOW_TEST_BUILD=1` with `--allow-test-build`. It contains no signing private key or AI settings.

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

Run `docker compose up --build` from the repository root and open http://127.0.0.1:8081/. It uses replay and real APIs by default; `PUBLIC_API_MOCK=counter docker compose up --build` mocks the counter. nginx overwrites `X-Forwarded-For` with the real client address. The runtime trusts only nginx at `10.231.0.10` via `VIBE_TRUSTED_PROXIES`. If subnet `10.231.0.0/24` conflicts with your network, change the subnet, nginx address and trusted proxy together.

CI checks replay and puts generated locks in the job summary, tests 50 concurrent writes with unique values 2..51 from a second client, and scans image layers for keys. Compose tests keep SPA routes working and verify that 49 spoofed forwarding headers still consume one client's quota, the next write returns 429 `RATE_LIMITED`, and another real client can write value 51. Pull requests from forks cannot get the id-token permission, so the signed-release self-test may fail to start on fork PRs.

## 繁體中文

本範例包含中英文 React 頁面，以及用日常句子描述的 API。編寫後端 `.md` 檔案不需寫程式；`vibe build` 透過 AI 模型將句子轉成產生的鎖定檔。

- `GET /api/web/v1/hello` 回傳 `{"message":"hello world"}`。
- `GET /api/web/v1/counter` 回傳 `{"value": n}`，初始為零。
- `POST /api/web/v1/increment-counter` 以原子操作加一並回傳 `{"value": n}`。

任何人皆可使用。專案預設 slug 為 `dev`，網址不需包含 slug。公開寫入限制為每個用戶端 IP 每日 50 次、每租戶每日 1000 次；超過回傳 429。資料只存於記憶體，runtime 重啟即遺失。

`backend/` 包含 `api/`、`models/`、`fixtures/llm/`、`slugs.example.json`、`Dockerfile` 及 `.gitignore`。`frontend/` 包含 React 頁面。

安裝 SDK `v1.0.0-rc.5`，需要 `curl`、`tar` 及已登入的 GitHub CLI（`gh auth login`）。安裝程式驗證校驗碼及 GitHub 證明；加上 `--runtime` 可同時安裝 `vibe-runtime`。

```sh
curl -fsSL https://raw.githubusercontent.com/vibe-backend/sdk/v1.0.0-rc.5/scripts/vibe-install.sh -o vibe-install.sh
sh vibe-install.sh install --version v1.0.0-rc.5
export PATH="$HOME/.local/bin:$PATH"
cd backend
vibe
vibe build
vibe run
```

首次執行 `vibe` 設定 AI。設定儲存在專案以外的使用者設定檔 `~/.config/vibe/llm.env`，金鑰另存於私人檔案。切勿提交 AI 憑證。`vibe run` 預設監聽 `127.0.0.1:8080`。

修改 `.md` 後，使用本機已設定的模型重新錄製：

```sh
VIBE_LLM_RECORD=fixtures/llm vibe build
```

提交前請審閱新的錄製檔。先移除產生的鎖定檔，或加上 `--check`，以錄製所有呼叫。切勿提交鎖定檔（`*.lock.md`）、`.vibe/`（金鑰及快取）或 `manifest.json`。

CI 與 Docker 重播 `backend/fixtures/llm/` 中已審閱的答案，不需 AI 金鑰：

```sh
cd backend
LLM_PROVIDER=replay vibe build --check
LLM_PROVIDER=replay vibe build
vibe run --allow-test-build
```

從儲存庫根目錄執行：

```sh
docker build -t sample-hello-world:test backend
docker run --rm -p 8080:8080 sample-hello-world:test
curl http://127.0.0.1:8080/api/web/v1/hello
curl http://127.0.0.1:8080/api/web/v1/counter
curl -X POST http://127.0.0.1:8080/api/web/v1/increment-counter
```

Docker 建置參數預設為 `VIBE_LLM=replay`；`--build-arg VIBE_LLM=fake` 可在支援的測試選用 fake。真實答案只在本機錄製，不在映像檔內錄製。

此映像檔是開發／示範測試建置，**不可**使用 `VIBE_ENV=production`：正式環境會拒絕記憶體儲存。實際使用請新增搭配 PostgreSQL 的 `backend/providers/main.md`。manifest 使用開發金鑰簽署，正式簽署進度見 [sdk#309](https://github.com/vibe-backend/sdk/issues/309)。

Dockerfile 固定 `VIBE_VERSION=v1.0.0-rc.5`、Debian 基底摘要及 v1.0.0-rc.5 的 `SHA256SUMS` 摘要（`VIBE_SHA256SUMS_SHA256`）：
`9bd16e72473e5d200675151e01e851c3bfd929cd7b29c27a5b7d736d03c913ae`。
升級時版本與摘要須一起更新。建置會驗證校驗碼及壓縮檔項目名稱；發行資產發布後才能建置。runtime 映像檔包含 manifest、簽署公鑰、slug 設定及 runtime，以 UID 10001 執行，設定 `VIBE_ENV=development`、`VIBE_DB=memory`、`VIBE_ALLOW_TEST_BUILD=1` 並傳入 `--allow-test-build`。不含簽署私鑰或 AI 設定。

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

從根目錄執行 `docker compose up --build`，開啟 http://127.0.0.1:8081/。預設重播並使用真實 API；`PUBLIC_API_MOCK=counter docker compose up --build` 可模擬計數器。nginx 以真實用戶端位址覆寫 `X-Forwarded-For`，runtime 透過 `VIBE_TRUSTED_PROXIES` 僅信任 `10.231.0.10` 的 nginx。若 `10.231.0.0/24` 與本機網路衝突，請一起修改子網路、nginx 位址及信任代理設定。

CI 檢查重播並將鎖定檔寫入工作摘要，從第二個用戶端驗證 50 次並行寫入的值恰為 2..51，並掃描映像檔金鑰。Compose 測試保留 SPA 路由檢查，確認 49 個偽造轉送標頭仍計入同一用戶端配額，下一次寫入回傳 429 `RATE_LIMITED`，另一個真實用戶端仍可寫入值 51。來自 fork 的 pull request 無法取得 id-token 權限，因此簽署發行版本的自我測試可能無法啟動。
