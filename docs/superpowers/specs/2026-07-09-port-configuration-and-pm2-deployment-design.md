# 端口配置与 PM2 部署设计

**日期**: 2026-07-09
**状态**: 设计稿

---

## 1. 概述

为 Autoforge Hub 统一配置开发和生产环境的运行端口（9876），并引入 PM2 进程管理器实现生产环境的灵活部署。端口号通过环境变量 `NITRO_PORT` 动态传入，不硬编码在配置文件中。

---

## 2. 端口配置

### 2.1 开发环境 — `nuxt.config.ts`

在 `nuxt.config.ts` 中通过 `devServer.port` 固定开发服务器端口，确保本地开发体验一致。

```ts
export default defineNuxtConfig({
  devServer: {
    port: 9876,
  },
  // ... 其余配置保持不变
})
```

### 2.2 生产环境 — 环境变量

Nuxt 的服务器引擎 Nitro 通过以下环境变量决定监听端口（优先级从高到低）：

1. `NITRO_PORT` — Nitro 专用端口变量
2. `PORT` — 通用端口变量（fallback）
3. 默认 3000

生产环境下端口不硬编码，由 PM2 启动时通过环境变量注入。

---

## 3. PM2 部署

### 3.1 新增文件: `ecosystem.config.js`

项目根目录下创建 PM2 生态系统配置文件，用于管理 Nitro 服务进程。

**设计原则：**

| 原则 | 说明 |
|------|------|
| 端口动态 | `NITRO_PORT` 不由配置文件固定，启动时从命令行传入 |
| 多环境 | 通过 `--env` 参数切换 NUXT_ENV |
| 单实例 | 使用 `fork` 模式（SQLite 文件数据库不支持多进程并发写） |
| 日志管理 | PM2 捕获 stdout/stderr，写入统一日志目录 |

### 3.2 配置文件结构

```
autoforge-hub/
├── ecosystem.config.js    # PM2 配置文件（新增）
├── .output/server/
│   └── index.mjs          # Nitro 构建输出入口
├── logs/pm2/              # PM2 运行日志目录
└── .env                   # 环境变量模板（不含端口）
```

### 3.3 `ecosystem.config.js` 设计

```js
module.exports = {
  apps: [
    {
      name: 'autoforge-hub',
      script: './.output/server/index.mjs',

      // 单进程 fork 模式（SQLite 不支持 cluster 多进程并发）
      instances: 1,
      exec_mode: 'fork',

      // 默认环境变量（端口由启动命令动态传入覆盖）
      env: {
        NUXT_ENV: 'development',
        NITRO_PORT: 9876,
      },

      // 各环境覆盖
      env_staging: {
        NUXT_ENV: 'staging',
      },
      env_production: {
        NUXT_ENV: 'production',
      },

      // 日志
      error_file: './logs/pm2/error.log',
      out_file: './logs/pm2/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // 进程管理
      max_restarts: 10,
      restart_delay: 3000,
      max_memory_restart: '500M',
      autorestart: true,
    },
  ],
}
```

### 3.4 使用方式

**动态指定端口启动：**

```bash
# 端口由命令行环境变量注入，覆盖 ecosystem 中的默认值
NITRO_PORT=9876 pm2 start ecosystem.config.js --env production
```

**仅切换环境（使用默认端口）：**

```bash
pm2 start ecosystem.config.js --env staging
```

**其他 PM2 管理命令：**

```bash
pm2 list                    # 查看进程列表
pm2 logs autoforge-hub      # 查看实时日志
pm2 restart autoforge-hub   # 重启
pm2 stop autoforge-hub      # 停止
pm2 delete autoforge-hub    # 删除进程
```

### 3.5 端口优先级说明

PM2 启动时最终生效的端口按以下优先级决定：

1. **命令行环境变量** `NITRO_PORT=9876`（最高优先级，推荐做法）
2. **ecosystem.config.js** 中 `env` / `env_production` 等字段设置的 `NITRO_PORT`（配置默认值）
3. Nitro 内置默认值 3000

---

## 4. 构建流程

```bash
# 1. 构建生产版本
npm run build:prod

# 2. 启动 PM2（动态指定端口）
NITRO_PORT=9876 pm2 start ecosystem.config.js --env production

# 3. 保存 PM2 进程列表（服务器重启后自动恢复）
pm2 save
pm2 startup
```

---

## 5. 未涉及范围

- PM2 cluster 模式（SQLite 限制，不适用）
- 负载均衡 / 反向代理（如 Nginx）配置
- 多服务器部署编排
- CI/CD 集成

---

## 6. 参考

- [Nuxt DevServer 配置](https://nuxt.com/docs/api/configuration/nuxt-config#devserver)
- [Nitro 环境变量](https://nitro.unjs.io/config#environment-variables)
- [PM2 Ecosystem File](https://pm2.keymetrics.io/docs/usage/application-declaration/)
