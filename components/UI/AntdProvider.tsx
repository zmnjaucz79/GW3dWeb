'use client';

import { ConfigProvider, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';

export default function AntdProvider({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#1677ff',
          colorBgBase: '#050e1a',
          colorTextBase: '#e6f0ff',
          borderRadius: 6,
          fontFamily: "'PingFang SC', 'Microsoft YaHei', sans-serif",
        },
        components: {
          Drawer: { colorBgElevated: '#0d1f35' },
          Notification: { colorBgElevated: '#0d1f35' },
          Button: { colorBgContainer: '#0d1f35' },
          Select: { colorBgContainer: '#0d1f35' },
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}
