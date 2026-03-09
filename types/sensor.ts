export interface SensorPosition {
  x: number;
  y: number;
  z: number;
}

/** 有效传感器/分站（布局+设备信息均存在） */
export interface Sensor {
  pointNumber: string;
  pointName: string;
  pointAddress: string;
  unit: string;
  ssz: string;
  color: number;
  position: SensorPosition;
  /** 设备类型名，如 正压传感器、超声波传感器、阀门传感器；分站为空 */
  typeName?: string;
  /** 是否为分站 */
  isStation?: boolean;
}

/** 已删除/孤立布点（Sensor3DLayout 中有，但设备表中已无） */
export interface DeletedSensor {
  pointNumber: string;
  position: SensorPosition;
  isDeleted: true;
}

/** 编辑时可选设备列表项（分站 + 传感器） */
export interface SensorListItem {
  pointNumber: string;
  pointName: string;
  pointAddress: string;
  unit: string;
  ssz: string;
  color: number;
  typeName?: string;
  isStation?: boolean;
}

/** 布局保存时前端提交的单条数据 */
export interface LayoutItem {
  pointNumber: string;
  localX: number;
  localY: number;
  localZ: number;
}

/** GET /api/layout 响应 */
export interface LayoutResponse {
  sensors: Sensor[];
  deletedSensors: DeletedSensor[];
}

/** color 枚举 */
export const COLOR_MAP: Record<number, string> = {
  [-1]: '异常（初始化）',
  0: '交流',
  1: '通讯中断',
  2: '直流',
  7: '上报警',
  8: '下报警',
  13: '传感器断线异常',
  14: '开关量 开',
  15: '开关量 关',
  16: '正常',
};

/** color → 图标文件名 */
export const COLOR_ICON_MAP: Record<number, string> = {
  16: 'normal.png',
  0: 'normal.png',
  1: 'offline.png',
  2: 'normal.png',
  7: 'alarm.png',
  8: 'alarm.png',
  13: 'error.png',
  14: 'switch_on.png',
  15: 'switch_off.png',
};

export function getColorIcon(color: number): string {
  return COLOR_ICON_MAP[color] ?? 'default.png';
}

/** 状态图标路径（用于详情/浏览模式状态图），位于 public/icons/status 下，无则用 Tag 兜底 */
export function getStatusImagePath(color: number): string {
  return `/icons/status/${getColorIcon(color)}`;
}

export function getColorLabel(color: number): string {
  return COLOR_MAP[color] ?? `状态${color}`;
}

export function getColorHex(color: number): string {
  switch (color) {
    case 16: return '#00e676';
    case 0: return '#00e676';
    case 2: return '#00e676';
    case 1:  return '#9e9e9e';
    case 7:
    case 8:  return '#ff5722';
    case 13: return '#ff1744';
    case 14: return '#29b6f6';
    case 15: return '#78909c';
    default: return '#1677ff';
  }
}

/** Antd Tag 的 color 值（用于右侧面板状态标签） */
export function getTagColor(color: number): string {
  switch (color) {
    case 16: return 'success';
    case 0: return 'success';
    case 2: return 'success';
    case 1:  return 'default';
    case 7:
    case 8:  return 'error';
    case 13: return 'error';
    case 14: return 'processing';
    case 15: return 'default';
    default: return 'default';
  }
}

/** 根据 pointName / isStation 返回 /images/ 下图片路径，设备类型由 pointName 判断 */
export function getDeviceImage(pointName?: string, isStation?: boolean | number): string {
  if (isStation === true || isStation === 1) return '/images/分站.jpg';
  const p = String(pointName ?? '').trim();
  if (p.includes('正压')) return '/images/压力.jpg';
  if (p.includes('流量')) return '/images/流量计.jpg';
  if (p.includes('阀门')) return '/images/阀门.jpg';
  if (p.includes('电源')) return '/images/电源.jpg';
  if (p.includes('分站')) return '/images/分站.jpg';
  return '/images/sensor.jpg';
}

/** 返回带 origin 的绝对路径，确保编辑/预览时图片能加载 */
export function getDeviceImageSrc(pointName?: string, isStation?: boolean | number): string {
  const path = getDeviceImage(pointName, isStation);
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${path}`;
  }
  return path;
}
