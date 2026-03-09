/**
 * 清理构建产物，避免残留 .body/.meta 等缓存导致现场仍返回旧数据
 * 使用：npm run clean  或  npm run clean:all
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

const dirs = process.argv.includes('--all')
  ? ['.next', 'deploy']
  : ['.next'];

for (const dir of dirs) {
  const full = path.join(root, dir);
  if (fs.existsSync(full)) {
    fs.rmSync(full, { recursive: true });
    console.log('已删除:', dir);
  } else {
    console.log('不存在，跳过:', dir);
  }
}
