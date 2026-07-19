# Release 脚本设计（release-app.js）

**日期**: 2026-07-19  
**状态**: 已确认  
**范围**: 本地打包 → SSH/SFTP 上传 → 原子切换 `.output` → `pm2 reload all`

---

## 1. 概述

新增根目录脚本 `release-app.js`，一键完成 Autoforge Hub 的远端发布：本地按环境构建 Nuxt/Nitro 产物，通过 SSH 密码登录服务器，将本地 `.output` 安全替换到远端项目目录，然后执行 `pm2 reload all`。

本脚本不替代既有的 `ecosystem.config.js` / 端口设计，只负责发布产物与重载进程。

---

## 2. 决策摘要

| 项 | 选择 |
|----|------|
| 实现方式 | 纯 Node + `ssh2` / `ssh2-sftp-client` |
| SSH 认证 | 密码；写在脚本顶部变量，非交互 |
| 构建环境 | `--env staging\|prod`，默认 `staging` |
| 远端目录 | 脚本变量，默认 `/root/project/autoforge-hub` |
| 替换策略 | 上传到临时目录 → 校验 → 原子切换；失败保留旧版 |
| 密钥进 Git | 提交 `release-app.js`，密码留空占位，本地自行填写 |

---

## 3. 文件与依赖

### 3.1 新增 / 修改

| 路径 | 变更 |
|------|------|
| `release-app.js` | 新增；ESM（与 `"type": "module"` 一致） |
| `package.json` | 增加 npm scripts；`devDependencies` 增加 `ssh2`、`ssh2-sftp-client` |

### 3.2 npm scripts

```json
"release": "node release-app.js",
"release:prod": "node release-app.js --env prod"
```

- `npm run release` → 默认 staging（`build:staging`）
- `npm run release:prod` → production（`build:prod`）

### 3.3 脚本顶部配置（占位）

```js
const SSH = {
  host: '',        // 必填
  port: 22,
  username: 'root',
  password: '',    // 必填；勿将真实密码提交到远程仓库
}

const REMOTE_DIR = '/root/project/autoforge-hub'
```

启动前校验：`host`、`password` 非空；否则立即退出，不连接远端。

---

## 4. CLI 与构建映射

| `--env` | 本地命令 |
|---------|----------|
| `staging`（默认） | `npm run build:staging` |
| `prod` | `npm run build:prod` |

非法 `--env` 值：立即退出并提示合法取值。

构建使用 `child_process`（`stdio: 'inherit'`），失败则非 0 退出，不进入上传阶段。构建成功后确认本地存在 `.output` 目录。

---

## 5. 上传与原子切换

### 5.1 远端路径约定（均在 `REMOTE_DIR` 下）

| 路径 | 用途 |
|------|------|
| `.output` | 正式运行目录（PM2 指向此处） |
| `.output.next` | 本次上传的临时目录 |
| `.output.prev` | 切换瞬间的旧目录；成功后删除 |

### 5.2 步骤

1. **清理残留**：若远端已存在 `.output.next`，先 `rm -rf` 删除。
2. **上传**：SFTP 递归上传本地 `.output/**` → 远端 `.output.next/**`，保留目录结构。
3. **校验**（全部通过才切换）：
   - 远端存在 `.output.next/server/index.mjs`
   - 抽样比对本地与远端文件大小一致：至少包括 `server/index.mjs`、`server/package.json`（若本地存在）
4. **原子切换**（SSH exec，工作目录为 `REMOTE_DIR`）：
   - 若 `.output` 存在：`mv .output .output.prev`
   - `mv .output.next .output`
   - 若 `.output.prev` 存在：`rm -rf .output.prev`
5. **失败处理**：
   - 上传或校验失败：删除 `.output.next`，不改动现有 `.output`
   - 若已执行 `mv .output .output.prev` 但后续失败：尽量 `mv .output.prev .output` 恢复，并清理残余的 `.output.next`

### 5.3 明确不做

- 不修改远端 `.env`、`data/`、`ecosystem.config.js`、日志目录等
- 不在远端执行 `npm install` 或 `nuxi build`
- 不做 `pm2 start` / `pm2 save` / `pm2 startup`（假定进程已由既有 PM2 配置管理）

---

## 6. PM2 重载

切换成功后，在远端执行：

```bash
cd <REMOTE_DIR> && pm2 reload all
```

- 捕获 stdout/stderr 并打印
- 非 0 退出码视为发布失败
- 此时 `.output` 可能已是新版本：日志必须明确提示「代码已切换，但 PM2 reload 失败，请手动检查」

---

## 7. 错误处理与退出码

| 阶段 | 行为 |
|------|------|
| 配置缺失 / 非法 `--env` | 立即退出，不连接远端 |
| 本地 build 失败 | 退出，不上传 |
| SSH/SFTP 连接失败 | 退出 |
| 上传或校验失败 | 删 `.output.next`，保留旧 `.output` |
| 切换中途失败 | 尽量恢复 `.output.prev` → `.output` |
| `pm2 reload` 失败 | 非 0 退出，并提示需人工介入 |

任意失败：`process.exit(1)`（或等价非 0）。成功：`process.exit(0)`。

---

## 8. 日志

分步进度前缀，例如：

```
[1/6] Building (staging)...
[2/6] Connecting SSH...
[3/6] Uploading .output → .output.next...
[4/6] Verifying upload...
[5/6] Switching .output...
[6/6] pm2 reload all...
```

- 上传阶段显示进度（已传文件数 / 总文件数，或按目录摘要）
- 绝不打印 `password` 字段

---

## 9. 组件边界

| 单元 | 职责 | 依赖 |
|------|------|------|
| CLI / 配置解析 | 读 `--env`、校验 SSH 变量 | 无 |
| `runBuild(env)` | 执行对应 npm build | `child_process` |
| `connectSftp(ssh)` | 建立 SFTP 会话 | `ssh2-sftp-client` |
| `uploadOutput(sftp)` | 递归上传到 `.output.next` | SFTP |
| `verifyOutput(sftp)` | 入口文件存在 + 大小抽样 | SFTP |
| `switchOutput(ssh)` | 远端 mv/rm 原子切换与回滚 | `ssh2` exec |
| `reloadPm2(ssh)` | `pm2 reload all` | `ssh2` exec |

可全部放在单文件 `release-app.js` 内，用函数划分即可；无需单独包结构。

---

## 10. 手动验收清单

- [ ] `npm run release` 默认走 `build:staging`，成功后远端 `.output` 更新且服务可用
- [ ] `npm run release:prod`（或 `--env prod`）走 `build:prod`
- [ ] 空 `host` / `password` 时立即失败，不连接
- [ ] 故意填错密码：连接失败，远端 `.output` 不变
- [ ] 校验失败场景（若可模拟）：`.output.next` 被清理，旧 `.output` 保留
- [ ] 日志中不出现密码明文

---

## 11. 与既有部署设计的关系

- 端口与 PM2 进程定义见 [2026-07-09-port-configuration-and-pm2-deployment-design.md](./2026-07-09-port-configuration-and-pm2-deployment-design.md)
- 本脚本假定远端已存在可用的 PM2 进程与 `ecosystem.config.js`；仅替换 `.output` 并 `reload`
- Railway 部署文档（`docs/deploy-railway.md`）不受影响；本脚本面向自有 SSH 服务器

---

## 12. 安全说明

- 密码以明文写在本地脚本中，存在误提交风险；提交仓库时保持 `password: ''` 占位
- 不在本设计中引入密钥管理或 CI 密钥注入（YAGNI）；若后续需要再单独立项
