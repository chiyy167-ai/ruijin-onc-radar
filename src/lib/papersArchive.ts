import type { Paper } from '../types'

const ARCHIVE_KEY = 'rj-onc-radar-papers-archive-v1'
/** 本地最多保留天数（显示窗口默认 30，档案略宽以防切换） */
const RETAIN_DAYS = 90

type ArchivePayload = {
  updatedAt: string
  papers: Paper[]
}

function paperKey(p: Paper): string {
  return p.pmid || `title:${p.title}`
}

function parseDateMs(dateStr: string): number | null {
  if (!dateStr) return null
  const t = Date.parse(dateStr)
  return Number.isNaN(t) ? null : t
}

/** 是否在最近 N 天内；days<=0 表示不限制；无日期的条目默认保留 */
export function isWithinDays(dateStr: string, days: number): boolean {
  if (days <= 0) return true
  const t = parseDateMs(dateStr)
  if (t == null) return true
  return t >= Date.now() - days * 86_400_000
}

function prune(papers: Paper[]): Paper[] {
  const cutoff = Date.now() - RETAIN_DAYS * 86_400_000
  return papers.filter((p) => {
    const t = parseDateMs(p.date)
    if (t == null) return true
    return t >= cutoff
  })
}

function readArchive(): Paper[] {
  try {
    const raw = localStorage.getItem(ARCHIVE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ArchivePayload
    return Array.isArray(parsed?.papers) ? parsed.papers : []
  } catch {
    return []
  }
}

function writeArchive(papers: Paper[]) {
  const payload: ArchivePayload = {
    updatedAt: new Date().toISOString(),
    papers,
  }
  try {
    localStorage.setItem(ARCHIVE_KEY, JSON.stringify(payload))
  } catch {
    // 配额不足时再裁一轮（只留 45 天）
    try {
      const cutoff = Date.now() - 45 * 86_400_000
      const slim = papers.filter((p) => {
        const t = parseDateMs(p.date)
        return t == null || t >= cutoff
      })
      localStorage.setItem(
        ARCHIVE_KEY,
        JSON.stringify({ updatedAt: new Date().toISOString(), papers: slim }),
      )
    } catch {
      /* ignore */
    }
  }
}

/**
 * 将远端拉取的文献合并进本地档案（按 PMID 去重），并裁掉过旧条目。
 * 返回合并后的完整档案列表。
 */
export function mergePapersIntoArchive(incoming: Paper[]): Paper[] {
  const map = new Map<string, Paper>()
  for (const p of readArchive()) map.set(paperKey(p), p)
  for (const p of incoming) map.set(paperKey(p), p)
  const merged = prune([...map.values()])
  writeArchive(merged)
  return merged
}

/** 仅读取本地档案（不合并） */
export function loadPaperArchive(): Paper[] {
  return prune(readArchive())
}
