/**
 * PM2 进程配置，用于生产环境常驻运行
 * 使用：在项目根目录执行 pm2 start ecosystem.config.cjs
 */
module.exports = {
  apps: [
    {
      name: 'gw3dweb',
      cwd: __dirname,
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      env: { NODE_ENV: 'production' },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
    },
  ],
};
