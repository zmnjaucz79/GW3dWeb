/**
 * 从 config/config.yml 解析并注入 process.env（部署包运行时用，与 next.config.js 逻辑一致）
 */
const fs = require('fs');
const path = require('path');

function loadConfigYml(configDir) {
  const configPath = path.join(configDir, 'config', 'config.yml');
  if (!fs.existsSync(configPath)) {
    console.warn('[load-config] 未找到 config/config.yml，使用环境变量或默认值');
    return;
  }
  const content = fs.readFileSync(configPath, 'utf8');
  const blocks = { app: {}, server: {}, scene: {}, database: {} };
  let current = null;
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (/^#/.test(trimmed)) continue;
    if (trimmed === 'app:') {
      current = 'app';
      continue;
    }
    if (trimmed === 'server:') {
      current = 'server';
      continue;
    }
    if (trimmed === 'scene:') {
      current = 'scene';
      continue;
    }
    if (trimmed === 'database:') {
      current = 'database';
      continue;
    }
    if (current && blocks[current]) {
      const keyVal = trimmed.match(/^(\w+):\s*(.*)$/);
      if (keyVal) {
        const key = keyVal[1];
        let val = keyVal[2].trim().replace(/\s*#.*$/, '').trim();
        if (val === 'true' || val === 'yes') val = 'true';
        else if (val === 'false' || val === 'no') val = 'false';
        blocks[current][key] = val;
      }
    }
  }
  const scene = blocks.scene;
  if (scene.distanceFactorEdit != null) process.env.NEXT_PUBLIC_SCENE_DISTANCE_FACTOR_EDIT = String(scene.distanceFactorEdit);
  if (scene.distanceFactorBrowse != null) process.env.NEXT_PUBLIC_SCENE_DISTANCE_FACTOR_BROWSE = String(scene.distanceFactorBrowse);
  if (scene.tunnelModelVersion != null) process.env.NEXT_PUBLIC_SCENE_TUNNEL_MODEL_VERSION = String(scene.tunnelModelVersion);
  const app = blocks.app;
  if (app.name != null) process.env.NEXT_PUBLIC_APP_NAME = String(app.name);
  const server = blocks.server;
  if (server.port != null) process.env.PORT = String(server.port);
  const db = blocks.database;
  if (db.server != null) process.env.DB_SERVER = String(db.server);
  if (db.port != null) process.env.DB_PORT = String(db.port);
  if (db.user != null) process.env.DB_USER = String(db.user);
  if (db.password != null) process.env.DB_PASSWORD = String(db.password);
  if (db.database != null) process.env.DB_DATABASE = String(db.database);
  if (db.encrypt != null) process.env.DB_ENCRYPT = db.encrypt === 'true' ? 'true' : 'false';
  if (db.trustServerCertificate != null) process.env.DB_TRUST_SERVER_CERT = db.trustServerCertificate === 'true' ? 'true' : 'false';
}

module.exports = { loadConfigYml };
