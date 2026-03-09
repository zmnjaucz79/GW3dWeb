'use client';

import { Drawer, Tag } from 'antd';
import { useSensorStore } from '@/store/useSensorStore';
import { getColorLabel, getTagColor, getDeviceImage, getStatusImagePath } from '@/types/sensor';

export default function SidePanel() {
  const selectedSensorId = useSensorStore((s) => s.selectedSensorId);
  const selectSensor = useSensorStore((s) => s.selectSensor);
  const sensors = useSensorStore((s) => s.sensors);

  const sensor = sensors.find((s) => s.pointNumber === selectedSensorId);
  const imgSrc = sensor ? getDeviceImage(sensor.pointName, sensor.isStation) : '';

  return (
    <Drawer
      title={
        <span style={{ color: '#1677ff', fontWeight: 700 }}>
          {sensor?.isStation ? '分站' : '传感器'}详情{sensor ? ` · ${sensor.pointName}` : ''}
        </span>
      }
      open={!!selectedSensorId}
      onClose={() => selectSensor(null)}
      width={380}
      placement="right"
      styles={{
        body: { padding: '16px 20px', background: '#0d1f35' },
        header: { background: '#0d1f35', borderBottom: '1px solid #1677ff22' },
      }}
      mask={true}
    >
      {sensor ? (
        <div style={{ display: 'flex', gap: 20, flexDirection: 'column' }}>
          {/* 左侧图片 + 右侧 上状态 / 下数值+单位 */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            {/* 左侧：设备图片 */}
            <div
              style={{
                flexShrink: 0,
                width: 100,
                height: 100,
                borderRadius: 8,
                overflow: 'hidden',
                border: '1px solid #1677ff33',
                background: '#050e1a',
              }}
            >
              <img
                src={imgSrc}
                alt={sensor.pointName}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/images/sensor.jpg';
                }}
              />
            </div>

            {/* 右侧：分站/传感器名 → 状态图 → 实时值（无“实时值”文案） */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#e6f0ff' }}>
                {sensor.pointName}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <img
                  src={getStatusImagePath(sensor.color)}
                  alt={getColorLabel(sensor.color)}
                  width={24}
                  height={24}
                  style={{ objectFit: 'contain' }}
                  onError={(e) => {
                    const el = e.target as HTMLImageElement;
                    el.style.display = 'none';
                    const fallback = el.nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = 'inline-block';
                  }}
                />
                <Tag color={getTagColor(sensor.color)} style={{ margin: 0, display: 'none' }} data-status-fallback>
                  {getColorLabel(sensor.color)}
                </Tag>
              </div>
              <div style={{ color: '#00e676', fontWeight: 700, fontSize: 22 }}>
                {sensor.ssz ?? '—'} <span style={{ fontSize: 14, color: '#7a9fc0' }}>{sensor.unit || ''}</span>
              </div>
            </div>
          </div>

          <div style={{ fontSize: 12, color: '#7a9fc0' }}>
            <div>测点编号：{sensor.pointNumber}</div>
            <div>安装位置：{sensor.pointAddress || '—'}</div>
          </div>
        </div>
      ) : (
        <div style={{ color: '#7a9fc0', textAlign: 'center', paddingTop: 40 }}>
          请在 3D 场景中点击传感器或分站点位
        </div>
      )}
    </Drawer>
  );
}
