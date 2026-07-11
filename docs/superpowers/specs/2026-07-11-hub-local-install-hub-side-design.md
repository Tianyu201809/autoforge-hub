# Hub「添加到本地 Autoforge」— Hub 端设计规格

**日期**：2026-07-11  
**状态**：已批准（供 Hub 仓库实现；桌面端契约已随 Autoforge v1.15.0 落地）  
**读者**：Autoforge Hub 仓库实现者  
**关联**：桌面端规格见同目录 `2026-07-11-hub-local-install-design.md`

---

## 1. 目标

在 Hub 网站上，用户点击脚本的「添加到本地」后：

1. 若本机 **未运行** Autoforge → 提示先启动桌面端  
2. 若 **已运行** → 由已登录用户签发短时一次性下载 URL，交给本机桥；桌面端下载、导入、聚焦并打开脚本  
3. Hub 页面展示成功或失败提示

**非目标（本期）**：

- 启动或安装 Autoforge  
- 长期公开、无需 token 的 zip URL  
- 本机去重、版本更新、覆盖安装  
- 解压与 `autoforge.json` 校验（由桌面端完成）  
- 独立脚本详情页  
- 「添加到本地」流程中的验证码

---

## 2. 已确认决策

| 项 | 选择 |
|----|------|
| zip 访问 | 短时一次性 `installToken`，非长期公开 |
| 签发时机 | 先 `GET /health`，成功后再向 Hub 要 token |
| 验证码 | 「添加到本地」跳过；普通「下载」不变 |
| 配额 | 计入当日下载配额（真正取包时扣减） |
| UI 入口 | 仅 `WsScriptCard`（与下载同权限条件） |
| 实现方案 | 签发接口 + 扩展现有 `GET .../download` |

---

## 3. 与桌面端的契约

Autoforge 桌面端在运行时提供本机 HTTP 服务（Hub **不**改此契约）：

| 项 | 值 |
|----|-----|
| Base URL | `http://127.0.0.1:19276` |
| 探测 | `GET /health` |
| 安装 | `POST /install` |
| 绑定 | 仅本机；浏览器跨域由桌面端 CORS 处理 |

### 3.1 `GET /health`

- Hub 超时建议：**1 秒**
- 成功：HTTP 200，body 含 `"ok": true`
- 失败：网络错误、超时、非 200 → 视为 **Autoforge 未运行**

### 3.2 `POST /install`

**Content-Type**：`application/json`

```json
{
  "zipUrl": "https://<hub-host>/api/scripts/<id>/download?installToken=<uuid>",
  "scriptName": "可选，脚本显示名",
  "hubScriptId": "可选，Hub 侧脚本 ID"
}
```

| 字段 | 必填 | 说明 |
|------|------|------|
| `zipUrl` | ✅ | **绝对 URL**；Autoforge 进程直接 GET（不依赖浏览器 cookie） |
| `scriptName` | | 建议传 |
| `hubScriptId` | | 建议传；v1 桌面端不去重 |

**成功**：HTTP 200，`{ "ok": true, "scriptId": "...", "name": "..." }`  
Hub 提示：**已添加到本地 Autoforge**（可附带 `name`）。

**失败**：非 200；优先展示 body 中的 `message`，无则用 §7 默认文案。

---

## 4. Hub 后端：installToken 与 zip 下发

### 4.1 包内容要求

Zip 解压后须符合 Autoforge 脚本包规范，至少含 `autoforge.json` 与入口文件。允许 zip 内多包一层目录（桌面端识别）。包内容来源与现有脚本存储一致（`file_path` / OSS），不要打空包。

### 4.2 `POST /api/scripts/:id/install-token`（需登录）

1. 权限：与现有 download 相同（个人仅 owner；团队成员 + `download` 权限）  
2. `checkDownloadQuota`：不足则 **429**，不签发  
3. 签发 UUID token，写入内存 store  
4. 返回绝对 `zipUrl`（基于当前请求的 host/proto，确保用户本机上的 Autoforge 可访问）

**成功 200：**

```json
{
  "ok": true,
  "zipUrl": "https://<host>/api/scripts/<id>/download?installToken=<uuid>",
  "scriptName": "<title>",
  "hubScriptId": "<id>",
  "expiresIn": 120
}
```

### 4.3 Token 规则

| 项 | 值 |
|----|-----|
| 存储 | 内存 `Map`（与 captcha 同模式；PM2 单实例） |
| 载荷 | `{ scriptId, userId, expiresAt }` |
| TTL | **120 秒** |
| 使用 | **一次性**：download 校验成功后删除 |
| 配额 | 签发时不扣；`GET download?installToken=` 成功取包时 `incrementDownloadQuota` |

### 4.4 扩展 `GET /api/scripts/:id/download`

