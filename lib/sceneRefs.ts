/**
 * 全局单例，存放 Three.js Camera 与 OrbitControls 的引用。
 * SceneContainer 负责写入，其他组件（FooterActions 等）负责读取。
 */
import type * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

export const sceneRefs: {
  camera: THREE.Camera | null;
  controls: OrbitControlsImpl | null;
} = {
  camera: null,
  controls: null,
};
