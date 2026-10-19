# Hello world with Vibe

> **Dev/demo image, not for production:** the manifest is signed with a development
> key generated during the build; production signing for third-party repos is
> tracked in [vibe-backend/sdk#309](https://github.com/vibe-backend/sdk/issues/309).
>
> **開發／示範映像檔，不適用於正式環境：** manifest 使用建置時產生的開發金鑰簽署；
> 第三方儲存庫的正式簽署支援由
> [vibe-backend/sdk#309](https://github.com/vibe-backend/sdk/issues/309) 追蹤。

## What it is

A natural-language hello world API: `GET /hello/v1/dev/hello` returns
`{"message":"hello world"}`.

`GET /counter/v1/dev/counter` returns `{"count": n}` (0 on a fresh start).
`POST /counter/v1/dev/counter/increment` increments atomically and returns the
new value, e.g. `{"count":1}`. Both counter endpoints are public, require no auth,
and use tenant slug `dev`. State is in-memory and resets when the runtime restarts.
The counter uses structured markdown in `backend/models/counter/` and
`backend/api/counter/`, so `vibe build` compiles it without calling the LLM,
including the keyless fake build. `backend/slugs.example.json` grants the `dev`
slug public write access; it is only read with the in-memory database (`vibe run`
and the Docker image, which copies it to `/app`). The runtime limits public writes
to 50 per client IP per day and 1000 per tenant; further POSTs return 429.

## Repository layout

- `backend/` is the vibe project: `api/`, `models/`, `providers/`, `slugs.example.json`, `Dockerfile`, `.env.example`,
  and `.gitignore`. Generated locks (`*.lock.md`), `manifest.json`, and `.vibe/`
  appear here after `vibe build` and are gitignored.
- `frontend/` contains the React frontend.

## Local usage

Install SDK `v1.0.0-rc.4`. The installer needs `curl`, `tar`, and an authenticated
GitHub CLI (`gh auth login`); it verifies checksums and GitHub attestations.
Use `--runtime` on the install command to install `vibe-runtime` as well.

```sh
curl -fsSL https://raw.githubusercontent.com/vibe-backend/sdk/v1.0.0-rc.4/scripts/vibe-install.sh -o vibe-install.sh
sh vibe-install.sh install --version v1.0.0-rc.4
export PATH="$HOME/.local/bin:$PATH"
cd backend
cp .env.example .env
# Fill in the LLM settings in .env before building.
vibe build
vibe run
```

In another terminal:

```sh
curl http://127.0.0.1:8080/hello/v1/dev/hello
curl http://127.0.0.1:8080/counter/v1/dev/counter
curl -X POST http://127.0.0.1:8080/counter/v1/dev/counter/increment
```

`vibe` starts interactive setup. In development, `vibe build` loads `.env`.
`vibe run` defaults to `127.0.0.1:8080`, an in-memory database, and slug `dev`.

Keyless check verified with SDK `v1.0.0-rc.4`, starting from the repository root:

```sh
cd backend && LLM_PROVIDER=fake vibe build && vibe run --allow-test-build
```

In another terminal:

```sh
curl http://127.0.0.1:8080/hello/v1/dev/hello
curl http://127.0.0.1:8080/counter/v1/dev/counter
curl -X POST http://127.0.0.1:8080/counter/v1/dev/counter/increment
```

Test builds run only in development.

## Docker usage

From the repository root, enter `backend/` and, with BuildKit enabled, put your
key in a gitignored file there. Set `YOUR_KEY` locally;
never put it in a build argument. Replace `your-model-name` with your model.

```sh
cd backend
printf '%s' "$YOUR_KEY" > llm_api_key.txt
DOCKER_BUILDKIT=1 docker build \
  --secret id=llm_api_key,src=./llm_api_key.txt \
  --build-arg LLM_PROVIDER=openai \
  --build-arg LLM_MODEL=your-model-name \
  --build-arg LLM_BASE_URL=https://api.openai.com/v1 \
  -t sample-hello-world .
docker run --rm -p 8080:8080 sample-hello-world
```

For a private proxy, save its URL in gitignored `backend/llm_base_url.txt`. Replace the
`LLM_BASE_URL` build argument with
`--secret id=llm_base_url,src=./llm_base_url.txt` and add
`--build-arg LLM_ALLOW_PRIVATE_HOST=true`. This is local development only;
private hosts are refused in CI/production. `LLM_API_STYLE=chat|responses` is an
optional OpenAI-only build argument. Curl the same route shown above.

Warning: the SDK records the LLM endpoint host in manifest provenance
(`provenance.compilers.<lock>.endpoint-host`). This field is signed and cannot
be removed, so images built through a private proxy contain its hostname in
`/app/manifest.json`. Keep these images local; do not push them to a public
registry. The keyless test image (`VIBE_FAKE=1`) records no endpoint host.

## Keyless test image

From the repository root:

```sh
cd backend
DOCKER_BUILDKIT=1 docker build --build-arg VIBE_FAKE=1 -t sample-hello-world:test .
docker run --rm -p 8080:8080 sample-hello-world:test
curl http://127.0.0.1:8080/hello/v1/dev/hello
curl http://127.0.0.1:8080/counter/v1/dev/counter
curl -X POST http://127.0.0.1:8080/counter/v1/dev/counter/increment
```

The fake provider covers the hello constant response; the structured markdown counter
needs no LLM. Only this image adds
`--allow-test-build`; test builds run only in development.

## Frontend

`frontend/` is a small bilingual React page showing the hello message and a +1
counter. Both APIs ship with the backend.

```sh
cd frontend
nvm use
pnpm install
pnpm dev
```

Open http://localhost:3000. The development server proxies `/hello` and `/counter`
to `127.0.0.1:8080`, so no CORS setup is needed. Run `vibe run` from `backend/` or the keyless
Docker image above for the real hello and counter APIs.

| `PUBLIC_API_MOCK` | Hello | Counter |
| --- | --- | --- |
| `all` | Mock | Mock |
| `counter` | Real API | Mock |
| `off` (default) | Real API | Real API |

The default is `off` (`DEFAULT_MOCK_MODE` in `frontend/src/api/config.ts`).
Use `PUBLIC_API_MOCK=all pnpm dev` without a backend or `PUBLIC_API_MOCK=counter`
to mock only the counter. A badge identifies mock data. Mock state lives in
memory and resets on page reload; `PUBLIC_API_MOCK_DELAY_MS` defaults to 300.

`PUBLIC_API_SLUG` defaults to `dev`: paths include `/hello/v1/dev/hello`,
`/counter/v1/dev/counter`, and `/counter/v1/dev/counter/increment` (POST).
Set it to an empty string to omit the slug segment, e.g. `/hello/v1/hello`.
See `frontend/.env.example` for configuration, including `API_PROXY_TARGET`.
Public variables are baked into production builds.

From `frontend/`, run `pnpm test`, `pnpm run lint`, and `pnpm run build`.

From the repository root:

```sh
docker compose up --build
```

Open http://127.0.0.1:8081/. This starts a keyless runtime and nginx frontend,
using the real counter API by default. Use
`PUBLIC_API_MOCK=counter docker compose up --build` to mock it. Behind nginx, all
browsers share the nginx container's address for the public write quota. Compose build arguments accept
`PUBLIC_API_SLUG` too (the default expression uses `dev` for unset or empty values;
for a slugless image, build with `docker build --build-arg PUBLIC_API_SLUG= frontend`).

## Image and build outputs

The image contains `vibe-runtime`, `manifest.json`, `.vibe/signing.pub`, and
`slugs.example.json`, runs as
UID `10001`, and explicitly uses development mode with an in-memory database.
It contains no LLM client, `signing.key`, or `LLM_*` environment settings.

`backend/Dockerfile` pins SDK `VIBE_VERSION=v1.0.0-rc.4` and the Debian base digest,
verifies both archives against `SHA256SUMS`, and checks archive entry names.
The `SHA256SUMS` digest (`VIBE_SHA256SUMS_SHA256`) is a placeholder for v1.0.0-rc.4;
update it together with `VIBE_VERSION` when upgrading. Docker downloads
verify checksums; the local installer additionally verifies attestations.
The rc.4 digest must be filled in once the rc.4 release assets are published.
Release assets must be published before the Docker build can succeed.

CI builds the keyless image, tests hello and counter GET 0 / POST 1 / GET 1,
and sends 50 concurrent POSTs ending at exactly 51 from a second Docker network
because of the per-IP quota. It also tests the compose stack through nginx
(counter GET 0 / POST 1) and scans the image for keys.

Locks (`*.lock.md`), `.vibe/` (including signing keys and cache), and
`manifest.json` in `backend/` are generated build output and are not committed.

## 繁體中文

### 專案內容

這是以自然語言定義的 hello world API：`GET /hello/v1/dev/hello` 回傳
`{"message":"hello world"}`。

`GET /counter/v1/dev/counter` 回傳 `{"count": n}`（全新啟動時為 0）。
`POST /counter/v1/dev/counter/increment` 以原子操作加一並回傳新值，例如 `{"count":1}`。
兩個計數器端點皆公開、無需驗證，使用租戶 slug `dev`；狀態儲存在記憶體，runtime 重啟即重設。
計數器使用 `backend/models/counter/` 與 `backend/api/counter/` 中的結構化 Markdown，
因此 `vibe build` 不需呼叫 LLM 即可編譯，包含不需金鑰的 fake 建置。
`backend/slugs.example.json` 授予 `dev` slug 公開寫入權限；僅使用記憶體資料庫時讀取
（`vibe run` 及將此檔複製至 `/app` 的 Docker 映像檔）。runtime 限制公開寫入為每個用戶端
IP 每日 50 次、每個租戶每日 1000 次；超過後 POST 回傳 429。

### 儲存庫結構

- `backend/` 是 vibe 專案，包含 `api/`、`models/`、`providers/`、`slugs.example.json`、`Dockerfile`、`.env.example`
  及 `.gitignore`。執行 `vibe build` 後，產生的鎖定檔（`*.lock.md`）、
  `manifest.json` 及 `.vibe/` 會出現在此目錄，並由 Git 忽略。
- `frontend/` 包含 React 前端。

### 本機使用

安裝 SDK `v1.0.0-rc.4`。安裝程式需要 `curl`、`tar`，以及已驗證登入的
GitHub CLI（`gh auth login`）；會驗證校驗碼與 GitHub 證明。
若也要安裝 `vibe-runtime`，請在安裝指令加上 `--runtime`。

```sh
curl -fsSL https://raw.githubusercontent.com/vibe-backend/sdk/v1.0.0-rc.4/scripts/vibe-install.sh -o vibe-install.sh
sh vibe-install.sh install --version v1.0.0-rc.4
export PATH="$HOME/.local/bin:$PATH"
cd backend
cp .env.example .env
# 建置前請先填妥 .env 的 LLM 設定。
vibe build
vibe run
```

在另一個終端機執行：

```sh
curl http://127.0.0.1:8080/hello/v1/dev/hello
curl http://127.0.0.1:8080/counter/v1/dev/counter
curl -X POST http://127.0.0.1:8080/counter/v1/dev/counter/increment
```

`vibe` 啟動互動式設定。開發模式的 `vibe build` 會讀取 `.env`。
`vibe run` 預設使用 `127.0.0.1:8080`、記憶體資料庫及 `dev` slug。

以下不需金鑰的檢查已使用 SDK `v1.0.0-rc.4` 驗證，從儲存庫根目錄執行：

```sh
cd backend && LLM_PROVIDER=fake vibe build && vibe run --allow-test-build
```

在另一個終端機執行：

```sh
curl http://127.0.0.1:8080/hello/v1/dev/hello
curl http://127.0.0.1:8080/counter/v1/dev/counter
curl -X POST http://127.0.0.1:8080/counter/v1/dev/counter/increment
```

測試建置只能在開發模式執行。

### Docker 使用

從儲存庫根目錄進入 `backend/`，啟用 BuildKit，將金鑰存入該目錄下已被 Git 忽略的檔案。在本機設定 `YOUR_KEY`；
不要將金鑰放進建置參數。將 `your-model-name` 換成所需模型。

```sh
cd backend
printf '%s' "$YOUR_KEY" > llm_api_key.txt
DOCKER_BUILDKIT=1 docker build \
  --secret id=llm_api_key,src=./llm_api_key.txt \
  --build-arg LLM_PROVIDER=openai \
  --build-arg LLM_MODEL=your-model-name \
  --build-arg LLM_BASE_URL=https://api.openai.com/v1 \
  -t sample-hello-world .
docker run --rm -p 8080:8080 sample-hello-world
```

私人代理的 URL 請存入已被 Git 忽略的 `backend/llm_base_url.txt`。
將 `LLM_BASE_URL` 建置參數改為
`--secret id=llm_base_url,src=./llm_base_url.txt`，並加上
`--build-arg LLM_ALLOW_PRIVATE_HOST=true`。這僅限本機開發；
CI 與正式環境會拒絕私人主機。`LLM_API_STYLE=chat|responses`
是僅適用於 OpenAI 的選用建置參數。使用上方相同的 curl 路由測試。

警告：SDK 會將 LLM 端點主機名稱記錄於 manifest 來源資訊
（`provenance.compilers.<lock>.endpoint-host`）。此欄位已簽署，無法移除，
因此透過私人代理建置的映像檔會在 `/app/manifest.json` 中包含該主機名稱。
請將這些映像檔保留在本機，不要推送至公開的映像檔登錄庫。
不需金鑰的測試映像檔（`VIBE_FAKE=1`）不會記錄端點主機名稱。

### 不需金鑰的測試映像檔

從儲存庫根目錄執行：

```sh
cd backend
DOCKER_BUILDKIT=1 docker build --build-arg VIBE_FAKE=1 -t sample-hello-world:test .
docker run --rm -p 8080:8080 sample-hello-world:test
curl http://127.0.0.1:8080/hello/v1/dev/hello
curl http://127.0.0.1:8080/counter/v1/dev/counter
curl -X POST http://127.0.0.1:8080/counter/v1/dev/counter/increment
```

fake 提供者涵蓋 hello 固定回應；計數器使用結構化 Markdown，不需 LLM。
只有此映像檔會加上 `--allow-test-build`；
測試建置只能在開發模式執行。

### 前端

`frontend/` 是簡單的中英文 React 頁面，顯示 API 問候訊息及可加一的計數器。
兩個 API 皆隨後端提供。

```sh
cd frontend
nvm use
pnpm install
pnpm dev
```

開啟 http://localhost:3000。開發伺服器會將 `/hello` 與 `/counter`
代理至 `127.0.0.1:8080`，不需設定 CORS。請在 `backend/` 執行 `vibe run` 或使用上方不需金鑰的
Docker 映像檔，提供真實的 hello 與計數器 API。

| `PUBLIC_API_MOCK` | 問候訊息 | 計數器 |
| --- | --- | --- |
| `all` | 示範資料 | 示範資料 |
| `counter` | 真實 API | 示範資料 |
| `off`（預設） | 真實 API | 真實 API |

預設為 `off`（`frontend/src/api/config.ts` 中的 `DEFAULT_MOCK_MODE`）。
不啟動後端時，可使用 `PUBLIC_API_MOCK=all pnpm dev`，或使用 `PUBLIC_API_MOCK=counter`
僅模擬計數器。頁面會以標籤標示示範資料。
示範計數儲存在記憶體，重新載入頁面即重設；`PUBLIC_API_MOCK_DELAY_MS` 預設為 300。

`PUBLIC_API_SLUG` 預設為 `dev`，路徑包括 `/hello/v1/dev/hello`、
`/counter/v1/dev/counter` 及 `/counter/v1/dev/counter/increment`（POST）。
設為空字串可省略 slug 區段，例如 `/hello/v1/hello`。
其他設定（包括 `API_PROXY_TARGET`）請參閱 `frontend/.env.example`。
公開變數會在正式建置時寫入前端檔案。

在 `frontend/` 執行 `pnpm test`、`pnpm run lint` 及 `pnpm run build`。

在儲存庫根目錄執行：

```sh
docker compose up --build
```

開啟 http://127.0.0.1:8081/。此指令啟動不需金鑰的 runtime 及 nginx 前端；
預設使用真實計數器 API。使用 `PUBLIC_API_MOCK=counter docker compose up --build` 可模擬計數器。
經由 nginx 時，所有瀏覽器共用 nginx 容器的位址計算公開寫入配額。
Compose 建置參數也支援 `PUBLIC_API_SLUG`（未設定或空值時採用 `dev`；
如需省略 slug，請以 `docker build --build-arg PUBLIC_API_SLUG= frontend` 建置）。

### 映像檔與建置輸出

映像檔包含 `vibe-runtime`、`manifest.json`、`.vibe/signing.pub` 與 `slugs.example.json`，
以 UID `10001` 執行，並明確設定開發模式與記憶體資料庫。
不含 LLM 用戶端、`signing.key` 或 `LLM_*` 環境設定。

`backend/Dockerfile` 固定 SDK `VIBE_VERSION=v1.0.0-rc.4` 與 Debian 基底摘要，
依 `SHA256SUMS` 驗證兩個壓縮檔，並檢查封裝項目名稱。
`SHA256SUMS` 摘要（`VIBE_SHA256SUMS_SHA256`）目前為 v1.0.0-rc.4 的預留值；
升級時必須與 `VIBE_VERSION` 一起更新。
Docker 下載會驗證校驗碼；本機安裝程式還會驗證證明。
rc.4 發行資產發布後，必須填入 rc.4 摘要。
必須等發行資產發布後，Docker 建置才能成功。

CI 建置不需金鑰的映像檔，測試 hello 及計數器 GET 0 / POST 1 / GET 1，
並因每個 IP 的配額限制，從第二個 Docker 網路送出 50 個並行 POST，確認最終值恰為 51。
CI 也透過 nginx 測試 compose 堆疊（計數器 GET 0 / POST 1），並掃描映像檔中的金鑰。

鎖定檔（`*.lock.md`）、`.vibe/`（含簽署金鑰與快取）及 `manifest.json`
都是 `backend/` 中產生的建置輸出，不提交到儲存庫。
