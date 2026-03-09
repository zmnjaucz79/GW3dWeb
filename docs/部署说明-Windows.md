# 管网 3D 可视化系统 - Windows 部署说明

本文档说明在 Windows 服务器或 PC 上部署并运行本应用（Next.js 14）的步骤。  
**构建方式**：使用 Next.js 自带的 Webpack 进行打包（`next build`），生成生产产物与 standalone 部署包。

---

## 一、环境要求

| 项目 | 要求 |
|------|------|
| 操作系统 | Windows 10 / Windows Server 2016 及以上 |
| Node.js | **18.x 或 20.x**（推荐 LTS），[官网下载](https://nodejs.org/) |
| 数据库 | SQL Server（可远程），需能访问 `Sensor3DLayout`、`Deviceinformation`、`realdata` 等表 |
| 网络 | 部署机可访问 SQL Server 的 1433 端口 |

安装 Node 后，在 PowerShell 或 CMD 中执行：

```powershell
node -v   # 应显示 v18.x 或 v20.x
npm -v
```

---

## 二、本地构建并打包部署（推荐）

在开发机（本机）上先构建并打成部署包，再拷贝到 Windows 服务器运行，**目标机只需安装 Node.js，无需 npm install 或源码**。

### 1. 本机执行构建与打包

在项目根目录执行：

```bash
npm run build
npm run pack
```

- `npm run build` 使用 Webpack（Next.js 默认）生成生产构建，输出 `.next` 及 standalone 目录。
- `npm run pack` 会生成 **`deploy/`** 目录，内含运行所需的全部文件（精简后的 Node 依赖、静态资源、配置与启动脚本）。

### 2. 拷贝到 Windows 服务器

将 **`deploy`** 整个文件夹打成 zip（或直接拷贝），传到目标 Windows 机器并解压到任意目录，例如：

```
C:\apps\gw3dweb-deploy\
├── server.js           # Next 独立服务器
├── start-server.js     # 启动入口（会先加载 config/config.yml）
├── load-config.js
├── node_modules\       # 精简依赖
├── .next\
├── public\
└── config\
    └── config.yml
```

### 3. 在 Windows 服务器上运行

1. 确保已安装 **Node.js 18 或 20**（仅需 Node，无需 npm 或项目源码）。
2. 按实际环境编辑 **`config/config.yml`**（数据库地址、账号、场景参数等）。
3. 在部署目录下执行：

```powershell
cd C:\apps\gw3dweb-deploy
node start-server.js
```

4. 浏览器访问 `http://本机IP:端口`（端口在 `config/config.yml` 的 **server.port** 中配置，默认 3000）。

**说明**：`start-server.js` 会在启动前读取 `config/config.yml` 并写入环境变量（含端口），因此部署后只需改 yml 即可，无需重新构建。

---

## 三、在服务器上完整构建并部署

若希望在目标 Windows 机器上从源码构建（例如从 Git 拉代码再 build），可按以下步骤。

### 1. 获取项目代码

将项目拷贝到目标机器，例如：

```powershell
# 若使用 Git
git clone <仓库地址> C:\apps\gw3dweb
cd C:\apps\gw3dweb
```

或直接复制整个项目文件夹（含 `config`、`public`、`app`、`components` 等）到目标目录。

### 2. 安装依赖

在项目根目录执行：

```powershell
cd C:\apps\gw3dweb
npm install
```

若公司网络需代理，可先设置：

```powershell
npm config set proxy http://代理地址:端口
npm config set https-proxy http://代理地址:端口
```

### 3. 配置应用

编辑 **`config/config.yml`**，按实际环境修改：

- **app.name**：应用名称（页面标题、顶栏显示，默认「智能矿山 3D 传感器管理平台」）。
- **server.port**：本服务 HTTP 监听端口（默认 3000）。
- **database**：SQL Server 地址、端口、账号、密码、数据库名、加密选项等。
- **scene**：如需调整 3D 标签大小或巷道模型版本，可改 `distanceFactorEdit`、`distanceFactorBrowse`、`tunnelModelVersion`。

示例（仅作参考，请改为实际值）：

```yaml
app:
  name: 智能矿山 3D 传感器管理平台

database:
  server: 192.168.1.100    # SQL Server 地址
  port: 1433
  user: sa
  password: 你的密码
  database: gwjc1
  encrypt: false
  trustServerCertificate: true

scene:
  distanceFactorEdit: 60
  distanceFactorBrowse: 58
  tunnelModelVersion: 1
```

**说明**：配置在下次启动或构建时生效，修改后需重启进程。

可选：若需用环境变量覆盖部分配置，可在项目根目录新建 **`.env.local`**（不要提交到 Git），例如：

```
# 可选：覆盖 config.yml 中的值
# DB_SERVER=192.168.1.100
```

### 4. 构建生产包

```powershell
npm run build
```

构建过程中会连接数据库（拉取布局等），若当时数据库不可达，可能看到连接错误日志，但构建仍可能成功；运行时需保证数据库可访问。

### 5. 启动服务

```powershell
npm run start
```

监听端口由 **config/config.yml** 中 **server.port** 决定（默认 3000）。浏览器访问 `http://本机IP:端口` 或 `http://localhost:端口`。

---

## 四、以 Windows 服务方式常驻运行（可选）

若希望开机自启、崩溃自动重启，可使用 **NSSM** 或 **pm2** 将应用注册为 Windows 服务。

### 方式 A：使用 NSSM

1. 下载 [NSSM](https://nssm.cc/download)，解压后从 `win64` 目录将 `nssm.exe` 放到 PATH 或固定目录。
2. 以**管理员**打开 CMD 或 PowerShell，执行：

**部署包方式**（使用第二节生成的 `deploy` 目录）：

```powershell
nssm install Gw3dWeb "C:\Program Files\nodejs\node.exe" "start-server.js"
nssm set Gw3dWeb AppDirectory "C:\apps\gw3dweb-deploy"
nssm start Gw3dWeb
```

**源码方式**（在项目根目录用 npm start）：

```powershell
nssm install Gw3dWeb "C:\Program Files\nodejs\node.exe" "C:\apps\gw3dweb\node_modules\next\dist\bin\next" "start"
nssm set Gw3dWeb AppDirectory "C:\apps\gw3dweb"
nssm start Gw3dWeb
```

在“服务”管理器中可看到 `Gw3dWeb`，可设为“自动”启动。

### 方式 B：使用 PM2

1. 全局安装 PM2：

```powershell
npm install -g pm2
npm install -g pm2-windows-startup
```

2. **部署包方式**：在 `deploy` 目录下执行（无需 ecosystem 文件）：

```powershell
cd C:\apps\gw3dweb-deploy
pm2 start start-server.js --name gw3dweb
pm2 save
pm2-startup install
```

**源码方式**：在项目根目录使用已有的 **`ecosystem.config.cjs`**：

```powershell
cd C:\apps\gw3dweb
pm2 start ecosystem.config.cjs
pm2 save
pm2-startup install
```

---

## 五、端口与反向代理（可选）

- 修改端口：在 **config/config.yml** 中设置 **server.port**（如 8080），重启服务即可。
- 若前面有 **IIS** 或 **Nginx**，可做反向代理到本应用的监听端口，并配置 HTTPS。

---

## 六、更新与回滚

**若采用“本地构建并打包部署”（第二节）**：

1. 本机重新执行 `npm run build` 与 `npm run pack`，用新的 `deploy/` 覆盖服务器上的部署目录（或解压新 zip）。
2. 在服务器上按需修改 `config/config.yml`（如数据库、`tunnelModelVersion` 等），然后执行 `node start-server.js` 或重启已有服务。

**若在服务器上从源码构建（第三节）**：

1. **更新代码/资源**：替换除 `node_modules`、`.next` 外的项目文件；若更新了 `public/models/tunnel.glb`，请在 `config/config.yml` 中将 `scene.tunnelModelVersion` 数值加 1。
2. 重新安装依赖（仅当 `package.json` 或锁文件变更时）：`npm install`
3. 重新构建并重启：`npm run build`、`npm run start`；若使用 NSSM/PM2，则重启对应服务即可。

---

## 七、常见问题

| 现象 | 处理建议 |
|------|----------|
| 页面一直加载或空白 | 检查浏览器控制台报错；确认 Node 版本 18+；`npm run build` 是否成功。 |
| 接口 500 / 连接数据库失败 | 检查 `config/config.yml` 中 database 配置；确认本机能访问 SQL Server 的 1433 端口（防火墙、网络）。 |
| 更新 tunnel.glb 后仍显示旧模型 | 将 `config/config.yml` 中 `scene.tunnelModelVersion` 改大并重启服务；必要时浏览器强制刷新（Ctrl+F5）。 |
| 端口被占用 | 修改 **config/config.yml** 中 **server.port** 为其他端口后重启。 |

---

## 八、目录与配置速查

- **应用配置**：`config/config.yml`（应用名称、端口、数据库、3D 场景参数、巷道模型版本）
- **可选环境变量覆盖**：`.env.local`（不提交版本库）
- **静态资源**：`public/`（模型、图片等）
- **构建产物**：`npm run build` 生成 `.next/`，运行 `npm run start` 时使用该目录。

按上述步骤即可在 Windows 上完成部署与日常更新维护。
