interface PaginationProps {
  page: number
  totalPages: number
  total: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}

export default function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  if (total === 0) return null

  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <div className="mt-4 space-y-3 rounded-2xl bg-slate-900/50 px-3 py-3 ring-1 ring-slate-700/50">
      <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
        <span>
          第 {from}–{to} 条，共 {total} 条
        </span>
        <label className="flex items-center gap-1.5">
          <span className="text-slate-500">每页</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="rounded-lg border-0 bg-slate-800 px-2 py-1 text-slate-200 ring-1 ring-slate-600 focus:outline-none focus:ring-sky-400/50"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
          </select>
        </label>
      </div>

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="rounded-lg px-3 py-2 text-sm font-medium text-slate-200 ring-1 ring-slate-600 transition enabled:active:scale-[0.98] disabled:opacity-35"
        >
          上一页
        </button>
        <div className="flex items-center gap-1.5">
          {pageButtons(page, totalPages).map((p, i) =>
            p === '…' ? (
              <span key={`e-${i}`} className="px-1 text-slate-600">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                className={[
                  'min-w-[2rem] rounded-lg px-2 py-1.5 text-sm font-medium transition',
                  p === page
                    ? 'bg-sky-500/25 text-sky-200 ring-1 ring-sky-400/40'
                    : 'text-slate-400 ring-1 ring-slate-700 hover:text-slate-200',
                ].join(' ')}
              >
                {p}
              </button>
            ),
          )}
        </div>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="rounded-lg px-3 py-2 text-sm font-medium text-slate-200 ring-1 ring-slate-600 transition enabled:active:scale-[0.98] disabled:opacity-35"
        >
          下一页
        </button>
      </div>
    </div>
  )
}

function pageButtons(page: number, total: number): (number | '…')[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1)
  const set = new Set([1, total, page, page - 1, page + 1].filter((n) => n >= 1 && n <= total))
  const sorted = [...set].sort((a, b) => a - b)
  const out: (number | '…')[] = []
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) out.push('…')
    out.push(sorted[i])
  }
  return out
}
