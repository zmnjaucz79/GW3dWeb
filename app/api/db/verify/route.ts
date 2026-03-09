import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

/**
 * GET /api/db/verify
 * 验证 gwjc1 数据库连接，并返回 Deviceinformation / realdata 表概况
 */
export async function GET() {
  try {
    const pool = await getPool();

    // 1. 简单连通性
    const ping = await pool.request().query<{ ok: number }>('SELECT 1 AS ok');
    if (!ping.recordset?.[0]?.ok) {
      return NextResponse.json(
        { ok: false, message: '数据库无响应', details: null },
        { status: 500 }
      );
    }

    // 2. 表记录数（按 plan 中的表名）
    let deviceCount = 0;
    let realdataCount = 0;
    let layoutExists = false;
    let errorDetail: string | null = null;

    try {
      const deviceRes = await pool
        .request()
        .query<{ cnt: number }>(
          "SELECT COUNT(1) AS cnt FROM Deviceinformation WHERE PointName <> N'分站'"
        );
      deviceCount = deviceRes.recordset?.[0]?.cnt ?? 0;
    } catch (e) {
      errorDetail = `Deviceinformation: ${(e as Error).message}`;
    }

    try {
      const realRes = await pool
        .request()
        .query<{ cnt: number }>('SELECT COUNT(1) AS cnt FROM realdata');
      realdataCount = realRes.recordset?.[0]?.cnt ?? 0;
    } catch (e) {
      errorDetail = (errorDetail ?? '') + `; realdata: ${(e as Error).message}`;
    }

    try {
      const layoutRes = await pool
        .request()
        .query(
          "SELECT 1 AS ex FROM sys.objects WHERE object_id = OBJECT_ID(N'Sensor3DLayout') AND type = 'U'"
        );
      layoutExists = (layoutRes.recordset?.[0] as { ex?: number })?.ex === 1;
    } catch {
      layoutExists = false;
    }

    return NextResponse.json({
      ok: true,
      message: '数据库连接正常',
      details: {
        server: process.env.DB_SERVER ?? 'localhost',
        database: process.env.DB_DATABASE ?? 'gwjc1',
        sensorCountExcludingStation: deviceCount,
        realdataCount,
        sensor3DLayoutExists: layoutExists,
        errorDetail: errorDetail || undefined,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[GET /api/db/verify]', err);
    return NextResponse.json(
      { ok: false, message: '连接失败', details: { error: message } },
      { status: 500 }
    );
  }
}
