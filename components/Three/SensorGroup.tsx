'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { Html, Billboard } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useSensorStore } from '@/store/useSensorStore';
import { getColorLabel, getColorHex, getDeviceImage, getDeviceImageSrc, getStatusImagePath } from '@/types/sensor';
import { SCENE_DISTANCE_FACTOR_EDIT, SCENE_DISTANCE_FACTOR_BROWSE } from '@/config/scene';
import { useTunnelGroupRef } from './TunnelGroupContext';
import type { Sensor, DeletedSensor } from '@/types/sensor';

/** 有效传感器/分站点位：显示设备图片，编辑模式可拖拽改位置（拖图片或三轴） */
function SensorPoint({ sensor }: { sensor: Sensor }) {
  const groupRef = useRef<THREE.Group>(null);
  const tunnelRef = useTunnelGroupRef();
  const [dragPosition, setDragPosition] = useState<THREE.Vector3 | null>(null);
  const { camera, size, gl } = useThree();

  const isEditMode = useSensorStore((s) => s.isEditMode);
  const selectedForEdit = useSensorStore((s) => s.selectedForEdit);
  const setSelectedForEdit = useSensorStore((s) => s.setSelectedForEdit);
  const selectSensor = useSensorStore((s) => s.selectSensor);
  const updateSensorPosition = useSensorStore((s) => s.updateSensorPosition);
  const removeSensorFromLayout = useSensorStore((s) => s.removeSensorFromLayout);

  const imgSrc = getDeviceImage(sensor.pointName, Boolean(sensor.isStation));
  const imgSrcAbs = getDeviceImageSrc(sensor.pointName, Boolean(sensor.isStation));
  const isSelected = selectedForEdit === sensor.pointNumber;
  const pos = isSelected && dragPosition ? dragPosition : sensor.position;
  const sizePx = 640;
  const distanceFactor = isEditMode ? SCENE_DISTANCE_FACTOR_EDIT : SCENE_DISTANCE_FACTOR_BROWSE;

  const isDraggingRef = useRef(false);
  const didMoveRef = useRef(false);
  const justFinishedDragRef = useRef(false);
  const pendingClearTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastLocalPosRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const planeRef = useRef(new THREE.Plane());
  const intersectRef = useRef(new THREE.Vector3());
  const cameraDirRef = useRef(new THREE.Vector3());


  const handleClick = useCallback(() => {
    if (isEditMode) {
      setSelectedForEdit(sensor.pointNumber);
      setDragPosition(new THREE.Vector3(sensor.position.x, sensor.position.y, sensor.position.z));
      return;
    }
    selectSensor(sensor.pointNumber);
  }, [isEditMode, sensor.pointNumber, sensor.position, setSelectedForEdit, selectSensor]);

  const handlePointerUp = useCallback(() => {
    console.log('[SensorGroup] handlePointerUp (group)', {
      pointNumber: sensor.pointNumber,
      isEditMode,
      isSelected,
      justFinishedDragRef: justFinishedDragRef.current,
    });
    if (!isEditMode || !isSelected) return;
    if (justFinishedDragRef.current) {
      console.log('[SensorGroup] handlePointerUp 跳过: 刚结束拖拽');
      justFinishedDragRef.current = false;
      return;
    }
    if (pendingClearTimeoutRef.current) {
      clearTimeout(pendingClearTimeoutRef.current);
      pendingClearTimeoutRef.current = null;
    }
    console.log('[SensorGroup] handlePointerUp 安排 150ms 后清空选中');
    pendingClearTimeoutRef.current = setTimeout(() => {
      console.log('[SensorGroup] 延迟回调执行: 清空选中与 dragPosition', { pointNumber: sensor.pointNumber });
      if (dragPosition) {
        updateSensorPosition(sensor.pointNumber, { x: dragPosition.x, y: dragPosition.y, z: dragPosition.z });
      }
      setSelectedForEdit(null);
      setDragPosition(null);
      pendingClearTimeoutRef.current = null;
    }, 150);
  }, [isEditMode, isSelected, dragPosition, sensor.pointNumber, updateSensorPosition, setSelectedForEdit]);

  // 方案 B：拖动图片在垂直于相机的平面上移动（三轴暂不显示）
  const handleImagePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!isEditMode || !isSelected || !groupRef.current || !tunnelRef?.current) return;
      e.stopPropagation();
      e.preventDefault();
      isDraggingRef.current = true;
      didMoveRef.current = false;
      const worldPos = new THREE.Vector3();
      groupRef.current.getWorldPosition(worldPos);
      camera.getWorldDirection(cameraDirRef.current);
      planeRef.current.setFromNormalAndCoplanarPoint(cameraDirRef.current.clone(), worldPos);
      lastLocalPosRef.current.set(pos.x, pos.y, pos.z);
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    [isEditMode, isSelected, camera, pos]
  );

  useEffect(() => {
    return () => {
      if (pendingClearTimeoutRef.current) {
        clearTimeout(pendingClearTimeoutRef.current);
        pendingClearTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!isSelected && pendingClearTimeoutRef.current) {
      clearTimeout(pendingClearTimeoutRef.current);
      pendingClearTimeoutRef.current = null;
    }
  }, [isSelected]);

  useEffect(() => {
    if (!isSelected) return;
    const canvas = gl.domElement;

    const onPointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current || !groupRef.current || !tunnelRef?.current) return;
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      if (raycasterRef.current.ray.intersectPlane(planeRef.current, intersectRef.current)) {
        const localPos = tunnelRef.current.worldToLocal(intersectRef.current.clone());
        lastLocalPosRef.current.copy(localPos);
        didMoveRef.current = true;
        setDragPosition(localPos.clone());
      }
    };

    const onPointerUp = () => {
      console.log('[SensorGroup] window pointerup', {
        pointNumber: sensor.pointNumber,
        isDraggingRef: isDraggingRef.current,
        didMoveRef: didMoveRef.current,
      });
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      if (didMoveRef.current) {
        justFinishedDragRef.current = true;
        if (pendingClearTimeoutRef.current) {
          clearTimeout(pendingClearTimeoutRef.current);
          pendingClearTimeoutRef.current = null;
          console.log('[SensorGroup] window pointerup 已取消延迟清空');
        }
        const newPos = {
          x: lastLocalPosRef.current.x,
          y: lastLocalPosRef.current.y,
          z: lastLocalPosRef.current.z,
        };
        console.log('[SensorGroup] window pointerup 拖拽结束: 写库并 setDragPosition', { pointNumber: sensor.pointNumber, newPos });
        const vec = new THREE.Vector3(newPos.x, newPos.y, newPos.z);
        updateSensorPosition(sensor.pointNumber, newPos);
        setDragPosition(vec);
        requestAnimationFrame(() => {
          setDragPosition(vec.clone());
        });
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [isSelected, gl, camera, tunnelRef, sensor.pointNumber, updateSensorPosition]);

  const content = (
    <>
      {/* 设备图片 */}
      <Billboard>
        <Html
          distanceFactor={distanceFactor}
          center
          position={[0, 0, 0]}
          style={{
            pointerEvents: 'auto',
            userSelect: 'none',
          }}
        >
          <div
            onClick={(e) => {
              if (isDraggingRef.current) {
                e.preventDefault();
                e.stopPropagation();
                return;
              }
              handleClick();
            }}
            onPointerDown={isEditMode && isSelected ? handleImagePointerDown : undefined}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'pointer',
              gap: 4,
              padding: 6,
              background: isEditMode ? 'rgba(5,14,26,0.9)' : 'transparent',
              borderRadius: 8,
              border: isSelected ? '2px solid #1677ff' : '1px solid rgba(22,119,255,0.4)',
              boxShadow: isEditMode ? '0 0 12px rgba(22,119,255,0.2)' : 'none',
            }}
          >
            {!isEditMode ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 114,
                  padding: 91,
                  background: 'rgba(13, 31, 53, 0.95)',
                  borderRadius: 91,
                  border: '1px solid rgba(22, 119, 255, 0.25)',
                  minWidth: 1740,
                  width: 1740,
                  boxSizing: 'border-box',
                }}
              >
                <div style={{ flexShrink: 0, width: 640, height: 640, borderRadius: 69, overflow: 'hidden', background: '#050e1a' }}>
                  <img
                    key={imgSrc}
                    src={imgSrcAbs}
                    alt={sensor.pointName}
                    width={640}
                    height={640}
                    draggable={false}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    onLoad={() => {
                      console.log('[SensorGroup] 预览-设备图加载成功', { pointNumber: sensor.pointNumber, src: imgSrcAbs });
                    }}
                    onError={(e) => {
                      console.warn('[SensorGroup] 预览-设备图加载失败', { pointNumber: sensor.pointNumber, attemptedSrc: imgSrcAbs });
                      (e.target as HTMLImageElement).src = `${typeof window !== 'undefined' ? window.location.origin : ''}/images/sensor.jpg`;
                    }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 69, minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 137, fontWeight: 700, color: '#e6f0ff', lineHeight: 1.3 }}>
                    {sensor.pointName}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 46 }}>
                    <img
                      src={typeof window !== 'undefined' ? `${window.location.origin}${getStatusImagePath(sensor.color)}` : getStatusImagePath(sensor.color)}
                      alt={getColorLabel(sensor.color)}
                      width={206}
                      height={206}
                      style={{ objectFit: 'contain' }}
                      onLoad={() => {
                        console.log('[SensorGroup] 预览-状态图加载成功', { pointNumber: sensor.pointNumber, color: sensor.color, path: getStatusImagePath(sensor.color) });
                      }}
                      onError={(e) => {
                        console.warn('[SensorGroup] 预览-状态图加载失败，显示文字兜底', { pointNumber: sensor.pointNumber, color: sensor.color, path: getStatusImagePath(sensor.color) });
                        const el = e.target as HTMLImageElement;
                        el.style.display = 'none';
                        const fallback = el.nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = 'inline-block';
                      }}
                    />
                    <span
                      style={{
                        fontSize: 114,
                        color: getColorHex(sensor.color),
                        background: 'rgba(5,14,26,0.85)',
                        padding: '11px 46px',
                        borderRadius: 23,
                        display: 'none',
                      }}
                      data-fallback
                    >
                      {getColorLabel(sensor.color)}
                    </span>
                  </div>
                  <div style={{ fontSize: 149, fontWeight: 700, color: '#00e676' }}>
                    {sensor.ssz ?? '—'} {sensor.unit ? <span style={{ fontSize: 126, color: '#7a9fc0' }}>{sensor.unit}</span> : null}
                  </div>
                </div>
              </div>
            ) : (
              <img
                key={imgSrc}
                src={imgSrcAbs}
                alt={sensor.pointName}
                width={sizePx}
                height={sizePx}
                draggable={false}
                style={{ display: 'block', objectFit: 'contain' }}
                onLoad={() => {
                  console.log('[3D设备图] 加载成功', {
                    pointNumber: sensor.pointNumber,
                    pointName: sensor.pointName,
                    isStation: sensor.isStation,
                    src: imgSrcAbs,
                    sizePx,
                  });
                }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  console.warn('[3D设备图] 加载失败', {
                    pointNumber: sensor.pointNumber,
                    attemptedSrc: imgSrcAbs,
                    fallback: '/images/sensor.jpg',
                  });
                  target.src = `${typeof window !== 'undefined' ? window.location.origin : ''}/images/sensor.jpg`;
                }}
              />
            )}
            {isEditMode && (
              <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8 }}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    removeSensorFromLayout(sensor.pointNumber);
                  }}
                  style={{
                    fontSize: 120,
                    padding: '40px 100px',
                    color: '#ffccc7',
                    background: 'rgba(255,77,79,0.35)',
                    border: '1px solid rgba(255,120,117,0.8)',
                    borderRadius: 40,
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  移除
                </button>
              </div>
            )}
          </div>
        </Html>
      </Billboard>
    </>
  );

  return (
    <group ref={groupRef} position={[pos.x, pos.y, pos.z]} onPointerUp={handlePointerUp}>
      {content}
    </group>
  );
}