- 带 `installToken`：校验 store（匹配 scriptId、未过期）→ **跳过验证码与 Bearer** → 记配额 → 返回 zip → 删除 token  
- 无 `installToken`：现有登录 + 验证码 + 配额逻辑不变  

Auth 中间件：对 `/api/scripts/*/download` 在存在 `installToken` query 时放行进 handler；无效 token 由 handler 返回 400/401。

### 4.5 错误

| 场景 | HTTP |
|------|------|
| 签发：未登录 | 401 |
| 签发：无权限 | 403 |
| 签发：配额满 | 429 |
| 下载：token 无效/过期/已用/script 不匹配 | 401 |
| 文件缺失 | 404 |

---

## 5. Hub 前端：按钮与流程

### 5.1 UI

- 位置：`WsScriptCard` meta 区，与「下载」并列  
- 条件：`downloadable !== false`  
- 文案：**添加到本地**  
- 点击后 loading，结束前禁用防连点  

### 5.2 点击流程

```
1. 进入 loading
2. GET http://127.0.0.1:19276/health  （timeout ≈ 1s）
   - 失败 → 「请先启动 Autoforge 桌面端，然后再试」→ 结束
3. POST /api/scripts/:id/install-token  （Bearer）
   - 失败 → 展示 Hub message（含配额/权限）→ 结束
4. POST http://127.0.0.1:19276/install
   body: { zipUrl, scriptName, hubScriptId }
5. 成功 → 「已添加到本地 Autoforge」
   失败 → 桌面端 message 或 §7 默认文案
6. 结束 loading
```

### 5.3 配置

- 本机桥 Base URL 默认：`http://127.0.0.1:19276`（composable 常量；v1 可写死）

### 5.4 浏览器注意点

- 请求发往 `127.0.0.1`，依赖桌面端 CORS  
- `zipUrl` 必须是 Autoforge 进程可 GET 的绝对地址（含 installToken），不是 blob URL  

### 5.5 提示展示

与卡片现有行内错误（如 `quotaError`）同类，或项目已有轻量 toast；不新增弹窗。

---

## 6. Hub 不负责的事项

- 监听端口、下载 zip 到磁盘、解压、写入 Autoforge 脚本库  
- 聚焦 Electron 窗口、打开脚本详情  
- 改桌面端 `/health` / `/install` 契约  

---

## 7. 用户可见文案

| 场景 | 文案 |
|------|------|
| health 失败 | 请先启动 Autoforge 桌面端，然后再试 |
| install 成功 | 已添加到本地 Autoforge |
| Hub 配额满 / 权限错误 | 优先用接口返回 `message` |
| 400 / `invalid_package` | 优先用返回 `message`；默认：不是有效的 Autoforge 脚本包 |
| 502 / `download_failed` | 下载失败，请重试 |
| 409 / `busy` | 正在安装，请稍候 |
| 其他错误 | 添加失败，请重试（可附 `message`） |

---

## 8. 验收清单（Hub）

- [ ] 已登录用户可签发 installToken；zip 含合法 `autoforge.json`  
- [ ] Autoforge **未开**：点按钮 → 明确提示启动（且未签发 token）  
- [ ] Autoforge **已开** + 合法包：Hub 成功提示；本机出现脚本并被打开  
- [ ] installToken 过期或复用失败；普通「下载」仍要验证码  
- [ ] 配额满时签发失败并提示；成功取包计入配额  
- [ ] 安装过程中按钮不可重复有效提交  
- [ ] `zipUrl` 为绝对 URL，本机 Autoforge 用 curl 可在 TTL 内下载  

---

## 9. 实现顺序建议

1. `server/utils/install-token.ts` + auth 豁免 + 扩展 `download.get.ts`  
2. `POST .../install-token`  
3. 前端 composable + `WsScriptCard` 按钮流程  
4. 与已实现本机桥的 Autoforge 联调（端口 `19276`）  

---

## 10. 建议文件落点

| 区域 | 路径 |
|------|------|
| Token store | `server/utils/install-token.ts` |
| 签发 API | `server/api/scripts/[id]/install-token.post.ts` |
| 下载扩展 | `server/api/scripts/[id]/download.get.ts` |
| Auth 豁免 | `server/middleware/auth.ts` |
| 本机桥客户端 | `app/composables/useAutoforgeBridge.ts` |
| 按钮与流程 | `app/components/workspace/WsScriptCard.vue` |

---

## 11. 契约速查卡

```
Health:  GET  http://127.0.0.1:19276/health
Install: POST http://127.0.0.1:19276/install
         { "zipUrl": "<absolute url with installToken>", "scriptName?", "hubScriptId?" }

Hub mint: POST /api/scripts/:id/install-token  (Bearer)
Hub zip:  GET  /api/scripts/:id/download?installToken=...  (no cookie; one-shot)

Hub does not: start Autoforge, unzip, or write local script DB
```
