import sql from 'mssql';

const config: sql.config = {
  server: process.env.DB_SERVER || 'localhost',
  port: parseInt(process.env.DB_PORT || '1433', 10),
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'gwjc1',
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERT !== 'false',
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

/** 用于日志的配置摘要（不包含密码） */
function getConfigSummary() {
  // 现场实际生效的配置来自 config/config.yml 注入到 process.env 的 DB_* 变量；
  // 这里直接读取 env，避免 mssql 的类型定义差异导致 TS 报错。
  return {
    server: process.env.DB_SERVER || 'localhost',
    port: parseInt(process.env.DB_PORT || '1433', 10),
    database: process.env.DB_DATABASE || 'gwjc1',
    user: process.env.DB_USER || 'sa',
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERT !== 'false',
  };
}

let pool: sql.ConnectionPool | null = null;

export async function getPool(): Promise<sql.ConnectionPool> {
  if (pool && pool.connected) return pool;

  console.log('[db] 正在连接数据库:', JSON.stringify(getConfigSummary(), null, 2));
  try {
    pool = await new sql.ConnectionPool(config).connect();
    console.log('[db] 数据库连接成功');
    return pool;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[db] 数据库连接失败:', msg);
    console.error('[db] 当前配置:', JSON.stringify(getConfigSummary(), null, 2));
    throw err;
  }
}

export { sql };
