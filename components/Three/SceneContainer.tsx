'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, useGLTF } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import TunnelModel from './TunnelModel';
import SensorGroup from './SensorGroup';
import { TunnelGroupContext } from './TunnelGroupContext';
import { useSensorStore } from '@/store/useSensorStore';
import { sceneRefs } from '@/lib/sceneRefs';
import { TUNNEL_MODEL_URL } from '@/config/scene';

export const VIEW_STATE_KEY = 'gw3d_view_state';

export interface ViewState {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
}

/** 相机复位时恢复的固定初始状态 */
export const DEFAULT_VIEW: ViewState = {
  position: [77.15, 442.70, 894.13],
  target:   [66.12, -62.70, 38.86],
  fov: 60,
};

export function saveViewState(
  camera: THREE.Camera,
  controls: OrbitControlsImpl | null
) {
  const state: ViewState = {
    position: [
      parseFloat(camera.position.x.toFixed(4)),
      parseFloat(camera.position.y.toFixed(4)),
      parseFloat(camera.position.z.toFixed(4)),
    ],
    target: controls
      ? [
          parseFloat(controls.target.x.toFixed(4)),
          parseFloat(controls.target.y.toFixed(4)),
          parseFloat(controls.target.z.toFixed(4)),
        ]
      : [0, 0, 0],
    fov: parseFloat(((camera as THREE.PerspectiveCamera).fov ?? 60).toFixed(2)),
  };
  localStorage.setItem(VIEW_STATE_KEY, JSON.stringify(state));
  console.log('[3D视角已保存]', JSON.stringify(state, null, 2));
  return state;
}

export function clearViewState() {
  localStorage.removeItem(VIEW_STATE_KEY);
}

