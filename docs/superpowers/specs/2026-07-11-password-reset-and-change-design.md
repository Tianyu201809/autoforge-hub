# 忘记密码与改密码设计

## 概述

为 Autoforge Hub 增加密码自助恢复与已登录改密能力：

1. **忘记密码** — 登录页通过 Resend 发送 6 位验证码，校验后设置新密码并自动登录
2. **改密码** — 个人资料页输入旧密码 + 新密码完成修改
3. **会话失效** — 任一路径成功后 bump `token_version`，使所有旧 JWT 立即失效；当前操作返回新 JWT 保持登录

本轮不做：记住我、文档重构、注册邮箱验证、OAuth、设备级会话列表。

---

## 架构

```
忘记密码:
  登录页 → POST /api/auth/forgot-password { email }
       →（邮箱存在）写入 password_reset_codes + Resend 发码
       → 用户输入 code + newPassword
       → POST /api/auth/reset-password
       → 更新 password_hash、token_version++、删码 → 返回新 JWT → 写 session → /workspace

改密码:
  资料页 → PUT /api/auth/password { oldPassword, newPassword }
       → 校验旧密码 → 更新 password_hash、token_version++ → 返回新 JWT → 更新本地 session

鉴权:
  JWT payload 含 tv；middleware 查 users.token_version，不一致 → 401
```

### 技术选型

| 组件 | 选择 | 原因 |
|------|------|------|
| 邮件 | Resend HTTP API | 用户指定；无需自建 SMTP |
| 验证码 | 6 位数字，哈希入库 | 用户选择；进程重启不丢 |
| 踢会话 | `users.token_version` + JWT `tv` | 兼容现有无状态 JWT，改动最小 |
| 密码哈希 | bcryptjs（现有） | 与注册/登录一致 |

---

## 数据层

### users 新增列

```sql
ALTER TABLE users ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0;
```

- 登录 / 注册签发 JWT 时写入当前 `token_version` 为 `tv`
- 改密或重置成功时：`token_version = token_version + 1`，新 JWT 使用新值

### password_reset_codes 表

```sql
CREATE TABLE IF NOT EXISTS password_reset_codes (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
```

| 字段 | 说明 |
|------|------|
| `id` | UUID |
| `email` | 小写邮箱 |
| `code_hash` | 6 位码的 SHA-256 十六进制摘要（`sha256(code + JWT_SECRET)`），不存明文 |
| `expires_at` | ISO-8601，有效期 **10 分钟** |
| `attempts` | 校验失败次数；上限 **5**，超限作废该码 |
| `created_at` | 用于 **60 秒** 重发冷却 |

同一邮箱只保留最新一条：发新码前删除该邮箱旧记录。

Drizzle `schema.ts` 同步补充 `token_version` 与 `password_reset_codes`（与运行时 migration 对齐）。

---

## API

公开路由需加入 `server/middleware/auth.ts` 白名单。

| 方法 | 路径 | 鉴权 | 请求体 | 成功响应 |
|------|------|------|--------|----------|
| POST | `/api/auth/forgot-password` | 否 | `{ email }` | `{ ok: true, message: "若该邮箱已注册，将收到验证码" }` |
| POST | `/api/auth/reset-password` | 否 | `{ email, code, newPassword }` | `{ ok: true, user, token }` |
| PUT | `/api/auth/password` | 是 | `{ oldPassword, newPassword }` | `{ ok: true, user, token }` |

### 密码规则

与注册一致：至少 **8** 位（`register.post.ts`）。

### forgot-password 行为

1. 规范化 email（trim + lower）
2. 查用户：不存在 → 仍返回统一成功文案（**防邮箱枚举**），不发信
3. 存在：若该邮箱最新码 `created_at` 在 60 秒内 → 429「请稍后再试」
4. 生成 6 位数字码 → 哈希入库（先删旧码）→ Resend 发送
5. Resend 失败：打日志；对用户返回「发送失败，请稍后重试」

### reset-password 行为

1. 查最新码：不存在 / 过期 → 400「验证码无效或已过期」
2. `attempts >= 5` → 删码，400「尝试次数过多，请重新获取」
3. 码不匹配 → `attempts++`，400「验证码错误」
4. 新密码校验通过 → 更新 `password_hash`、`token_version++`、删码 → 签发含新 `tv` 的 JWT

### change-password（PUT /password）行为

1. 校验 `oldPassword`
2. `newPassword === oldPassword` → 400「新密码不能与旧密码相同」
3. 更新哈希、`token_version++` → 返回新 JWT（前端替换本地 token，当前页保持登录）

### JWT 与中间件

```ts
interface JwtPayload {
  userId: string
  email: string
  tv: number  // token_version
}
```