/** 已删除/孤立点位 */
function DeletedSensorPoint({ sensor }: { sensor: DeletedSensor }) {
  const isEditMode = useSensorStore((s) => s.isEditMode);
  const removeDeletedFromLayout = useSensorStore((s) => s.removeDeletedFromLayout);

  const handleDeleteClick = () => {
    if (isEditMode) removeDeletedFromLayout(sensor.pointNumber);
  };

  return (
    <group position={[sensor.position.x, sensor.position.y, sensor.position.z]}>
      <Billboard>
        <Html distanceFactor={10} center>
          <div
            onClick={handleDeleteClick}
            style={{
              background: 'rgba(50,50,50,0.8)',
              color: '#aaaaaa',
              fontSize: 10,
              padding: '4px 8px',
              borderRadius: 4,
              cursor: isEditMode ? 'pointer' : 'default',
            }}
          >
            {isEditMode ? `点击删除 ${sensor.pointNumber}` : `已删除 ${sensor.pointNumber}`}
          </div>
        </Html>
      </Billboard>
    </group>
  );
}

export default function SensorGroup() {
  const sensors = useSensorStore((s) => s.sensors);
  const deletedSensors = useSensorStore((s) => s.deletedSensors);
  const isEditMode = useSensorStore((s) => s.isEditMode);

  useEffect(() => {
    console.log('[SensorGroup] 根组件', { sensorsCount: sensors.length, deletedCount: deletedSensors.length, isEditMode });
  }, [sensors.length, deletedSensors.length, isEditMode]);

  return (
    <group>
      {sensors.map((s) => (
        <SensorPoint key={s.pointNumber} sensor={s} />
      ))}
      {deletedSensors.map((s) => (
        <DeletedSensorPoint key={s.pointNumber} sensor={s} />
      ))}
    </group>
  );
}
