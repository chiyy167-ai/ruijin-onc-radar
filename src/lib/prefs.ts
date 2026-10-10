/** 本机偏好：分页、排序、已读 */

const PREFS_KEY = 'rj-onc-radar-prefs-v1'
const READ_KEY = 'rj-onc-radar-read-v1'

export type SortKey = 'date_desc' | 'date_asc' | 'title_asc'

export type Prefs = {
  pageSize: number
  sort: SortKey
}

const DEFAULT_PREFS: Prefs = {
  pageSize: 10,
  sort: 'date_desc',
}

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
