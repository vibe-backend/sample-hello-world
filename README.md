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

## Local usage

Install SDK `v1.0.0-rc.2`. The installer needs `curl`, `tar`, and an authenticated
GitHub CLI (`gh auth login`); it verifies checksums and GitHub attestations.
Use `--runtime` on the install command to install `vibe-runtime` as well.

```sh
curl -fsSL https://raw.githubusercontent.com/vibe-backend/sdk/v1.0.0-rc.2/scripts/vibe-install.sh -o vibe-install.sh
sh vibe-install.sh install --version v1.0.0-rc.2
export PATH="$HOME/.local/bin:$PATH"
cp .env.example .env
# Fill in the LLM settings in .env before building.
vibe build
vibe run
```

In another terminal:

```sh
curl http://127.0.0.1:8080/hello/v1/dev/hello
```

`vibe` starts interactive setup. In development, `vibe build` loads `.env`.
`vibe run` defaults to `127.0.0.1:8080`, an in-memory database, and slug `dev`.

## Docker usage

With BuildKit enabled, put your key in a gitignored file. Set `YOUR_KEY` locally;
never put it in a build argument. Replace `your-model-name` with your model.

```sh
printf '%s' "$YOUR_KEY" > llm_api_key.txt
DOCKER_BUILDKIT=1 docker build \
  --secret id=llm_api_key,src=./llm_api_key.txt \
  --build-arg LLM_PROVIDER=openai \
  --build-arg LLM_MODEL=your-model-name \
  --build-arg LLM_BASE_URL=https://api.openai.com/v1 \
  -t sample-hello-world .
docker run --rm -p 8080:8080 sample-hello-world
```

For a private proxy, save its URL in gitignored `llm_base_url.txt`. Replace the
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

```sh
DOCKER_BUILDKIT=1 docker build --build-arg VIBE_FAKE=1 -t sample-hello-world:test .
docker run --rm -p 8080:8080 sample-hello-world:test
curl http://127.0.0.1:8080/hello/v1/dev/hello
```

The fake provider supports this constant response. Only this image adds
`--allow-test-build`; test builds run only in development.

## Frontend

`frontend/` is a small bilingual React page showing the hello message and a +1
counter. The counter API is expected with SDK v1.0.0-rc.4 and is not part of this
repo yet; this repo pins rc.2. Until the repo upgrades and adds the counter API,
`PUBLIC_API_MOCK=off` shows the counter error state (404) because the runtime has
no counter route.

```sh
cd frontend
nvm use
pnpm install
pnpm dev
```

Open http://localhost:3000. The development server proxies `/hello` and `/counter`
to `127.0.0.1:8080`, so no CORS setup is needed. Run `vibe run` or the keyless
Docker image above for the real hello API.

| `PUBLIC_API_MOCK` | Hello | Counter |
| --- | --- | --- |
| `all` | Mock | Mock |
| `counter` (default) | Real API | Mock |
| `off` | Real API | Real API |

Use `PUBLIC_API_MOCK=all pnpm dev` without a backend. Once the counter API ships,
use `PUBLIC_API_MOCK=off pnpm dev`, or change `DEFAULT_MOCK_MODE` to `"off"` in
`frontend/src/api/config.ts`. A badge identifies mock data. Mock state lives in
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
with a mocked counter until its API ships. To build with real APIs, use
`PUBLIC_API_MOCK=off docker compose up --build`. Compose build arguments accept
`PUBLIC_API_SLUG` too (the default expression uses `dev` for unset or empty values;
for a slugless image, build with `docker build --build-arg PUBLIC_API_SLUG= frontend`).

## Image and build outputs

The image contains `vibe-runtime`, `manifest.json`, and `.vibe/signing.pub`, runs as
UID `10001`, and explicitly uses development mode with an in-memory database.
It contains no LLM client, `signing.key`, or `LLM_*` environment settings.

The Dockerfile pins SDK `VIBE_VERSION=v1.0.0-rc.2` and the Debian base digest,
verifies both archives against `SHA256SUMS`, and checks archive entry names.
The `SHA256SUMS` digest (`VIBE_SHA256SUMS_SHA256`) is pinned for v1.0.0-rc.2;
update it together with `VIBE_VERSION` when upgrading. Docker downloads
verify checksums; the local installer additionally verifies attestations.
Release assets must be published before the Docker build can succeed.

Locks (`*.lock.md`), `.vibe/` (including signing keys and cache), and
`manifest.json` are generated build output and are not committed.

## 繁體中文

### 專案內容

這是以自然語言定義的 hello world API：`GET /hello/v1/dev/hello` 回傳
`{"message":"hello world"}`。

### 本機使用

安裝 SDK `v1.0.0-rc.2`。安裝程式需要 `curl`、`tar`，以及已驗證登入的
GitHub CLI（`gh auth login`）；會驗證校驗碼與 GitHub 證明。
若也要安裝 `vibe-runtime`，請在安裝指令加上 `--runtime`。

