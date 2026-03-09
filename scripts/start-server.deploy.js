#!/usr/bin/env node
/**
 * 部署包启动入口：先加载 config/config.yml 到 process.env，再启动 Next 独立服务器
 * 部署目录下执行：node start-server.js
 */
const { loadConfigYml } = require('./load-config.js');

loadConfigYml(__dirname);
require('./server.js');
