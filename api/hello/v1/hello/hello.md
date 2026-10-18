---
public: true
writes: false
auth: none
---
# Hello World API

建立公開端點 `GET /hello/v1/{slug}/hello`，無需驗證。每次請求皆回傳 HTTP 狀態碼 `200`，並以 JSON 格式回傳固定內容：

```json
{"message":"hello world"}
```
