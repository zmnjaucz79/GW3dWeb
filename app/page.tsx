'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef } from 'react';
import { notification } from 'antd';
import ControlHeader from '@/components/UI/ControlHeader';
import SidePanel from '@/components/UI/SidePanel';
import FooterActions from '@/components/UI/FooterActions';
import { useSensorStore } from '@/store/useSensorStore';

// SceneContainer 含 Three.js，必须禁用 SSR
const SceneContainer = dynamic(() => import('@/components/Three/SceneContainer'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#050e1a',
        color: '#1677ff',
        fontSize: 18,
      }}
    >
      加载 3D 场景中…
    </div>
  ),
});

const BROWSE_REFRESH_INTERVAL_MS = 5000;

export default function HomePage() {
  const loadLayoutFromServer = useSensorStore((s) => s.loadLayoutFromServer);
  const isEditMode = useSensorStore((s) => s.isEditMode);
  const deletedSensors = useSensorStore((s) => s.deletedSensors);
  const notifiedRef = useRef(false);
  const [api, contextHolder] = notification.useNotification();

  useEffect(() => {
    loadLayoutFromServer();
  }, [loadLayoutFromServer]);

  // 浏览模式下每 5s 刷新传感器数值与状态（ssz、color），布局与位置不变
  useEffect(() => {
    if (isEditMode) return;
    const t = setInterval(loadLayoutFromServer, BROWSE_REFRESH_INTERVAL_MS);
    return () => clearInterval(t);
  }, [isEditMode, loadLayoutFromServer]);

  // 仅在浏览模式下提示：存在已删除点位，可切到编辑模式点击灰色点位彻底删除
  useEffect(() => {
    if (isEditMode) return;
    if (!notifiedRef.current && deletedSensors.length > 0) {
      notifiedRef.current = true;
      api.warning({
        message: '存在已删除的传感器点位',
        description: '请切换到编辑模式，点击灰色点位将其从布局中删除。',
        duration: 0,
        placement: 'topRight',
      });
    }
  }, [isEditMode, deletedSensors, api]);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      {contextHolder}
      <ControlHeader />
      <SceneContainer />
      <SidePanel />
      <FooterActions />
    </div>
  );
}
