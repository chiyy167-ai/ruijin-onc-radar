import type { Paper, Trial } from '../types'

const STORAGE_KEY = 'rj-onc-radar-favorites-v1'

export type FavoritePaper = {
  kind: 'paper'
  id: string
  savedAt: string
  snapshot: Paper
}

export type FavoriteTrial = {
  kind: 'trial'
  id: string
  savedAt: string
  snapshot: Trial
}

export type FavoriteItem = FavoritePaper | FavoriteTrial

function readAll(): FavoriteItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as FavoriteItem[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeAll(items: FavoriteItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export function loadFavorites(): FavoriteItem[] {
  return readAll().sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1))
}

export function isFavorite(kind: 'paper' | 'trial', id: string): boolean {
  return readAll().some((x) => x.kind === kind && x.id === id)
}

export function togglePaperFavorite(paper: Paper): boolean {
  const id = paper.pmid || paper.title
  const all = readAll()
  const idx = all.findIndex((x) => x.kind === 'paper' && x.id === id)
  if (idx >= 0) {
    all.splice(idx, 1)
    writeAll(all)
    return false
  }
  all.push({
    kind: 'paper',
    id,
    savedAt: new Date().toISOString(),
    snapshot: paper,
  })
  writeAll(all)
  return true
}

export function toggleTrialFavorite(trial: Trial): boolean {
  const id = trial.nctId
  const all = readAll()
  const idx = all.findIndex((x) => x.kind === 'trial' && x.id === id)
  if (idx >= 0) {
    all.splice(idx, 1)
    writeAll(all)
    return false
  }
  all.push({
    kind: 'trial',
    id,
    savedAt: new Date().toISOString(),
    snapshot: trial,
  })
  writeAll(all)
  return true
}

/** 生成便于粘贴到笔记/文献库的出处文案 */
export function formatPaperCitation(paper: Paper): string {
  const journal = paper.journal || 'Unknown journal'
  const date = paper.date || ''
  const pmid = paper.pmid ? `PMID: ${paper.pmid}` : ''
  const url = paper.pubmedUrl || ''
  return [paper.title, `${journal}${date ? `. ${date}` : ''}`, pmid, url]
    .filter(Boolean)
    .join('\n')
}

export function formatTrialCitation(trial: Trial): string {
  return [
    trial.title,
    `ClinicalTrials.gov · ${trial.nctId}`,
    `${trial.status || ''} ${trial.phase || ''}`.trim(),
    trial.url,
  ]
    .filter(Boolean)
    .join('\n')
}

/** 导出全部书签为纯文本，便于备份或粘贴到笔记 */
export function exportFavoritesText(items?: FavoriteItem[]): string {
  const list = items ?? loadFavorites()
  if (list.length === 0) return '（暂无书签）'
  const lines: string[] = [`瑞金肿瘤内科科研雷达 · 书签导出`, `共 ${list.length} 条`, '']
  list.forEach((item, i) => {
    lines.push(`—— ${i + 1}. ${item.kind === 'paper' ? '文献' : '试验'} ——`)
    if (item.kind === 'paper') lines.push(formatPaperCitation(item.snapshot))
    else lines.push(formatTrialCitation(item.snapshot))
    lines.push(`收藏时间：${item.savedAt}`)
    lines.push('')
  })
  return lines.join('\n')
}
