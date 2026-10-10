import { useEffect, useMemo, useState } from 'react'
import FilterBar from './components/FilterBar'
import LoadingScreen from './components/LoadingScreen'
import { PaperCard, TrialCard } from './components/PaperCard'
import {
  loadFavorites,
  togglePaperFavorite,
  toggleTrialFavorite,
  type FavoriteItem,
} from './lib/favorites'
import type { Paper, RadarData, Trial } from './types'

type Tab = 'papers' | 'trials' | 'favorites'
const MIN_SPLASH_MS = 1400

export default function App() {
  const [data, setData] = useState<RadarData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showSplash, setShowSplash] = useState(true)
  const [tab, setTab] = useState<Tab>('papers')
  const [selectedDisease, setSelectedDisease] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [favorites, setFavorites] = useState<FavoriteItem[]>([])

  useEffect(() => {
    setFavorites(loadFavorites())
  }, [])

  useEffect(() => {
    let cancelled = false
    const started = Date.now()

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}data.json`, {
          cache: 'no-cache',
        })
        if (!res.ok) throw new Error(`加载失败 (${res.status})`)
        const json = (await res.json()) as RadarData
        if (!cancelled) setData(json)
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : '数据加载失败')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
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

  const papers = data?.papers ?? []
  const trials = data?.trials ?? []

  const favIdSet = useMemo(() => {
    const s = new Set<string>()
    for (const f of favorites) s.add(`${f.kind}:${f.id}`)
    return s
  }, [favorites])

  const filteredPapers = useMemo(() => {
    return papers.filter((p) => {
      const cats = p.categories ?? { disease: [], studyType: [] }
      const diseaseMatch =
        !selectedDisease || cats.disease.includes(selectedDisease)
      const typeMatch =
        !selectedType || cats.studyType.includes(selectedType)
      return diseaseMatch && typeMatch
    })
  }, [papers, selectedDisease, selectedType])

  const filteredTrials = useMemo(() => {
    return trials.filter((t) => {
      const diseaseMatch = !selectedDisease || t.category === selectedDisease
      const typeMatch =
        !selectedType ||
        selectedType === 'clinical_trial' ||
        selectedType === 'other'
      return diseaseMatch && typeMatch
    })
  }, [trials, selectedDisease, selectedType])

  const favoritePapers = useMemo(
    () =>
      favorites
        .filter((f): f is Extract<FavoriteItem, { kind: 'paper' }> => f.kind === 'paper')
        .map((f) => f.snapshot),
    [favorites],
  )

  const favoriteTrials = useMemo(
    () =>
      favorites
        .filter((f): f is Extract<FavoriteItem, { kind: 'trial' }> => f.kind === 'trial')
        .map((f) => f.snapshot),
    [favorites],
  )

  const handleTogglePaper = (paper: Paper) => {
    togglePaperFavorite(paper)
    setFavorites(loadFavorites())
  }

  const handleToggleTrial = (trial: Trial) => {
    toggleTrialFavorite(trial)
    setFavorites(loadFavorites())
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
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-slate-900/60 px-3 py-1 text-[11px] text-slate-400 ring-1 ring-slate-700/70">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            更新时间：{data?.updatedAt ?? (loading ? '加载中…' : '—')}
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
        <div className="mb-4 flex gap-1.5 rounded-xl bg-slate-900/40 p-1 ring-1 ring-slate-700/50">
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
            active={tab === 'favorites'}
            onClick={() => setTab('favorites')}
            label={`收藏 ${favorites.length}`}
          />
        </div>

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
          <div className="flex flex-col gap-3">
            {filteredPapers.length === 0 ? (
              <EmptyState text="当前筛选条件下暂无文献" />
            ) : (
              filteredPapers.map((p, i) => {
                const id = p.pmid || p.title
                return (
                  <div
                    key={id}
                    className="rise-in"
                    style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                  >
                    <PaperCard
                      paper={p}
                      favorited={favIdSet.has(`paper:${id}`)}
                      onToggleFavorite={() => handleTogglePaper(p)}
                    />
                  </div>
                )
              })
            )}
          </div>
        )}

        {!loading && !error && tab === 'trials' && (
          <div className="flex flex-col gap-3">
            {filteredTrials.length === 0 ? (
              <EmptyState text="当前筛选条件下暂无临床试验" />
            ) : (
              filteredTrials.map((t, i) => (
                <div
                  key={t.nctId}
                  className="rise-in"
                  style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                >
                  <TrialCard
                    trial={t}
                    favorited={favIdSet.has(`trial:${t.nctId}`)}
                    onToggleFavorite={() => handleToggleTrial(t)}
                  />
                </div>
              ))
            )}
          </div>
        )}

        {!loading && !error && tab === 'favorites' && (
          <div className="flex flex-col gap-3">
            {favorites.length === 0 ? (
              <EmptyState text="暂无收藏。点击卡片右上角星标即可收藏，数据保存在本机。" />
            ) : (
              <>
                {favoritePapers.length > 0 && (
                  <p className="px-1 text-xs font-medium tracking-wide text-slate-500">
                    文献 {favoritePapers.length}
                  </p>
                )}
                {favoritePapers.map((p, i) => {
                  const id = p.pmid || p.title
                  return (
                    <div
                      key={`fav-p-${id}`}
                      className="rise-in"
                      style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                    >
                      <PaperCard
                        paper={p}
                        favorited
                        onToggleFavorite={() => handleTogglePaper(p)}
                      />
                    </div>
                  )
                })}
                {favoriteTrials.length > 0 && (
                  <p className="mt-2 px-1 text-xs font-medium tracking-wide text-slate-500">
                    试验 {favoriteTrials.length}
                  </p>
                )}
                {favoriteTrials.map((t, i) => (
                  <div
                    key={`fav-t-${t.nctId}`}
                    className="rise-in"
                    style={{
                      animationDelay: `${Math.min(i + favoritePapers.length, 8) * 40}ms`,
                    }}
                  >
                    <TrialCard
                      trial={t}
                      favorited
                      onToggleFavorite={() => handleToggleTrial(t)}
                    />
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </main>

      <footer className="px-4 pb-10 text-center">
        <div className="mx-auto mb-3 h-px max-w-[120px] bg-gradient-to-r from-transparent via-slate-600 to-transparent" />
        <p className="text-[11px] leading-relaxed text-slate-500">
          上海交通大学医学院附属瑞金医院 · 肿瘤内科
          <br />
          RJ-Onc Radar · 收藏保存在本机浏览器
        </p>
      </footer>
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
