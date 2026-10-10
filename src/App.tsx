import { useEffect, useMemo, useState } from 'react'
import FilterBar from './components/FilterBar'
import ListToolbar from './components/ListToolbar'
import LoadingScreen from './components/LoadingScreen'
import Pagination from './components/Pagination'
import { PaperCard, TrialCard } from './components/PaperCard'
import {
  exportFavoritesText,
  loadFavorites,
  togglePaperFavorite,
  toggleTrialFavorite,
  type FavoriteItem,
} from './lib/favorites'
import {
  formatCacheAge,
  loadCachedData,
  saveCachedData,
} from './lib/dataCache'
import {
  isWithinDays,
  loadPaperArchive,
  mergePapersIntoArchive,
} from './lib/papersArchive'
import {
  loadPrefs,
  loadReadIds,
  savePrefs,
  toggleReadId,
  type Prefs,
  type SortKey,
} from './lib/prefs'
import type { Paper, RadarData, Trial } from './types'

type Tab = 'papers' | 'trials' | 'bookmarks'
const MIN_SPLASH_MS = 1400
const CACHE_SPLASH_MS = 350

function paperId(p: Paper) {
  return p.pmid || p.title
}

function matchesQuery(text: string, q: string) {
  if (!q) return true
  return text.toLowerCase().includes(q.toLowerCase())
}

function sortPapers(list: Paper[], sort: SortKey): Paper[] {
  const arr = [...list]
  arr.sort((a, b) => {
    if (sort === 'title_asc') return (a.title || '').localeCompare(b.title || '')
    const da = a.date || ''
    const db = b.date || ''
    return sort === 'date_asc' ? da.localeCompare(db) : db.localeCompare(da)
  })
  return arr
}

function sortTrials(list: Trial[], sort: SortKey): Trial[] {
  const arr = [...list]
  arr.sort((a, b) => {
    if (sort === 'title_asc') return (a.title || '').localeCompare(b.title || '')
    // 试验无日期字段，用 NCT 号近似
    const da = a.nctId || ''
    const db = b.nctId || ''
    return sort === 'date_asc' ? da.localeCompare(db) : db.localeCompare(da)
  })
  return arr
}

