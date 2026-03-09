/**
 * 应用与场景配置，由 config/config.yml 在 next 启动时注入 process.env，此处仅读取
 */

/** 应用名称（页面标题、顶栏），可在 config/config.yml 的 app.name 中修改 */
export const APP_NAME =
  process.env.NEXT_PUBLIC_APP_NAME ?? '智能矿山 3D 传感器管理平台';

function parseNumber(value: string | undefined, fallback: number): number {
  if (value == null || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** 编辑模式下传感器/分站标签的 Html 距离系数，越大标签在屏幕上越大 */
export const SCENE_DISTANCE_FACTOR_EDIT = parseNumber(
  process.env.NEXT_PUBLIC_SCENE_DISTANCE_FACTOR_EDIT,
  60
);

/** 浏览模式下传感器/分站标签的 Html 距离系数 */
export const SCENE_DISTANCE_FACTOR_BROWSE = parseNumber(
  process.env.NEXT_PUBLIC_SCENE_DISTANCE_FACTOR_BROWSE,
  58
);

/** 巷道模型 URL，带版本号避免更新 tunnel.glb 后仍加载缓存 */
export const TUNNEL_MODEL_URL =
  '/models/tunnel.glb?v=' + (process.env.NEXT_PUBLIC_SCENE_TUNNEL_MODEL_VERSION ?? '1');
