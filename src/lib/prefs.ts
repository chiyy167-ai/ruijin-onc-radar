/** 本机偏好：分页、排序、时间窗、已读 */

const PREFS_KEY = 'rj-onc-radar-prefs-v1'
const READ_KEY = 'rj-onc-radar-read-v1'

export type SortKey = 'date_desc' | 'date_asc' | 'title_asc'

/** 文献时间窗（天）；0 = 全部 */
export type DaysWithin = 7 | 14 | 30 | 90 | 0

export type Prefs = {
  pageSize: number
  sort: SortKey
  /** 默认只显示近 N 天文献，本地持久化 */
  daysWithin: DaysWithin
}

export const DAYS_WITHIN_OPTIONS: { value: DaysWithin; label: string }[] = [
  { value: 7, label: '近 7 天' },
  { value: 14, label: '近 14 天' },
  { value: 30, label: '近 30 天' },
  { value: 90, label: '近 90 天' },
  { value: 0, label: '全部' },
]

const DEFAULT_PREFS: Prefs = {
  pageSize: 10,
  sort: 'date_desc',
  daysWithin: 30,
}

const DAYS_SET = new Set<number>([7, 14, 30, 90, 0])

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (!raw) return { ...DEFAULT_PREFS }
    const parsed = JSON.parse(raw) as Partial<Prefs>
    return {
      pageSize: [5, 10, 20].includes(parsed.pageSize ?? 0)
        ? (parsed.pageSize as number)
        : DEFAULT_PREFS.pageSize,
      sort: (['date_desc', 'date_asc', 'title_asc'] as SortKey[]).includes(
        parsed.sort as SortKey,
      )
        ? (parsed.sort as SortKey)
        : DEFAULT_PREFS.sort,
      daysWithin: DAYS_SET.has(parsed.daysWithin as number)
        ? (parsed.daysWithin as DaysWithin)
        : DEFAULT_PREFS.daysWithin,
    }
  } catch {
    return { ...DEFAULT_PREFS }
  }
}

export function savePrefs(prefs: Prefs) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
}

export function loadReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw) as string[]
    return new Set(Array.isArray(arr) ? arr : [])
  } catch {
    return new Set()
  }
}

export function toggleReadId(id: string): Set<string> {
  const set = loadReadIds()
  if (set.has(id)) set.delete(id)
  else set.add(id)
  localStorage.setItem(READ_KEY, JSON.stringify([...set]))
  return set
}
