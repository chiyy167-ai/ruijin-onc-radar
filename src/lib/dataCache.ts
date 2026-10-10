import type { RadarData } from '../types'

const CACHE_KEY = 'rj-onc-radar-data-v1'

export type CachedPayload = {
  cachedAt: string
  data: RadarData
}

function isValidRadar(data: unknown): data is RadarData {
  if (!data || typeof data !== 'object') return false
  const d = data as RadarData
  return Array.isArray(d.papers) && Array.isArray(d.trials)
}

/** 同步读取本地缓存，用于首屏秒开 */
export function loadCachedData(): CachedPayload | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CachedPayload
    if (!parsed?.cachedAt || !isValidRadar(parsed.data)) return null
    return parsed
  } catch {
    return null
  }
}

/** 写入本地缓存（失败则静默忽略，不影响主流程） */
export function saveCachedData(data: RadarData): void {
  try {
    const payload: CachedPayload = {
      cachedAt: new Date().toISOString(),
      data,
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload))
  } catch {
    // QuotaExceeded 等：尝试清旧缓存后再写一次
    try {
      localStorage.removeItem(CACHE_KEY)
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ cachedAt: new Date().toISOString(), data }),
      )
    } catch {
      /* ignore */
    }
  }
}

export function clearCachedData(): void {
  try {
    localStorage.removeItem(CACHE_KEY)
  } catch {
    /* ignore */
  }
}

/** 格式化缓存时间展示 */
export function formatCacheAge(iso: string): string {
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return ''
  const mins = Math.round((Date.now() - t) / 60000)
  if (mins < 1) return '刚刚缓存'
  if (mins < 60) return `${mins} 分钟前缓存`
  const hours = Math.round(mins / 60)
  if (hours < 48) return `${hours} 小时前缓存`
  return `${Math.round(hours / 24)} 天前缓存`
}
