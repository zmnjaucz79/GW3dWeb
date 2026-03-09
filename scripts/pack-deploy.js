/**
 * 本地构建后打包为部署目录，可直接拷贝到 Windows 服务器运行
 * 使用：npm run build && node scripts/pack-deploy.js
 * 输出：deploy/ 目录（可打成 zip 拷贝到目标机）
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const standaloneDir = path.join(root, '.next', 'standalone');
const deployDir = path.join(root, 'deploy');

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn('跳过（不存在）:', src);
    return;
  }
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const name of fs.readdirSync(src)) {
      copyRecursive(path.join(src, name), path.join(dest, name));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

function main() {
  if (!fs.existsSync(standaloneDir)) {
    console.error('未找到 .next/standalone，请先执行 npm run build');
    process.exit(1);
  }

  if (fs.existsSync(deployDir)) {
    fs.rmSync(deployDir, { recursive: true });
  }
  fs.mkdirSync(deployDir, { recursive: true });

  console.log('复制 standalone...');
  copyRecursive(standaloneDir, deployDir);

  console.log('复制 .next/static...');
  const staticSrc = path.join(root, '.next', 'static');
  const staticDest = path.join(deployDir, '.next', 'static');
  copyRecursive(staticSrc, staticDest);

  console.log('复制 public...');
  copyRecursive(path.join(root, 'public'), path.join(deployDir, 'public'));

  console.log('复制 config...');
  copyRecursive(path.join(root, 'config'), path.join(deployDir, 'config'));

  console.log('复制启动脚本与配置加载...');
  fs.copyFileSync(
    path.join(root, 'scripts', 'start-server.deploy.js'),
    path.join(deployDir, 'start-server.js')
  );
  fs.copyFileSync(
    path.join(root, 'scripts', 'load-config.js'),
    path.join(deployDir, 'load-config.js')
  );

  console.log('写入说明...');
  fs.writeFileSync(
    path.join(deployDir, 'README-部署.txt'),
    `管网 3D 部署包
=============
1. 按需修改 config/config.yml（server.port、数据库、场景参数）
2. 启动：node start-server.js
3. 端口在 config.yml 的 server.port 中配置，默认 3000
`,
    'utf8'
  );

  console.log('完成。部署目录：', path.resolve(deployDir));
  console.log('请将 deploy 文件夹打成 zip 拷贝到 Windows 服务器，解压后修改 config/config.yml 并执行 node start-server.js');
}

main();
