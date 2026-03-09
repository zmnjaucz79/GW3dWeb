import { create } from 'zustand';
import type { Sensor, DeletedSensor, SensorListItem, LayoutItem, SensorPosition } from '@/types/sensor';

/** 状态与实时值轮询间隔（毫秒），设为 null 表示不轮询；若需定时刷新可设为正数并在 page 中启用 setInterval */
export const REALTIME_UPDATE_INTERVAL_MS: number | null = null;

interface SensorStore {
  /** 有效布点 */
  sensors: Sensor[];
  /** 已删除/孤立布点 */
  deletedSensors: DeletedSensor[];
  /** 编辑时可选传感器列表 */
  sensorListFromApi: SensorListItem[];
  /** 当前是否为编辑模式 */
  isEditMode: boolean;
  /** 当前选中的传感器 pointNumber（右侧面板用） */
  selectedSensorId: string | null;
  /** 编辑模式下当前选中要拖拽的点位 pointNumber */
  selectedForEdit: string | null;
  /** 编辑时当前选中要布置的传感器 pointNumber */
  pendingPointNumber: string | null;

  /* -------- actions -------- */
  setEditMode: (v: boolean) => void;
  selectSensor: (id: string | null) => void;
  setSelectedForEdit: (id: string | null) => void;
  setPendingPointNumber: (id: string | null) => void;

  /** 从 API 加载传感器主列表（编辑模式进入时调用） */
  loadSensorList: () => Promise<void>;
  /** 从 API 加载 3D 布局 */
  loadLayoutFromServer: () => Promise<void>;
  /** 在当前 sensors/deletedSensors 基础上增加一个布点并保存 */
  addSensor: (pointNumber: string, position: SensorPosition) => Promise<void>;
  /** 保存当前全部布点到服务端 */
  saveLayoutToServer: () => Promise<void>;
  /** 从布局中移除已删除布点并保存 */
  removeDeletedFromLayout: (pointNumber: string) => Promise<void>;
  /** 从布局中移除单个传感器并保存（该点位从数据库删除，不再保留） */
  removeSensorFromLayout: (pointNumber: string) => Promise<void>;
  /** 清空所有布点并保存 */
  clearAll: () => Promise<void>;
  /** 更新单个点位的 3D 位置（拖拽结束时调用） */
  updateSensorPosition: (pointNumber: string, position: SensorPosition) => Promise<void>;
}