export default function App() {
  const [data, setData] = useState<RadarData | null>(() => {
    return loadCachedData()?.data ?? null
  })
  const [cacheAt, setCacheAt] = useState<string | null>(() => {
    return loadCachedData()?.cachedAt ?? null
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(() => !loadCachedData())
  const [refreshing, setRefreshing] = useState(false)
  const [showSplash, setShowSplash] = useState(true)
  const [tab, setTab] = useState<Tab>('papers')
  const [selectedDisease, setSelectedDisease] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [bookmarks, setBookmarks] = useState<FavoriteItem[]>([])
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set())
  const [prefs, setPrefs] = useState<Prefs>(() => loadPrefs())
  /** 本地合并档案中的文献池（默认按近 30 天筛选展示） */
  const [paperPool, setPaperPool] = useState<Paper[]>(() => loadPaperArchive())
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [showTop, setShowTop] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    setBookmarks(loadFavorites())
    setReadIds(loadReadIds())
    setPrefs(loadPrefs())
    // 若有数据缓存，先并入本地文献档案
    const cached = loadCachedData()?.data?.papers
    if (cached?.length) {
      setPaperPool(mergePapersIntoArchive(cached))
    }
  }, [])

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 480)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    let cancelled = false
    const started = Date.now()
    const hadCache = !!loadCachedData()

    // 有缓存：短闪屏后立刻进主界面，网络在后台更新
    if (hadCache) {
      const wait = Math.max(0, CACHE_SPLASH_MS - (Date.now() - started))
      window.setTimeout(() => {
        if (!cancelled) setShowSplash(false)
      }, wait)
    }

    async function load() {
      if (!hadCache) {
        setLoading(true)
      } else {
        setRefreshing(true)
      }
      setError(null)

      try {
        const res = await fetch(`${import.meta.env.BASE_URL}data.json`, {
          // 允许浏览器/SW 缓存命中，再配合本地 localStorage 做双层加速
          cache: 'default',
        })
        if (!res.ok) throw new Error(`加载失败 (${res.status})`)
        const json = (await res.json()) as RadarData
        if (cancelled) return
        setData(json)
        saveCachedData(json)
        setCacheAt(new Date().toISOString())
        // 合并进本地文献档案并持久化（支持近 30 天滚动保留）
        setPaperPool(mergePapersIntoArchive(json.papers ?? []))
      } catch (e) {
        if (cancelled) return
        // 有本地缓存时静默失败，继续用缓存
        if (!hadCache && !loadCachedData()) {
          setError(e instanceof Error ? e.message : '数据加载失败')
        }
      } finally {
        if (cancelled) return
        setLoading(false)
        setRefreshing(false)
        if (!hadCache) {
          const wait = Math.max(0, MIN_SPLASH_MS - (Date.now() - started))
          window.setTimeout(() => {
            if (!cancelled) setShowSplash(false)
          }, wait)
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  // 切换筛选/搜索/排序/页签时回到第一页
  useEffect(() => {
    setPage(1)
  }, [
    tab,
    selectedDisease,
    selectedType,
    query,
    prefs.sort,
    prefs.pageSize,
    prefs.daysWithin,
  ])

  // 文献优先用本地档案；若档案为空则回退远端
  const papers =
    paperPool.length > 0 ? paperPool : (data?.papers ?? [])
  const trials = data?.trials ?? []

  const favIdSet = useMemo(() => {
    const s = new Set<string>()
    for (const f of bookmarks) s.add(`${f.kind}:${f.id}`)
    return s
  }, [bookmarks])

  const filteredPapers = useMemo(() => {
    const q = query.trim()
    const list = papers.filter((p) => {
      const cats = p.categories ?? { disease: [], studyType: [] }
      const diseaseMatch =
        !selectedDisease || cats.disease.includes(selectedDisease)
      const typeMatch =
        !selectedType || cats.studyType.includes(selectedType)
      const dateMatch = isWithinDays(p.date, prefs.daysWithin)
      const hay = `${p.title} ${p.journal} ${p.abstract} ${p.pmid}`
      return (
        diseaseMatch && typeMatch && dateMatch && matchesQuery(hay, q)
      )
    })
    return sortPapers(list, prefs.sort)
  }, [
    papers,
    selectedDisease,
    selectedType,
    query,
    prefs.sort,
    prefs.daysWithin,
  ])

  const filteredTrials = useMemo(() => {
    const q = query.trim()
    const list = trials.filter((t) => {
      const diseaseMatch = !selectedDisease || t.category === selectedDisease
      const typeMatch =
        !selectedType ||
        selectedType === 'clinical_trial' ||
        selectedType === 'other'
      const hay = `${t.title} ${t.nctId} ${t.status} ${t.phase}`
      return diseaseMatch && typeMatch && matchesQuery(hay, q)
    })
    return sortTrials(list, prefs.sort)
  }, [trials, selectedDisease, selectedType, query, prefs.sort])

  const bookmarkPapers = useMemo(
    () =>
      sortPapers(
        bookmarks
          .filter((f): f is Extract<FavoriteItem, { kind: 'paper' }> => f.kind === 'paper')
          .map((f) => f.snapshot)
          .filter((p) => {
            const q = query.trim()
            return (
              isWithinDays(p.date, prefs.daysWithin) &&
              matchesQuery(
                `${p.title} ${p.journal} ${p.abstract} ${p.pmid}`,
                q,
              )
            )
          }),
        prefs.sort,
      ),
    [bookmarks, query, prefs.sort, prefs.daysWithin],
  )

  const bookmarkTrials = useMemo(
    () =>
      sortTrials(
        bookmarks
          .filter((f): f is Extract<FavoriteItem, { kind: 'trial' }> => f.kind === 'trial')
          .map((f) => f.snapshot)
          .filter((t) => {
            const q = query.trim()
            return matchesQuery(`${t.title} ${t.nctId} ${t.status}`, q)
          }),
        prefs.sort,
      ),
    [bookmarks, query, prefs.sort],
  )

  const activeListLength =
    tab === 'papers'
      ? filteredPapers.length
      : tab === 'trials'
        ? filteredTrials.length
        : bookmarkPapers.length + bookmarkTrials.length

  const totalPages = Math.max(1, Math.ceil(activeListLength / prefs.pageSize))
  const safePage = Math.min(page, totalPages)
  const pageStart = (safePage - 1) * prefs.pageSize
  const pageEnd = pageStart + prefs.pageSize

  const pagedPapers = filteredPapers.slice(pageStart, pageEnd)
  const pagedTrials = filteredTrials.slice(pageStart, pageEnd)

  // 书签页：文献+试验合并分页
  const bookmarkFlat = useMemo(() => {
    const items: (
      | { kind: 'paper'; data: Paper }
      | { kind: 'trial'; data: Trial }
    )[] = [
      ...bookmarkPapers.map((p) => ({ kind: 'paper' as const, data: p })),
      ...bookmarkTrials.map((t) => ({ kind: 'trial' as const, data: t })),
    ]
    return items
  }, [bookmarkPapers, bookmarkTrials])
  const pagedBookmarks = bookmarkFlat.slice(pageStart, pageEnd)

  const showToast = (msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(null), 1800)
  }

  const updatePrefs = (patch: Partial<Prefs>) => {
    const next = { ...prefs, ...patch }
    setPrefs(next)
    savePrefs(next)
  }

  const handleTogglePaper = (paper: Paper) => {
    const on = togglePaperFavorite(paper)
    setBookmarks(loadFavorites())
    showToast(on ? '已加入书签' : '已取消书签')
  }

  const handleToggleTrial = (trial: Trial) => {
    const on = toggleTrialFavorite(trial)
    setBookmarks(loadFavorites())
    showToast(on ? '已加入书签' : '已取消书签')
  }

  const handleToggleRead = (id: string) => {
    setReadIds(toggleReadId(id))
  }

  const handleExport = async () => {
    const text = exportFavoritesText()
    try {
      await navigator.clipboard.writeText(text)
      showToast('书签已复制到剪贴板')
    } catch {
      // 降级下载
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `rj-onc-bookmarks-${new Date().toISOString().slice(0, 10)}.txt`
      a.click()
      URL.revokeObjectURL(url)
      showToast('已下载书签文件')
    }
  }

  return (
    <div className="app-shell min-h-screen text-slate-100">
      <LoadingScreen visible={showSplash} />

      <header className="relative overflow-hidden border-b border-slate-800/70 px-4 pb-5 pt-4">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-900/80 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-3xl">
          <div className="flex items-start gap-3.5">
            <div className="shrink-0 rounded-full bg-white p-1 shadow-[0_0_24px_rgba(185,28,28,0.22)] ring-1 ring-amber-200/30">
              <img
                src={`${import.meta.env.BASE_URL}logo-ruijin.png`}
                alt="瑞金医院"
                className="h-14 w-14 object-contain sm:h-16 sm:w-16"
                draggable={false}
              />
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-[11px] font-medium tracking-[0.14em] text-rose-300/90">
                上海交通大学医学院附属瑞金医院
              </p>
              <h1 className="mt-1 text-xl font-bold tracking-tight text-white sm:text-2xl">
                瑞金肿瘤内科科研雷达
              </h1>
              <p className="mt-1 text-xs text-sky-300/80 sm:text-sm">
                Ruijin Oncology Research Radar · RJ-Onc Radar
              </p>
            </div>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            胃肠癌症最新文献与临床试验 · 每日自动更新
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/60 px-3 py-1 text-[11px] text-slate-400 ring-1 ring-slate-700/70">
              <span className="relative flex h-2 w-2">
                <span
                  className={[
                    'absolute inline-flex h-full w-full rounded-full opacity-60',
                    refreshing ? 'animate-ping bg-sky-400' : 'animate-ping bg-emerald-400',
                  ].join(' ')}
                />
                <span
                  className={[
                    'relative inline-flex h-2 w-2 rounded-full',
                    refreshing ? 'bg-sky-400' : 'bg-emerald-400',
                  ].join(' ')}
                />
              </span>
              {refreshing
                ? '正在后台更新…'
                : `更新：${data?.updatedAt ?? (loading ? '加载中…' : '—')}`}
            </div>
            {cacheAt && (
              <div className="inline-flex items-center rounded-full bg-slate-900/60 px-3 py-1 text-[11px] text-slate-500 ring-1 ring-slate-700/70">
                本地缓存 · {formatCacheAge(cacheAt)}
              </div>
            )}
            <div className="inline-flex items-center rounded-full bg-slate-900/60 px-3 py-1 text-[11px] text-slate-400 ring-1 ring-slate-700/70">
              书签 {bookmarks.length} · 已读 {readIds.size}
            </div>
          </div>
        </div>
      </header>

      <FilterBar
        selectedDisease={selectedDisease}
        selectedType={selectedType}
        onDiseaseChange={setSelectedDisease}
        onTypeChange={setSelectedType}
      />

      <main className="mx-auto max-w-3xl px-3 py-4 safe-bottom">
        <div className="mb-3 flex gap-1.5 rounded-xl bg-slate-900/40 p-1 ring-1 ring-slate-700/50">
          <TabButton
            active={tab === 'papers'}
            onClick={() => setTab('papers')}
            label={`文献 ${filteredPapers.length}`}
          />
          <TabButton
            active={tab === 'trials'}
            onClick={() => setTab('trials')}
            label={`试验 ${filteredTrials.length}`}
          />
          <TabButton
            active={tab === 'bookmarks'}
            onClick={() => setTab('bookmarks')}
            label={`书签 ${bookmarks.length}`}
          />
        </div>

        {!loading && !error && (
          <ListToolbar
            query={query}
            onQueryChange={setQuery}
            sort={prefs.sort}
            onSortChange={(s) => updatePrefs({ sort: s })}
            showDaysFilter={tab === 'papers' || tab === 'bookmarks'}
            daysWithin={prefs.daysWithin}
            onDaysWithinChange={(d) => updatePrefs({ daysWithin: d })}
            showExport={tab === 'bookmarks' && bookmarks.length > 0}
            onExport={handleExport}
            placeholder={
              tab === 'trials'
                ? '搜索试验标题、NCT 号…'
                : '搜索标题、期刊、摘要、PMID…'
            }
          />
        )}

        {!loading && error && (
          <div className="rise-in rounded-2xl bg-rose-950/40 px-4 py-8 text-center text-sm text-rose-300 ring-1 ring-rose-800/50">
            <p className="font-medium">{error}</p>
            <button
              type="button"
              className="mt-4 rounded-full bg-sky-500/15 px-4 py-2 text-sky-300 ring-1 ring-sky-400/30"
              onClick={() => window.location.reload()}
            >
              重新加载
            </button>
          </div>
        )}

        {!loading && !error && tab === 'papers' && (
          <>
            <div className="flex flex-col gap-3">
              {filteredPapers.length === 0 ? (
                <EmptyState text="当前条件下暂无文献" />
              ) : (
                pagedPapers.map((p, i) => {
                  const id = paperId(p)
                  return (
                    <div
                      key={id}
                      className="rise-in"
                      style={{ animationDelay: `${Math.min(i, 8) * 35}ms` }}
                    >
                      <PaperCard
                        paper={p}
                        bookmarked={favIdSet.has(`paper:${id}`)}
                        isRead={readIds.has(`paper:${id}`)}
                        onToggleBookmark={() => handleTogglePaper(p)}
                        onToggleRead={() => handleToggleRead(`paper:${id}`)}
                      />
                    </div>
                  )
                })
              )}
            </div>
            <Pagination
              page={safePage}
              totalPages={totalPages}
              total={filteredPapers.length}
              pageSize={prefs.pageSize}
              onPageChange={(p) => {
                setPage(p)
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              onPageSizeChange={(size) => updatePrefs({ pageSize: size })}
            />
          </>
        )}

        {!loading && !error && tab === 'trials' && (
          <>
            <div className="flex flex-col gap-3">
              {filteredTrials.length === 0 ? (
                <EmptyState text="当前条件下暂无临床试验" />
              ) : (
                pagedTrials.map((t, i) => (
                  <div
                    key={t.nctId}
                    className="rise-in"
                    style={{ animationDelay: `${Math.min(i, 8) * 35}ms` }}
                  >
                    <TrialCard
                      trial={t}
                      bookmarked={favIdSet.has(`trial:${t.nctId}`)}
                      isRead={readIds.has(`trial:${t.nctId}`)}
                      onToggleBookmark={() => handleToggleTrial(t)}
                      onToggleRead={() => handleToggleRead(`trial:${t.nctId}`)}
                    />
                  </div>
                ))
              )}
            </div>
            <Pagination
              page={safePage}
              totalPages={totalPages}
              total={filteredTrials.length}
              pageSize={prefs.pageSize}
              onPageChange={(p) => {
                setPage(p)
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              onPageSizeChange={(size) => updatePrefs({ pageSize: size })}
            />
          </>
        )}

        {!loading && !error && tab === 'bookmarks' && (
          <>
            <div className="flex flex-col gap-3">
              {bookmarkFlat.length === 0 ? (
                <EmptyState text="暂无书签。点击卡片右上角书签图标即可收藏，数据保存在本机。" />
              ) : (
                pagedBookmarks.map((item, i) => (
                  <div
                    key={
                      item.kind === 'paper'
                        ? `bm-p-${paperId(item.data)}`
                        : `bm-t-${item.data.nctId}`
                    }
                    className="rise-in"
                    style={{ animationDelay: `${Math.min(i, 8) * 35}ms` }}
                  >
                    {item.kind === 'paper' ? (
                      <PaperCard
                        paper={item.data}
                        bookmarked
                        isRead={readIds.has(`paper:${paperId(item.data)}`)}
                        onToggleBookmark={() => handleTogglePaper(item.data)}
                        onToggleRead={() =>
                          handleToggleRead(`paper:${paperId(item.data)}`)
                        }
                      />
                    ) : (
                      <TrialCard
                        trial={item.data}
                        bookmarked
                        isRead={readIds.has(`trial:${item.data.nctId}`)}
                        onToggleBookmark={() => handleToggleTrial(item.data)}
                        onToggleRead={() =>
                          handleToggleRead(`trial:${item.data.nctId}`)
                        }
                      />
                    )}
                  </div>
                ))
              )}
            </div>
            <Pagination
              page={safePage}
              totalPages={totalPages}
              total={bookmarkFlat.length}
              pageSize={prefs.pageSize}
              onPageChange={(p) => {
                setPage(p)
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              onPageSizeChange={(size) => updatePrefs({ pageSize: size })}
            />
          </>
        )}
      </main>

      <footer className="px-4 pb-10 text-center">
        <div className="mx-auto mb-3 h-px max-w-[120px] bg-gradient-to-r from-transparent via-slate-600 to-transparent" />
        <p className="text-[11px] leading-relaxed text-slate-500">
          上海交通大学医学院附属瑞金医院 · 肿瘤内科
          <br />
          书签 / 已读记录保存在本机浏览器
        </p>
      </footer>

      {showTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-4 z-40 rounded-full bg-sky-500/90 px-3.5 py-3 text-sm font-medium text-white shadow-lg shadow-sky-900/40 ring-1 ring-sky-300/40"
          aria-label="回到顶部"
        >
          顶部
        </button>
      )}

      {toast && (
        <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-full bg-slate-800/95 px-4 py-2 text-xs text-slate-100 shadow-lg ring-1 ring-slate-600">
          {toast}
        </div>
      )}
    </div>
  )
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex-1 rounded-lg px-2 py-2.5 text-sm font-medium transition-all sm:px-3',
        active
          ? 'bg-sky-500/20 text-sky-200 shadow-sm ring-1 ring-sky-400/40'
          : 'text-slate-400 hover:text-slate-200',
      ].join(' ')}
    >
      {label}
    </button>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rise-in rounded-2xl bg-[#1e293b]/80 px-4 py-12 text-center text-sm text-slate-400 ring-1 ring-slate-700/60">
      {text}
    </div>
  )
}
