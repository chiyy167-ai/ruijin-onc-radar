import {
  DAYS_WITHIN_OPTIONS,
  type DaysWithin,
  type SortKey,
} from '../lib/prefs'

interface ListToolbarProps {
  query: string
  onQueryChange: (q: string) => void
  sort: SortKey
  onSortChange: (s: SortKey) => void
  daysWithin?: DaysWithin
  onDaysWithinChange?: (d: DaysWithin) => void
  showDaysFilter?: boolean
  showExport?: boolean
  onExport?: () => void
  placeholder?: string
}

export default function ListToolbar({
  query,
  onQueryChange,
  sort,
  onSortChange,
  daysWithin,
  onDaysWithinChange,
  showDaysFilter,
  showExport,
  onExport,
  placeholder = '搜索标题、期刊、摘要、PMID…',
}: ListToolbarProps) {
  return (
    <div className="mb-3 space-y-2">
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
          <SearchIcon />
        </span>
        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border-0 bg-slate-900/70 py-2.5 pl-10 pr-3 text-sm text-slate-100 placeholder:text-slate-500 ring-1 ring-slate-700/70 focus:outline-none focus:ring-sky-400/50"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {showDaysFilter &&
          daysWithin !== undefined &&
          onDaysWithinChange && (
            <label className="flex items-center gap-1.5 text-xs text-slate-500">
              时间
              <select
                value={daysWithin}
                onChange={(e) =>
                  onDaysWithinChange(Number(e.target.value) as DaysWithin)
                }
                className="rounded-lg bg-slate-800 px-2 py-1.5 text-xs text-slate-200 ring-1 ring-slate-600 focus:outline-none focus:ring-sky-400/50"
              >
                {DAYS_WITHIN_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          )}
        <label className="flex items-center gap-1.5 text-xs text-slate-500">
          排序
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value as SortKey)}
            className="rounded-lg bg-slate-800 px-2 py-1.5 text-xs text-slate-200 ring-1 ring-slate-600 focus:outline-none focus:ring-sky-400/50"
          >
            <option value="date_desc">日期新→旧</option>
            <option value="date_asc">日期旧→新</option>
            <option value="title_asc">标题 A→Z</option>
          </select>
        </label>
        {showExport && onExport && (
          <button
            type="button"
            onClick={onExport}
            className="ml-auto rounded-lg px-2.5 py-1.5 text-xs text-slate-300 ring-1 ring-slate-600 hover:bg-slate-800"
          >
            导出书签
          </button>
        )}
      </div>
    </div>
  )
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="11" cy="11" r="7" />
      <path strokeLinecap="round" d="M20 20l-3.5-3.5" />
    </svg>
  )
}