- `signToken` / `login` / `register` 均写入当前 `token_version`
- 鉴权：`verifyToken` 后查询 `users.token_version`；缺失用户或 `tv` 不匹配 → 401「登录已过期，请重新登录」
- 兼容：库中无 `token_version` 的旧行经 migration 默认为 `0`；**旧 JWT 无 `tv` 字段视为无效**，用户需重新登录一次（可接受的一次性迁移成本）

---

## 邮件（Resend）

### 环境变量

| 变量 | 必填 | 说明 |
|------|------|------|
| `RESEND_API_KEY` | 是（发信时） | Resend API Key |
| `RESEND_FROM` | 是 | 如 `Autoforge Hub <noreply@yourdomain.com>` |

未配置时：开发环境返回明确配置错误；生产拒绝发送并记错误日志。

### 封装

新建 `server/utils/email.ts`：

- `sendPasswordResetCode(email: string, code: string): Promise<void>`
- 调用 Resend REST API（`https://api.resend.com/emails`），依赖用 `fetch`，可不强制加 npm 包；若团队偏好也可加 `resend` SDK

### 内容

- 主题：`Autoforge Hub 密码重置验证码`
- 正文：展示 6 位码、说明 10 分钟有效、非本人可忽略
- 提供纯文本 + 简单 HTML

---

## 前端

### 登录页（`app/pages/login.vue`）

同页分步状态机，不新增路由：

| 步骤 | UI |
|------|----|
| login / register | 现有；登录表单增加「忘记密码？」 |
| forgot-email | 邮箱输入 → 提交 forgot-password |
| forgot-reset | 验证码 + 新密码 + 确认密码；「重新发送」（60s 冷却）、「返回登录」 |

重置成功：`useAuth` 写入 session → `navigateTo('/workspace')`。

样式沿用现有 `auth` layout 与表单组件。

### 资料页（`app/pages/workspace/profile.vue`）

新增「修改密码」区块：旧密码、新密码、确认新密码。成功后用返回 token 更新 session，toast「密码已更新」。

### `useAuth` 扩展

- `forgotPassword(email)`
- `resetPassword(email, code, newPassword)` — 成功写 session
- `changePassword(oldPassword, newPassword)` — 成功替换 token / session

前端收到 401（含 version 不匹配）时：清 session，跳转 `/login`（沿用或补强现有处理）。

---

## 文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `server/db/index.ts` | 修改 | migration：`token_version`、`password_reset_codes` |
| `server/db/schema.ts` | 修改 | 对齐 drizzle 定义 |
| `server/utils/jwt.ts` | 修改 | payload 增加 `tv` |
| `server/utils/email.ts` | **新建** | Resend 发信 |
| `server/middleware/auth.ts` | 修改 | 白名单 + `tv` 校验 |
| `server/api/auth/login.post.ts` | 修改 | JWT 带 `tv` |
| `server/api/auth/register.post.ts` | 修改 | JWT 带 `tv` |
| `server/api/auth/forgot-password.post.ts` | **新建** | 发码 |
| `server/api/auth/reset-password.post.ts` | **新建** | 校验码并重置 |
| `server/api/auth/password.put.ts` | **新建** | 已登录改密 |
| `app/composables/useAuth.ts` | 修改 | 三个新方法 + token 刷新 |
| `app/pages/login.vue` | 修改 | 忘记密码分步 UI |
| `app/pages/workspace/profile.vue` | 修改 | 改密码表单 |
| `app/types/auth.ts` | 按需修改 | 类型补充 |

---

## 错误处理摘要

| 场景 | 行为 |
|------|------|
| 邮箱未注册 | 统一成功文案，不发信 |
| Resend 失败 | 日志 + 用户可见发送失败 |
| 验证码错误 | attempts++ |
| 超过 5 次 | 作废，要求重发 |
| 码过期 / 已用 | 提示重新获取 |
| 60s 内重发 | 429 / 「请稍后再试」 |
| 确认密码不一致 | 前端拦截 |
| 新密码同旧密码 | 400 |
| `tv` 不匹配 | 401，清 session |

---

## 测试要点

- 发码 60s 冷却与防枚举（未注册邮箱响应文案相同）
- 错误 5 次后码作废
- 重置后旧 JWT 访问受保护 API 返回 401
- 改密后当前页仍可用（新 token），其他设备旧 token 失效
- 未配置 Resend 时错误可预期
- 密码少于 8 位被拒绝

---

## 后续子项目（本 spec 之外）

按既定优先级另开设计：

1. **记住我** — 延长会话 / cookie 策略
2. **重构文档** — README、code-map 与当前工作区产品对齐
