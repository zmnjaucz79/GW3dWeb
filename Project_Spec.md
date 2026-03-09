智能矿山 3D 传感器管理平台 - 开发规范
1. 项目愿景 (Vision)
构建一个全栈式的数字孪生管理系统，支持在 3D 矿山巷道模型中精准布设传感器，并实现工业级的数据持久化与可视化。

2. 技术栈 (Technical Stack)
基础架构: Next.js 14+ (App Router, 全栈模式)

3D 引擎: React Three Fiber (R3F) + Three.js

UI 组件库: Ant Design 5.0 (Antd)

状态管理: Zustand (用于处理模式切换与传感器数据)

后端 API: Next.js API Routes (处理 JSON 文件读写，实现无数据库环境下的数据持久化)

样式: Ant Design CSS (科技蓝/暗色系风格)

3. 核心功能实现逻辑
3.1 3D 交互 (Interactive Logic)
坐标系: 强制使用“局部坐标系”。

计算: localPoint = tunnelMesh.worldToLocal(event.point)。

目的: 保证巷道模型在场景中平移或旋转时，传感器点位始终固定在巷道壁的原有位置。

模式切换:

编辑模式: 启用 TransformControls。支持通过鼠标点击模型表面新增点位。

视图模式: 禁用交互轴。点击点位触发 Antd Drawer 弹出，展示 ECharts 历史曲线。

3.2 UI 布局 (UI Architecture)
参照 1920*1080 响应式设计：

Header: 包含项目标题及 Antd Segmented 组件（切换 [编辑/预览]）。

Right Panel: Antd Drawer 组件，用于展示传感器详细参数及动态图表。

Footer: 浮动按钮组，包含 PerspectiveCamera 复位、保存当前布局、一键清空等功能。

4. 后端接口设计 (API Routes)
为了实现 Windows 环境下的“一键部署”，后端使用文件系统（fs）存储数据。

GET /api/sensors:

读取根目录下 data/layout.json。

POST /api/sensors:

接收前端发送的传感器数组，并写入 data/layout.json。

5. 目录结构推荐 (Project Structure)
Plaintext
├── app/
│   ├── api/sensors/route.ts   # 后端读写逻辑
│   ├── layout.tsx             # Antd ConfigProvider 配置
│   └── page.tsx               # 3D 场景入口
├── components/
│   ├── Three/
│   │   ├── SceneContainer.tsx # Canvas 全屏容器
│   │   ├── TunnelModel.tsx    # 巷道加载与点击逻辑
│   │   └── SensorGroup.tsx    # 渲染所有已保存的点位
│   └── UI/
│       ├── ControlHeader.tsx  # 顶部模式切换
│       └── SidePanel.tsx      # 右侧数据面板
├── store/
│   └── useSensorStore.ts      # Zustand 状态机
└── public/
    ├── models/                # 存放巷道 GLB 文件
    └── background/            # 1920*1080 科技感底图
6. 给 AI 编程助手的指令 (Prompts)
任务 1：初始化场景
"请基于 React Three Fiber 和 Next.js 14 搭建一个基础 3D 场景。要求加载 public/models/tunnel.glb 模型，并使其在屏幕中心渲染，支持 OrbitControls 缩放旋转。"

任务 2：实现坐标保存逻辑
"编写一个点击函数。当 isEditMode 为 true 时，点击 tunnelMesh 表面获取 worldPoint，并将其转换为 localPoint。然后通过 fetch 将坐标发送给 /api/sensors 接口。"

任务 3：Antd 界面集成
"使用 Ant Design 在页面顶部添加一个悬浮的模式切换开关。右侧添加一个抽屉面板，点击 3D 场景中的传感器图标时，抽屉从右侧滑出并展示对应的传感器 ID。"