/** 将相机立即重置为 DEFAULT_VIEW，并清除已保存的视角 */
export function resetToDefault() {
  localStorage.removeItem(VIEW_STATE_KEY);
  const { camera, controls } = sceneRefs;
  if (!camera) return;

  camera.position.set(...DEFAULT_VIEW.position);
  if ((camera as THREE.PerspectiveCamera).fov !== undefined) {
    (camera as THREE.PerspectiveCamera).fov = DEFAULT_VIEW.fov;
    (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
  }
  if (controls) {
    controls.target.set(...DEFAULT_VIEW.target);
    controls.update();
  }
  console.log('[3D相机已复位]', DEFAULT_VIEW);
}

// ─────────────────────────────────────────────
// 相机实时信息读取（在 Canvas 内部，用 useFrame）
// ─────────────────────────────────────────────
interface CameraInfo {
  px: number; py: number; pz: number;
  tx: number; ty: number; tz: number;
  dist: number;
  fov: number;
}

function CameraInfoReader({
  onUpdate,
  controlsRef,
}: {
  onUpdate: (info: CameraInfo) => void;
  controlsRef: React.MutableRefObject<OrbitControlsImpl | null>;
}) {
  const { camera } = useThree();
  const frameCount = useRef(0);

  useFrame(() => {
    // 每 10 帧更新一次，减少 React 重渲染
    frameCount.current++;
    if (frameCount.current % 10 !== 0) return;

    const target = controlsRef.current?.target ?? new THREE.Vector3();
    const dist = camera.position.distanceTo(target);
    onUpdate({
      px: camera.position.x,
      py: camera.position.y,
      pz: camera.position.z,
      tx: target.x,
      ty: target.y,
      tz: target.z,
      dist,
      fov: (camera as THREE.PerspectiveCamera).fov ?? 60,
    });
  });
  return null;
}

// ─────────────────────────────────────────────
// 自动适配相机（无保存视角时执行）
// ─────────────────────────────────────────────
function CameraAutoFit({
  controlsRef,
}: {
  controlsRef: React.MutableRefObject<OrbitControlsImpl | null>;
}) {
  const { camera, invalidate } = useThree();
  const { scene: tunnelScene } = useGLTF(TUNNEL_MODEL_URL);
  const fitted = useRef(false);

  useEffect(() => {
    if (fitted.current) return;

    const saved = localStorage.getItem(VIEW_STATE_KEY);
    if (saved) {
      try {
        const state: ViewState = JSON.parse(saved);
        camera.position.set(...state.position);
        if (state.fov && (camera as THREE.PerspectiveCamera).fov !== undefined) {
          (camera as THREE.PerspectiveCamera).fov = state.fov;
          (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
        }
        if (controlsRef.current) {
          controlsRef.current.target.set(...state.target);
          controlsRef.current.update();
        }
        fitted.current = true;
        invalidate();
        console.log('[3D视角已恢复]', state);
        return;
      } catch {
        /* fall through */
      }
    }

    // 无保存视角 → 应用默认初始状态
    camera.position.set(...DEFAULT_VIEW.position);
    if ((camera as THREE.PerspectiveCamera).fov !== undefined) {
      (camera as THREE.PerspectiveCamera).fov = DEFAULT_VIEW.fov;
      (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
    }
    if (controlsRef.current) {
      controlsRef.current.target.set(...DEFAULT_VIEW.target);
      controlsRef.current.update();
    }

    fitted.current = true;
    invalidate();
    console.log('[3D相机初始化] 应用默认视角', DEFAULT_VIEW);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tunnelScene]);

  return null;
}

// 巷道 ref + 提供 context，供 SensorGroup 拖拽时转局部坐标
function SceneContent({ controlsRef }: { controlsRef: React.MutableRefObject<OrbitControlsImpl | null> }) {
  const tunnelRef = useRef<THREE.Group>(null);
  return (
    <TunnelGroupContext.Provider value={tunnelRef}>
      <TunnelModel tunnelRef={tunnelRef} />
      <SensorGroup />
      <OrbitControls
        ref={(ref) => {
          controlsRef.current = ref;
          sceneRefs.controls = ref;
        }}
        enableDamping
        dampingFactor={0.05}
        minDistance={0.01}
        maxDistance={1000000}
        makeDefault
      />
    </TunnelGroupContext.Provider>
  );
}

// ─────────────────────────────────────────────
// SceneContainer 主组件
// ─────────────────────────────────────────────
export default function SceneContainer() {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const isEditMode = useSensorStore((s) => s.isEditMode);
  const [camInfo, setCamInfo] = useState<CameraInfo | null>(null);
  const [showDebugHud, setShowDebugHud] = useState(false);

  // 把 refs 暴露给全局，供 FooterActions 使用
  const handleCreated = useCallback(({ camera }: { camera: THREE.Camera }) => {
    sceneRefs.camera = camera;
  }, []);

  // 同步 controls ref 到全局
  useEffect(() => {
    sceneRefs.controls = controlsRef.current;
  });

  // 页面卸载前保存视角
  useEffect(() => {
    const save = () => {
      if (sceneRefs.camera) saveViewState(sceneRefs.camera, sceneRefs.controls);
    };
    window.addEventListener('beforeunload', save);
    window.addEventListener('pagehide', save);
    return () => {
      window.removeEventListener('beforeunload', save);
      window.removeEventListener('pagehide', save);
    };
  }, []);

  // 模式切换时保存视角
  useEffect(() => {
    return () => {
      if (sceneRefs.camera) saveViewState(sceneRefs.camera, sceneRefs.controls);
    };
  }, [isEditMode]);

  // 调试开关：Ctrl + Shift + !
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // 常见情况：Shift + 1 -> "!"
      const isBang =
        event.key === '!' || (event.shiftKey && event.key === '1') || (event.shiftKey && event.code === 'Digit1');
      if (event.ctrlKey && event.shiftKey && isBang) {
        event.preventDefault();
        setShowDebugHud((prev) => {
          const next = !prev;
          console.log(`[3D调试HUD] ${next ? '已开启' : '已关闭'}`);
          return next;
        });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const fmt = (n: number) => n.toFixed(2);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        top: 56,
        bottom: 52,
        background: '#050e1a',
      }}
    >
      <Canvas
        camera={{ fov: 60, near: 0.01, far: 1000000 }}
        gl={{ antialias: true }}
        onCreated={handleCreated}
        onPointerMissed={() => useSensorStore.getState().setSelectedForEdit(null)}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 20, 10]} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.3} color="#4488ff" />

        <Stars radius={500} depth={100} count={3000} factor={4} />

        <CameraAutoFit controlsRef={controlsRef} />
        <CameraInfoReader onUpdate={setCamInfo} controlsRef={controlsRef} />

        <SceneContent controlsRef={controlsRef} />
      </Canvas>

      {/* ── 实时相机信息 HUD（默认关闭，Ctrl+Shift+! 切换） ── */}
      {showDebugHud && camInfo && (
        <div
          style={{
            position: 'absolute',
            left: 12,
            bottom: 8,
            zIndex: 200,
            background: 'rgba(5,14,26,0.82)',
            border: '1px solid #1677ff33',
            borderRadius: 6,
            padding: '6px 10px',
            fontFamily: 'monospace',
            fontSize: 11,
            lineHeight: 1.7,
            color: '#7ab8ff',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          <div style={{ color: '#1677ff', fontWeight: 700, marginBottom: 2 }}>
            📷 相机调试
          </div>
          <div>
            pos &nbsp;({fmt(camInfo.px)}, {fmt(camInfo.py)}, {fmt(camInfo.pz)})
          </div>
          <div>
            target ({fmt(camInfo.tx)}, {fmt(camInfo.ty)}, {fmt(camInfo.tz)})
          </div>
          <div>
            dist &nbsp;{fmt(camInfo.dist)} &nbsp;|&nbsp; fov {fmt(camInfo.fov)}°
          </div>
        </div>
      )}
    </div>
  );
}
