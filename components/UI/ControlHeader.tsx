'use client';

import { Segmented, Select, Button, Typography, Space } from 'antd';
import { CloseCircleOutlined } from '@ant-design/icons';
import { APP_NAME } from '@/config/scene';
import { useSensorStore } from '@/store/useSensorStore';

const { Text } = Typography;

export default function ControlHeader() {
  const isEditMode = useSensorStore((s) => s.isEditMode);
  const setEditMode = useSensorStore((s) => s.setEditMode);
  const sensorListFromApi = useSensorStore((s) => s.sensorListFromApi);
  const pendingPointNumber = useSensorStore((s) => s.pendingPointNumber);
  const setPendingPointNumber = useSensorStore((s) => s.setPendingPointNumber);

  const pendingSensor = sensorListFromApi.find((s) => s.pointNumber === pendingPointNumber);

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 56,
        zIndex: 100,
        background: 'linear-gradient(90deg, #050e1a 0%, #0d1f35 50%, #050e1a 100%)',
        borderBottom: '1px solid #1677ff33',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        gap: 24,
        backdropFilter: 'blur(6px)',
      }}
    >
      {/* 标题 */}
      <Text
        strong
        style={{
          color: '#1677ff',
          fontSize: 18,
          letterSpacing: 2,
          whiteSpace: 'nowrap',
          textShadow: '0 0 12px #1677ff88',
        }}
      >
        ⚡ {APP_NAME}
      </Text>

      <div style={{ flex: 1 }} />

      {isEditMode && (
        <Space size="middle" wrap>
          <Select
            placeholder="选择要布置的分站或传感器"
            showSearch
            allowClear
            style={{ width: 300 }}
            value={pendingPointNumber}
            onChange={(v) => setPendingPointNumber(v ?? null)}
            optionFilterProp="label"
            options={[
              {
                label: '分站',
                options: sensorListFromApi
                  .filter((s) => s.isStation)
                  .map((s) => ({
                    value: s.pointNumber,
                    label: `${s.pointNumber} - ${s.pointName} (${s.pointAddress || ''})`,
                  })),
              },
              {
                label: '传感器',
                options: sensorListFromApi
                  .filter((s) => !s.isStation)
                  .map((s) => ({
                    value: s.pointNumber,
                    label: `${s.pointNumber} - ${s.pointName} (${s.pointAddress || ''})`,
                  })),
              },
            ]}
            notFoundContent="暂无数据"
          />
          {pendingSensor ? (
            <>
              <Text type="secondary" style={{ color: '#7a9fc0', fontSize: 13 }}>
                当前：<Text style={{ color: '#1677ff' }}>{pendingSensor.pointNumber} - {pendingSensor.pointName}</Text>
                <span style={{ marginLeft: 8, color: '#5a7f90' }}>点击巷道布点，已布点时再次点击可调整位置；选中后可拖拽移动</span>
              </Text>
              <Button
                type="text"
                size="small"
                icon={<CloseCircleOutlined />}
                onClick={() => setPendingPointNumber(null)}
                style={{ color: '#7a9fc0' }}
              >
                取消选择
              </Button>
            </>
          ) : (
            <Text type="secondary" style={{ color: '#5a7f90', fontSize: 12 }}>
              请先选择要布置的分站或传感器，再点击巷道表面
            </Text>
          )}
        </Space>
      )}

      {/* 模式切换 */}
      <Segmented
        value={isEditMode ? '编辑' : '预览'}
        onChange={(v) => setEditMode(v === '编辑')}
        options={[
          { label: '预览', value: '预览' },
          { label: '编辑', value: '编辑' },
        ]}
        style={{ minWidth: 120 }}
      />
    </div>
  );
}
