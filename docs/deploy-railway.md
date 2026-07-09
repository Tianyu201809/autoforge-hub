# Railway 部署指南

> 本指南将 Autoforge Hub 部署到 [Railway](https://railway.app) 免费云平台。

---

## 前提条件

1. [GitHub](https://github.com) 账号
2. [Railway](https://railway.app) 账号（用 GitHub 登录）
3. 本项目已推送至 GitHub 仓库

---

## 一、推送代码到 GitHub

```bash
# 如果还没有初始化仓库
git init
git add .
git commit -m "feat: init Autoforge Hub"

# 在 GitHub 创建仓库后关联并推送
git remote add origin https://github.com/你的用户名/autoforge-hub.git
git branch -M main
git push -u origin main
```

---

## 二、Railway 中创建项目

### 方式 A：通过 Web Dashboard（推荐新手）

1. 打开 [Railway Dashboard](https://railway.app/dashboard)
2. 点击 **New Project** → **Deploy from GitHub repo**
3. 授权 Railway 访问你的 GitHub
4. 选择 `autoforge-hub` 仓库
5. Railway 会自动检测项目并开始部署（首次可能会失败，因为还没配环境变量）

### 方式 B：通过 CLI

```bash
# 安装 Railway CLI
npm install -g @railway/cli

# 登录
railway login

# 在项目目录中关联
cd d:\myProject\AutoforgeHub
railway init

# 链接到项目（如果已创建）
railway link
```

---

## 三、配置持久卷（关键！）

SQLite 数据库需要持久化存储，否则重启后数据会丢失。

1. 在 Railway Dashboard 中进入你的项目
2. 点击 **Volumes** 标签页
3. 点击 **New Volume**
4. 配置：

| 字段 | 值 |
|------|-----|
| **Volume Name** | `autoforge-data` |
| **Mount Path** | `/data` |
| **Size** | `1 GB` |

5. 点击 **Create Volume**

> 数据库文件将通过 `DATABASE_URL=/data/autoforge-prod.db` 存入这个卷中。

**可选**：如果使用本地文件存储（未配置 Ali-OSS），再创建一个卷：

| 字段 | 值 |
|------|-----|
| **Volume Name** | `autoforge-storage` |
| **Mount Path** | `/app/server/storage` |
| **Size** | `1 GB` |

---

## 四、设置环境变量

在 Railway Dashboard → 项目 → **Variables** 中添加：

### 必需的环境变量

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `NUXT_ENV` | `production` | 生产环境标志 |
| `JWT_SECRET` | `你的随机密钥` | JWT 签名密钥（**必须修改！**） |
| `DATABASE_URL` | `/data/autoforge-prod.db` | SQLite 数据库路径 |

生成 JWT 密钥：
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Ali-OSS 配置（推荐，用于文件存储）

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `NUXT_OSS_ACCESS_KEY_ID` | 你的 AccessKeyId | OSS 访问密钥 |
| `NUXT_OSS_ACCESS_KEY_SECRET` | 你的 AccessKeySecret | OSS 访问密钥 |
| `NUXT_OSS_BUCKET` | 你的 Bucket 名称 | OSS 存储桶 |
| `NUXT_OSS_REGION` | `oss-cn-hangzhou` | OSS 地域（按需修改） |
| `NUXT_OSS_ENDPOINT` | 可选 | 自定义 OSS 端点 |

> 如果不配置 OSS，文件将存储在本地 `server/storage/` 目录。需要额外创建持久卷挂载到 `/app/server/storage`。

### 其他可选变量

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `NITRO_PORT` | `8080` | 服务器端口（Railway 自动设置 `PORT`，通常无需修改） |

---

## 五、触发部署

配置好变量和持久卷后，Railway 会自动重新部署。

手动触发：

- **Web 界面**：点击 **Deploy** 按钮
- **CLI**：`railway up`
- **Git Push**：推送新 commit 到 GitHub 即可触发自动部署

查看部署日志：
- **Web 界面**：项目页面 → **Deployments** 标签页
- **CLI**：`railway logs`

---

## 六、验证部署

部署成功后，Railway 会分配一个 `*.railway.app` 域名。

1. 在项目页面 → **Settings** → **Domains** 查看生成的域名
2. 访问 `https://你的项目.up.railway.app`
3. 注册一个账号测试登录功能
4. 检查数据库是否正常读写

---

## 七、配置自定义域名（可选）

1. 项目 → **Settings** → **Domains**
2. 点击 **Custom Domain**
3. 输入你的域名（如 `hub.yourdomain.com`）
4. 在 DNS 提供商处添加 CNAME 记录指向 `你的项目.up.railway.app`

---

## 八、常见问题

### Q: 部署后数据库数据丢失？

检查：
1. 持久卷是否正确挂载到 `/data`
2. `DATABASE_URL` 是否设置为 `/data/autoforge-prod.db`
3. 项目 `sleepStrategy` 是否设为 `never`（已在 `railway.toml` 中配置）

### Q: 构建失败 "sql-wasm.wasm not found"？

该项目的 `nuxt.config.ts` 已有 `nitro.hooks.compiled` 自动复制 WASM 文件。如果失败，手动确认：
```bash
ls .output/server/node_modules/sql.js/dist/sql-wasm.wasm
```

### Q: Railway 免费层够用吗？

免费层包含：
- **$5 月赠金**（本项目约消耗 $4.67/月）
- **512MB RAM + 1GB 磁盘**（含持久卷）
- **自动休眠**（但我们已配置 `sleepStrategy = "never"`，避免数据库断连）

> **注意**：免费项目会在 30 天不活跃后自动删除。如需长期运行，建议设置信用卡（仅超出免费额度时扣费）。

---

## 九、更新部署

推送新代码到 GitHub 会自动触发重新部署：

```bash
git add .
git commit -m "feat: 新功能"
git push
```

Railway 会自动：
1. 拉取最新代码
2. 安装依赖
3. 构建项目
4. 替换运行中的实例（持久卷数据保留）
