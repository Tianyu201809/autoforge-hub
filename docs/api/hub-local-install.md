# Hub Local Install API

将 Hub 上的脚本一键安装到本机正在运行的 Autoforge 桌面端。

**Spec:** `docs/superpowers/specs/2026-07-11-hub-local-install-hub-side-design.md`  
**Sources:** `server/api/scripts/[id]/install-token.post.ts`, `server/api/scripts/[id]/download.get.ts`, `server/utils/install-token.ts`, `app/composables/useAutoforgeBridge.ts`

---

## Overview

```
Browser (WsScriptCard)
  → GET  http://127.0.0.1:19276/health
  → POST /api/scripts/:id/install-token   (Bearer JWT)
  → POST http://127.0.0.1:19276/install   { zipUrl, scriptName, hubScriptId }
       → Autoforge GET zipUrl
            → GET /api/scripts/:id/download?installToken=…  (no Bearer; Hub proxies zip)
```

Hub 不启动桌面端；桌面端未运行时前端提示用户先打开 Autoforge。

---

## POST `/api/scripts/:id/install-token`

**Purpose:** 在已登录且有下载权限时，签发短时一次性下载 URL，供本机 Autoforge 拉取 zip。

**Auth:** Bearer JWT（必填）

**Permission:** 与普通下载相同（个人脚本仅 owner；团队需成员 + `download`）

**Quota:** 签发前 `checkDownloadQuota`；**不**在此时扣减。真正取包时再记一次下载。

### Response `200`

```json
{
  "ok": true,
  "zipUrl": "https://<host>/api/scripts/<id>/download?installToken=<uuid>",
  "scriptName": "脚本标题",
  "hubScriptId": "<id>",
  "expiresIn": 120
}
```

### Errors

| HTTP | 场景 |
|------|------|
| 401 | 未登录 |
| 403 | 无下载权限 |
| 404 | 脚本 / 团队不存在 |
| 429 | 当日下载配额已满 |

### Example

```bash
curl -s -X POST "$BASE/api/scripts/$SCRIPT_ID/install-token" \
  -H "Authorization: Bearer $JWT"
```

---

## GET `/api/scripts/:id/download`

两条路径：

### A. `?installToken=<uuid>`（本机安装）

- **Auth:** 无需 Bearer（middleware 在存在非空 `installToken` 时放行）
- **流程:** `peekInstallToken` → 配额检查 → `consumeInstallToken` → 记配额 → **代理返回 zip 字节**（`proxy: true`，不 302 到 OSS，避免桌面端拉私有桶 403）
- **Cache-Control:** `private, no-store`
- **Token:** TTL 120s；一次性；无效 / 过期 / scriptId 不匹配 → `401`

### B. 普通浏览器下载

- **Auth:** Bearer + 验证码 query（`captchaToken` / `captchaPosition`）+ 配额
- OSS 场景下仍可 302 到对象 URL（浏览器带 Referer）

### Example（安装路径）

```bash
# 先 mint，再：
curl -s -o script.zip -w "%{http_code}\n" "$ZIP_URL"
# 再次请求同一 URL → 401
```

---

## `server/utils/install-token.ts`

| 导出 | 说明 |
|------|------|
| `INSTALL_TOKEN_TTL_MS` | `120_000` |
| `createInstallToken(scriptId, userId)` | 返回 `{ token, expiresIn }` |
| `peekInstallToken(token, scriptId)` | 校验不删除 |
| `consumeInstallToken(token, scriptId)` | 一次性删除并返回 `{ userId }` 或 `null` |

存储为进程内 `Map`（与 captcha 同模式；PM2 单实例）。

---

## Desktop bridge（契约，非 Hub 实现）

| 项 | 值 |
|----|-----|
| Base | `http://127.0.0.1:19276` |
| Health | `GET /health` → `{ ok: true, ... }` |
| Install | `POST /install` body `{ zipUrl, scriptName?, hubScriptId? }` |

前端封装见 [Composables — useAutoforgeBridge](./composables.md#useautoforgebridge)。

---

## Known Limitations

- 本机去重 / 覆盖更新由桌面端决定；Hub 不拦截「重复添加」
- `installToken` 重启进程即失效
- `zipUrl` 的 origin 来自 `getRequestURL(event).origin`；反代需正确转发 Host / proto
