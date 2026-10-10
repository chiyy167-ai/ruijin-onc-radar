import { useEffect, useMemo, useState } from 'react'
import FilterBar from './components/FilterBar'
import { PaperCard, TrialCard } from './components/PaperCard'
import type { RadarData } from './types'

type Tab = 'papers' | 'trials'

export default function App() {
  const [data, setData] = useState<RadarData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('papers')
  const [selectedDisease, setSelectedDisease] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
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
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const papers = data?.papers ?? []
  const trials = data?.trials ?? []

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
      // 试验列表本身即临床试验；若选了其他研究类型则隐藏
      const typeMatch =
        !selectedType ||
        selectedType === 'clinical_trial' ||
        selectedType === 'other'
      return diseaseMatch && typeMatch
    })
  }, [trials, selectedDisease, selectedType])

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      <header className="border-b border-slate-800/80 bg-gradient-to-b from-slate-900 to-[#0f172a] px-4 pb-4 pt-5">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-medium tracking-wide text-sky-400/90">
            Ruijin Oncology Research Radar
          </p>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-white sm:text-2xl">
            瑞金肿瘤内科科研雷达
          </h1>
          <p className="mt-1.5 text-sm text-slate-400">
            胃肠癌症最新文献与临床试验 · 每日自动更新
          </p>
          <p className="mt-2 text-xs text-slate-500">
            更新时间：{data?.updatedAt ?? (loading ? '加载中…' : '—')}
          </p>
        </div>
      </header>

      <FilterBar
        selectedDisease={selectedDisease}
        selectedType={selectedType}
        onDiseaseChange={setSelectedDisease}
        onTypeChange={setSelectedType}
      />

      <main className="mx-auto max-w-3xl px-3 py-4 safe-bottom">
        <div className="mb-4 flex gap-2">
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
        </div>

        {loading && (
          <div className="rounded-xl bg-[#1e293b] px-4 py-10 text-center text-sm text-slate-400 ring-1 ring-slate-700/60">
            正在加载最新数据…
          </div>
        )}

        {!loading && error && (
          <div className="rounded-xl bg-rose-950/40 px-4 py-6 text-center text-sm text-rose-300 ring-1 ring-rose-800/50">
            {error}
            <button
              type="button"
              className="mt-3 block w-full text-sky-300 underline"
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
              filteredPapers.map((p) => (
                <PaperCard key={p.pmid || p.title} paper={p} />
              ))
            )}
          </div>
        )}

        {!loading && !error && tab === 'trials' && (
          <div className="flex flex-col gap-3">
            {filteredTrials.length === 0 ? (
              <EmptyState text="当前筛选条件下暂无临床试验" />
            ) : (
              filteredTrials.map((t) => (
                <TrialCard key={t.nctId} trial={t} />
              ))
            )}
          </div>
        )}
      </main>

      <footer className="pb-8 text-center text-[11px] text-slate-600">
        瑞金医院肿瘤内科 · RJ-Onc Radar · 零服务器成本 PWA
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
        'flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        active
          ? 'bg-sky-500/20 text-sky-300 ring-1 ring-sky-400/40'
          : 'bg-slate-800/50 text-slate-400 ring-1 ring-slate-700/60',
      ].join(' ')}
    >
      {label}
    </button>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl bg-[#1e293b] px-4 py-10 text-center text-sm text-slate-400 ring-1 ring-slate-700/60">
      {text}
    </div>
  )
}
