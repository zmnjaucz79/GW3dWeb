'use client';

import { Button, Popconfirm, Tooltip, message } from 'antd';
import { AimOutlined, SaveOutlined, CloudUploadOutlined, DeleteOutlined } from '@ant-design/icons';
import { saveViewState, resetToDefault } from '@/components/Three/SceneContainer';
import { sceneRefs } from '@/lib/sceneRefs';
import { useSensorStore } from '@/store/useSensorStore';

export default function FooterActions() {
  const [msgApi, contextHolder] = message.useMessage();
  const isEditMode = useSensorStore((s) => s.isEditMode);
  const saveLayoutToServer = useSensorStore((s) => s.saveLayoutToServer);
  const clearAll = useSensorStore((s) => s.clearAll);

  /** 保存视角 = 当前相机位置写入 localStorage（下次打开恢复） */
  const handleSaveView = () => {
    if (!sceneRefs.camera) {
      msgApi.warning('场景尚未初始化');
      return;
    }
    const state = saveViewState(sceneRefs.camera, sceneRefs.controls);
    msgApi.success(
      `视角已保存 → pos(${state.position.map((v) => v.toFixed(1)).join(', ')})`,
      4
    );
  };

  /** 相机复位 = 立即恢复到固定默认值 */
  const handleReset = () => {
    resetToDefault();
    msgApi.success('相机已复位到默认状态');
  };

  /** 保存布局 = 当前传感器布点写入数据库 Sensor3DLayout */
  const handleSaveLayout = async () => {
    try {
      await saveLayoutToServer();
      msgApi.success('传感器布局已保存到数据库');
    } catch (e) {
      msgApi.error('保存布局失败');
    }
  };

  /** 一键清空 = 清空所有布点并同步到数据库 */
  const handleClearAll = async () => {
    try {
      await clearAll();
      msgApi.success('已清空所有传感器布点');
    } catch (e) {
      msgApi.error('清空失败');
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 52,
        zIndex: 100,
        background: 'linear-gradient(90deg, #050e1a 0%, #0d1f35 50%, #050e1a 100%)',
        borderTop: '1px solid #1677ff33',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        padding: '0 24px',
        gap: 12,
      }}
    >
      {contextHolder}

      <Tooltip title="立即复位到默认相机状态">
        <Button
          icon={<AimOutlined />}
          onClick={handleReset}
          style={{ background: '#0d1f35', borderColor: '#1677ff44', color: '#7a9fc0' }}
        >
          相机复位
        </Button>
      </Tooltip>

      <Tooltip title="当前相机位置保存到本地，下次打开恢复">
        <Button
          icon={<SaveOutlined />}
          onClick={handleSaveView}
          style={{ background: '#0d1f35', borderColor: '#1677ff44', color: '#7a9fc0' }}
        >
          保存视角
        </Button>
      </Tooltip>

      {isEditMode && (
        <>
          <Tooltip title="将当前传感器布点保存到数据库 Sensor3DLayout">
            <Button
              icon={<CloudUploadOutlined />}
              type="primary"
              onClick={handleSaveLayout}
            >
              保存布局
            </Button>
          </Tooltip>

          <Popconfirm
            title="确认清空所有传感器布点？"
            description="将删除数据库中全部 3D 布局记录，不可恢复。"
            onConfirm={handleClearAll}
            okText="确认清空"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="清空所有已布设的传感器点位并同步到数据库">
              <Button
                icon={<DeleteOutlined />}
                danger
                style={{ background: '#0d1f35', borderColor: '#ff174444' }}
              >
                一键清空
              </Button>
            </Tooltip>
          </Popconfirm>
        </>
      )}
    </div>
  );
}
