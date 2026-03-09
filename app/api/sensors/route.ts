import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getCached, setCached } from '@/lib/serverCache';
import type { SensorListItem } from '@/types/sensor';

/**
 * 强制动态渲染，防止 Next.js 在 build 时静态化此接口
 * 并生成 .body / .meta 缓存文件导致现场一直返回构建时的测试数据
 */
export const dynamic = 'force-dynamic';

/**
 * 服务端内存缓存 key 与 TTL（方案二）
 * 传感器设备列表不会频繁变更，缓存 5 分钟；过期后自动重新从数据库加载
 * 如需立即刷新可重启进程，或在运维接口中调用 invalidateCache(CACHE_KEY)
 */
const CACHE_KEY = 'sensors_list';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 分钟

/** 禁止浏览器缓存，避免现场与测试环境同源时读到旧的缓存数据 */
const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
} as const;

/**
 * GET /api/sensors
 * 返回设备列表：分站 + 传感器（Deviceinformation + realdata 联合），用于编辑时布点
 * 命中服务端内存缓存时直接返回，过期或首次请求时查数据库并刷新缓存
 */
export async function GET() {
  try {
    const cached = getCached<SensorListItem[]>(CACHE_KEY, CACHE_TTL_MS);
    if (cached) {
      console.log('[GET /api/sensors] 命中服务端缓存，直接返回');
      return NextResponse.json(cached, { headers: NO_STORE_HEADERS });
    }

    console.log('[GET /api/sensors] 缓存未命中，从数据库加载...');
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT
        d.PointNumber  AS pointNumber,
        d.PointName    AS pointName,
        d.PointAddress AS pointAddress,
        d.Unit         AS unit,
        CASE WHEN d.PointName = N'分站' THEN 1 ELSE 0 END AS isStation,
        RTRIM(r.ssz)   AS ssz,
        CAST(RTRIM(r.color) AS INT) AS color
      FROM Deviceinformation d
      INNER JOIN realdata r ON RTRIM(r.point) = d.PointNumber
      ORDER BY isStation DESC, d.PointNumber
    `);

    const data = result.recordset as SensorListItem[];
    setCached(CACHE_KEY, data);
    console.log(`[GET /api/sensors] 已加载 ${data.length} 条设备，缓存 ${CACHE_TTL_MS / 1000}s`);

    return NextResponse.json(data, { headers: NO_STORE_HEADERS });
  } catch (err) {
    console.error('[GET /api/sensors]', err);
    return NextResponse.json(
      { error: '获取设备列表失败' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
