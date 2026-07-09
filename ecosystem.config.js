// PM2 Ecosystem File for Autoforge Hub
// https://pm2.keymetrics.io/docs/usage/application-declaration/
//
// Usage:
//   NITRO_PORT=9876 pm2 start ecosystem.config.js --env production
//   pm2 start ecosystem.config.js --env staging
//   pm2 start ecosystem.config.js (defaults to development)

module.exports = {
  apps: [
    {
      name: 'autoforge-hub',
      script: './.output/server/index.mjs',

      // SQLite 不支持多进程并发写入，使用 fork 单实例模式
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
