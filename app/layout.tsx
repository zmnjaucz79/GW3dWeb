import type { Metadata } from 'next';
import AntdProvider from '@/components/UI/AntdProvider';
import { APP_NAME } from '@/config/scene';
import './globals.css';

export const metadata: Metadata = {
  title: APP_NAME,
  description: '矿山巷道 3D 传感器布设与监控',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <AntdProvider>{children}</AntdProvider>
      </body>
    </html>
  );
}