```sh
curl -fsSL https://raw.githubusercontent.com/vibe-backend/sdk/v1.0.0-rc.2/scripts/vibe-install.sh -o vibe-install.sh
sh vibe-install.sh install --version v1.0.0-rc.2
export PATH="$HOME/.local/bin:$PATH"
cp .env.example .env
# 建置前請先填妥 .env 的 LLM 設定。
vibe build
vibe run
```

在另一個終端機執行：

```sh
curl http://127.0.0.1:8080/hello/v1/dev/hello
```

`vibe` 啟動互動式設定。開發模式的 `vibe build` 會讀取 `.env`。
`vibe run` 預設使用 `127.0.0.1:8080`、記憶體資料庫及 `dev` slug。

### Docker 使用

啟用 BuildKit，將金鑰存入已被 Git 忽略的檔案。在本機設定 `YOUR_KEY`；
不要將金鑰放進建置參數。將 `your-model-name` 換成所需模型。

```sh
printf '%s' "$YOUR_KEY" > llm_api_key.txt
DOCKER_BUILDKIT=1 docker build \
  --secret id=llm_api_key,src=./llm_api_key.txt \
  --build-arg LLM_PROVIDER=openai \
  --build-arg LLM_MODEL=your-model-name \
  --build-arg LLM_BASE_URL=https://api.openai.com/v1 \
  -t sample-hello-world .
docker run --rm -p 8080:8080 sample-hello-world
```

私人代理的 URL 請存入已被 Git 忽略的 `llm_base_url.txt`。
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

```sh
DOCKER_BUILDKIT=1 docker build --build-arg VIBE_FAKE=1 -t sample-hello-world:test .
docker run --rm -p 8080:8080 sample-hello-world:test
curl http://127.0.0.1:8080/hello/v1/dev/hello
```

fake 提供者支援此固定回應。只有此映像檔會加上 `--allow-test-build`；
測試建置只能在開發模式執行。

### 前端

`frontend/` 是簡單的中英文 React 頁面，顯示 API 問候訊息及可加一的計數器。
計數器 API 預計隨 SDK v1.0.0-rc.4 推出，尚未包含在本儲存庫；本儲存庫固定使用 rc.2。
在本儲存庫升級並加入計數器 API 前，`PUBLIC_API_MOCK=off` 會顯示計數器錯誤狀態
（404），因為 runtime 沒有計數器路由。

```sh
cd frontend
nvm use
pnpm install
pnpm dev
```

開啟 http://localhost:3000。開發伺服器會將 `/hello` 與 `/counter`
代理至 `127.0.0.1:8080`，不需設定 CORS。請執行 `vibe run` 或上方不需金鑰的
Docker 映像檔，提供真實的 hello API。

| `PUBLIC_API_MOCK` | 問候訊息 | 計數器 |
| --- | --- | --- |
| `all` | 示範資料 | 示範資料 |
| `counter`（預設） | 真實 API | 示範資料 |
| `off` | 真實 API | 真實 API |

不啟動後端時，可使用 `PUBLIC_API_MOCK=all pnpm dev`。計數器 API 推出後，
使用 `PUBLIC_API_MOCK=off pnpm dev`，或將 `frontend/src/api/config.ts` 的
`DEFAULT_MOCK_MODE` 改為 `"off"`。頁面會以標籤標示示範資料。
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
計數器 API 推出前使用示範計數器。需要真實 API 時，使用
`PUBLIC_API_MOCK=off docker compose up --build`。
Compose 建置參數也支援 `PUBLIC_API_SLUG`（未設定或空值時採用 `dev`；
如需省略 slug，請以 `docker build --build-arg PUBLIC_API_SLUG= frontend` 建置）。

### 映像檔與建置輸出

映像檔包含 `vibe-runtime`、`manifest.json` 與 `.vibe/signing.pub`，
以 UID `10001` 執行，並明確設定開發模式與記憶體資料庫。
不含 LLM 用戶端、`signing.key` 或 `LLM_*` 環境設定。

Dockerfile 固定 SDK `VIBE_VERSION=v1.0.0-rc.2` 與 Debian 基底摘要，
依 `SHA256SUMS` 驗證兩個壓縮檔，並檢查封裝項目名稱。
`SHA256SUMS` 摘要（`VIBE_SHA256SUMS_SHA256`）已固定為 v1.0.0-rc.2 的版本；
升級時必須與 `VIBE_VERSION` 一起更新。
Docker 下載會驗證校驗碼；本機安裝程式還會驗證證明。
必須等發行資產發布後，Docker 建置才能成功。

鎖定檔（`*.lock.md`）、`.vibe/`（含簽署金鑰與快取）及 `manifest.json`
都是產生的建置輸出，不提交到儲存庫。