export const useSensorStore = create<SensorStore>((set, get) => ({
  sensors: [],
  deletedSensors: [],
  sensorListFromApi: [],
  isEditMode: false,
  selectedSensorId: null,
  selectedForEdit: null,
  pendingPointNumber: null,

  setEditMode(v) {
    set({ isEditMode: v, selectedSensorId: null, selectedForEdit: null });
    if (v) {
      get().loadSensorList();
    }
  },

  selectSensor(id) {
    set({ selectedSensorId: id });
  },

  setSelectedForEdit(id) {
    set({ selectedForEdit: id });
  },

  setPendingPointNumber(id) {
    set({ pendingPointNumber: id });
  },

  async loadSensorList() {
    try {
      const res = await fetch('/api/sensors', { cache: 'no-store' });
      if (!res.ok) throw new Error('接口错误');
      const data: SensorListItem[] = await res.json();
      set({ sensorListFromApi: data });
    } catch (e) {
      console.error('[loadSensorList]', e);
    }
  },

  async loadLayoutFromServer() {
    try {
      const res = await fetch('/api/layout', { cache: 'no-store' });
      if (!res.ok) throw new Error('接口错误');
      const data = await res.json();
      set({
        sensors: data.sensors ?? [],
        deletedSensors: data.deletedSensors ?? [],
      });
    } catch (e) {
      console.error('[loadLayoutFromServer]', e);
    }
  },

  async addSensor(pointNumber, position) {
    const { sensors, deletedSensors, sensorListFromApi } = get();

    const info = sensorListFromApi.find((s) => s.pointNumber === pointNumber);
    if (!info) return;

    const raw = info as unknown as Record<string, unknown>;
    const isStation = Boolean(raw.isStation ?? raw.IsStation ?? raw.isstation ?? 0);

    const existing = sensors.find((s) => s.pointNumber === pointNumber);
    const newSensors = existing
      ? sensors.map((s) =>
          s.pointNumber === pointNumber ? { ...s, position } : s
        )
      : [...sensors, {
          pointNumber,
          pointName: info.pointName,
          pointAddress: info.pointAddress,
          unit: info.unit,
          ssz: info.ssz,
          color: info.color,
          position,
          isStation,
        }];

    set({ sensors: newSensors, pendingPointNumber: null });

    const items: LayoutItem[] = [
      ...newSensors.map((s) => ({
        pointNumber: s.pointNumber,
        localX: s.position.x,
        localY: s.position.y,
        localZ: s.position.z,
      })),
      ...deletedSensors.map((s) => ({
        pointNumber: s.pointNumber,
        localX: s.position.x,
        localY: s.position.y,
        localZ: s.position.z,
      })),
    ];
    await _postLayout(items);
  },

  async saveLayoutToServer() {
    const { sensors, deletedSensors } = get();
    const items: LayoutItem[] = [
      ...sensors.map((s) => ({
        pointNumber: s.pointNumber,
        localX: s.position.x,
        localY: s.position.y,
        localZ: s.position.z,
      })),
      ...deletedSensors.map((s) => ({
        pointNumber: s.pointNumber,
        localX: s.position.x,
        localY: s.position.y,
        localZ: s.position.z,
      })),
    ];
    await _postLayout(items);
  },

  async removeDeletedFromLayout(pointNumber) {
    const { sensors, deletedSensors } = get();
    const newDeleted = deletedSensors.filter((s) => s.pointNumber !== pointNumber);
    set({ deletedSensors: newDeleted });

    const items: LayoutItem[] = [
      ...sensors.map((s) => ({
        pointNumber: s.pointNumber,
        localX: s.position.x,
        localY: s.position.y,
        localZ: s.position.z,
      })),
      ...newDeleted.map((s) => ({
        pointNumber: s.pointNumber,
        localX: s.position.x,
        localY: s.position.y,
        localZ: s.position.z,
      })),
    ];
    await _postLayout(items);
  },

  /** 从布局中移除单个传感器：从 sensors 移除且不再写入库，该点位会从数据库删除 */
  async removeSensorFromLayout(pointNumber) {
    const { sensors, deletedSensors, selectedSensorId } = get();
    const found = sensors.find((s) => s.pointNumber === pointNumber);
    if (!found) return;
    const newSensors = sensors.filter((s) => s.pointNumber !== pointNumber);
    set({
      sensors: newSensors,
      selectedForEdit: null,
      selectedSensorId: selectedSensorId === pointNumber ? null : selectedSensorId,
    });

    const items: LayoutItem[] = [
      ...newSensors.map((s) => ({
        pointNumber: s.pointNumber,
        localX: s.position.x,
        localY: s.position.y,
        localZ: s.position.z,
      })),
      ...deletedSensors.map((s) => ({
        pointNumber: s.pointNumber,
        localX: s.position.x,
        localY: s.position.y,
        localZ: s.position.z,
      })),
    ];
    await _postLayout(items);
  },

  async clearAll() {
    set({ sensors: [], deletedSensors: [] });
    await _postLayout([]);
  },

  async updateSensorPosition(pointNumber, position) {
    const { sensors, deletedSensors } = get();
    const newSensors = sensors.map((s) =>
      s.pointNumber === pointNumber ? { ...s, position } : s
    );
    console.log('[useSensorStore] updateSensorPosition', { pointNumber, position });
    set({ sensors: newSensors });
    const items: LayoutItem[] = [
      ...newSensors.map((s) => ({
        pointNumber: s.pointNumber,
        localX: s.position.x,
        localY: s.position.y,
        localZ: s.position.z,
      })),
      ...deletedSensors.map((s) => ({
        pointNumber: s.pointNumber,
        localX: s.position.x,
        localY: s.position.y,
        localZ: s.position.z,
      })),
    ];
    await _postLayout(items);
  },
}));

async function _postLayout(items: LayoutItem[]) {
  try {
    await fetch('/api/layout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(items),
      cache: 'no-store',
    });
  } catch (e) {
    console.error('[_postLayout]', e);
  }
}
