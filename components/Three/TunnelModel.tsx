'use client';

import { useGLTF } from '@react-three/drei';
import { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { useSensorStore } from '@/store/useSensorStore';
import { TUNNEL_MODEL_URL } from '@/config/scene';

useGLTF.preload(TUNNEL_MODEL_URL);

export default function TunnelModel({ tunnelRef }: { tunnelRef: React.MutableRefObject<THREE.Group | null> }) {
  const { scene } = useGLTF(TUNNEL_MODEL_URL);

  const isEditMode = useSensorStore((s) => s.isEditMode);
  const pendingPointNumber = useSensorStore((s) => s.pendingPointNumber);
  const addSensor = useSensorStore((s) => s.addSensor);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (!isEditMode || !pendingPointNumber) return;
    e.stopPropagation();
    if (!tunnelRef.current) return;
    const localPoint = tunnelRef.current.worldToLocal(e.point.clone());
    addSensor(pendingPointNumber, { x: localPoint.x, y: localPoint.y, z: localPoint.z });
  };

  return (
    <group ref={tunnelRef}>
      <primitive
        object={scene}
        onClick={handleClick}
        onPointerOver={() => {
          if (isEditMode && pendingPointNumber) {
            document.body.style.cursor = 'crosshair';
          }
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'default';
        }}
      />
    </group>
  );
}