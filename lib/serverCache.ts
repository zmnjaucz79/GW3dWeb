/**
 * 服务端进程内存缓存（方案二）
 *
 * - 数据缓存在 Node.js 进程内存中，TTL 内直接返回，不查数据库
 * - TTL 到期后，下次请求时重新从数据库加载并刷新缓存
 * - 进程重启后缓存自动清空，会重新从数据库加载
 */

interface CacheEntry<T> {
  data: T;
  cachedAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();

/**
 * 读取缓存，未命中或已过期返回 null
 * @param key  缓存键
 * @param ttlMs  有效期（毫秒）
 */
export function getCached<T>(key: string, ttlMs: number): T | null {
  const entry = store.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > ttlMs) {
    store.delete(key);
    return null;
  }
  return entry.data;
}

/**
 * 写入缓存
 */
export function setCached<T>(key: string, data: T): void {
  store.set(key, { data, cachedAt: Date.now() });
}

/**
 * 主动清除某个 key 的缓存（适用于数据确认已变更时）
 */
export function invalidateCache(key: string): void {
  store.delete(key);
}

/**
 * 清空全部缓存
 */
export function invalidateAll(): void {
  store.clear();
}
