import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';
import type { LayoutItem, Sensor, DeletedSensor, LayoutResponse } from '@/types/sensor';

/**
 * 强制动态渲染，防止 Next.js 在 build 时静态化此接口
 * 并生成 .body / .meta 缓存文件导致现场一直返回构建时的测试数据
 * layout 接口包含实时传感器读数（ssz/color），不做服务端内存缓存
 */
export const dynamic = 'force-dynamic';

/** 禁止浏览器缓存，避免现场与测试环境同源时读到旧的缓存数据 */
const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
} as const;

/**
 * GET /api/layout
 * 读取 Sensor3DLayout，与 Deviceinformation + realdata 左联合
 * 返回 { sensors: Sensor[], deletedSensors: DeletedSensor[] }
 */
export async function GET() {
  try {
    const pool = await getPool();

    // 确保表存在（首次运行自动建表）
    await pool.request().query(`
      IF NOT EXISTS (
        SELECT 1 FROM sys.objects
        WHERE object_id = OBJECT_ID(N'Sensor3DLayout') AND type = 'U'
      )
      CREATE TABLE Sensor3DLayout (
        PointNumber VARCHAR(6)   NOT NULL PRIMARY KEY,
        LocalX      FLOAT        NOT NULL,
        LocalY      FLOAT        NOT NULL,
        LocalZ      FLOAT        NOT NULL,
        CreatedAt   DATETIME     NULL DEFAULT GETDATE(),
        UpdatedAt   DATETIME     NULL DEFAULT GETDATE()
      )
    `);

    const result = await pool.request().query(`
      SELECT
        l.PointNumber,
        l.LocalX,
        l.LocalY,
        l.LocalZ,
        d.PointName,
        d.PointAddress,
        d.Unit,
        CASE WHEN d.PointName = N'分站' THEN 1 ELSE 0 END AS isStation,
        RTRIM(r.ssz)                AS ssz,
        CAST(RTRIM(r.color) AS INT) AS color
      FROM Sensor3DLayout l
      LEFT JOIN Deviceinformation d ON d.PointNumber = l.PointNumber
      LEFT JOIN realdata r          ON RTRIM(r.point) = l.PointNumber
    `);

    const sensors: Sensor[] = [];
    const deletedSensors: DeletedSensor[] = [];

    for (const row of result.recordset) {
      if (row.PointName == null) {
        deletedSensors.push({
          pointNumber: row.PointNumber,
          position: { x: row.LocalX, y: row.LocalY, z: row.LocalZ },
          isDeleted: true,
        });
      } else {
        sensors.push({
          pointNumber: row.PointNumber,
          pointName: row.PointName,
          pointAddress: row.PointAddress ?? '',
          unit: row.Unit ?? '',
          ssz: row.ssz ?? '',
          color: row.color ?? -1,
          position: { x: row.LocalX, y: row.LocalY, z: row.LocalZ },
          isStation: row.isStation === 1,
        });
      }
    }

    return NextResponse.json(
      { sensors, deletedSensors } as LayoutResponse,
      { headers: NO_STORE_HEADERS }
    );
  } catch (err) {
    console.error('[GET /api/layout]', err);
    return NextResponse.json(
      { error: '获取布局失败' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

/**
 * POST /api/layout
 * 接收 LayoutItem[] 并 UPSERT 到 Sensor3DLayout
 * 传入空数组时清空表
 */
export async function POST(req: NextRequest) {
  try {
    const body: LayoutItem[] = await req.json();
    const pool = await getPool();

    // 自动建表（保险）
    await pool.request().query(`
      IF NOT EXISTS (
        SELECT 1 FROM sys.objects
        WHERE object_id = OBJECT_ID(N'Sensor3DLayout') AND type = 'U'
      )
      CREATE TABLE Sensor3DLayout (
        PointNumber VARCHAR(6)   NOT NULL PRIMARY KEY,
        LocalX      FLOAT        NOT NULL,
        LocalY      FLOAT        NOT NULL,
        LocalZ      FLOAT        NOT NULL,
        CreatedAt   DATETIME     NULL DEFAULT GETDATE(),
        UpdatedAt   DATETIME     NULL DEFAULT GETDATE()
      )
    `);

    // 按 pointNumber 去重（同一测点只保留最后一项），避免主键冲突
    const byPoint = new Map<string, LayoutItem>();
    for (const item of body) {
      byPoint.set(item.pointNumber, item);
    }
    const items = Array.from(byPoint.values());

    // 清空后批量插入（简单策略：全量替换）
    await pool.request().query(`DELETE FROM Sensor3DLayout`);

    for (const item of items) {
      await pool
        .request()
        .input('pn', sql.VarChar(6), item.pointNumber)
        .input('x', sql.Float, item.localX)
        .input('y', sql.Float, item.localY)
        .input('z', sql.Float, item.localZ)
        .query(`
          INSERT INTO Sensor3DLayout (PointNumber, LocalX, LocalY, LocalZ, CreatedAt, UpdatedAt)
          VALUES (@pn, @x, @y, @z, GETDATE(), GETDATE())
        `);
    }

    return NextResponse.json(
      { ok: true, count: items.length },
      { headers: NO_STORE_HEADERS }
    );
  } catch (err) {
    console.error('[POST /api/layout]', err);
    return NextResponse.json(
      { error: '保存布局失败' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
