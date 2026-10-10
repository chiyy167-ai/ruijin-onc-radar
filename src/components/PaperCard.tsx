import { useState } from 'react'
import {
  formatPaperCitation,
  formatTrialCitation,
} from '../lib/favorites'
import {
  DISEASE_LABELS,
  STUDY_TYPE_LABELS,
  type Paper,
  type Trial,
} from '../types'

interface PaperCardProps {
  paper: Paper
  favorited: boolean
  onToggleFavorite: () => void
}

interface TrialCardProps {
  trial: Trial
  favorited: boolean
  onToggleFavorite: () => void
}

function Pill({
  text,
  tone,
}: {
  text: string
  tone: 'disease' | 'study'
}) {
  const cls =
    tone === 'disease'
      ? 'bg-sky-500/15 text-sky-300 ring-sky-500/30'
      : 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30'
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[12px] font-medium ring-1 ring-inset ${cls}`}
    >
      {text}
    </span>
  )
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3.5l2.7 5.47 6.04.88-4.37 4.26 1.03 6.02L12 17.27 6.6 20.13l1.03-6.02L3.26 9.85l6.04-.88L12 3.5z"
      />
    </svg>
  )
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.left = '-9999px'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(ta)
      return ok
    } catch {
      return false
    }
  }
}

export function PaperCard({
  paper,
  favorited,
  onToggleFavorite,
}: PaperCardProps) {
  const diseases = paper.categories?.disease ?? []
  const studyTypes = paper.categories?.studyType ?? []
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const ok = await copyText(formatPaperCitation(paper))
    if (ok) {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    }
  }

  return (
    <article className="paper-card relative overflow-hidden rounded-2xl border border-slate-700/60 bg-[#1e293b]/90 p-4 backdrop-blur-sm">
      <div className="absolute inset-y-3 left-0 w-1 rounded-r-full bg-gradient-to-b from-sky-400/80 to-sky-600/20" />

      <div className="flex items-start gap-2 pl-2">
        <a
          href={paper.pubmedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="min-w-0 flex-1 text-[15px] font-semibold leading-snug text-slate-50 hover:text-sky-300"
        >
          {paper.title}
        </a>
        <button
          type="button"
          onClick={onToggleFavorite}
          aria-label={favorited ? '取消收藏' : '收藏文献'}
          aria-pressed={favorited}
          className={[
            'shrink-0 rounded-full p-1.5 transition-colors',
            favorited
              ? 'text-amber-300 bg-amber-400/10 ring-1 ring-amber-400/30'
              : 'text-slate-500 hover:text-amber-300 hover:bg-slate-800',
          ].join(' ')}
        >
          <StarIcon filled={favorited} />
        </button>
      </div>

      {(diseases.length > 0 || studyTypes.length > 0) && (
        <div className="mt-2.5 flex flex-wrap gap-1.5 pl-2">
          {diseases.map((d) => (
            <Pill
              key={`d-${d}`}
              text={DISEASE_LABELS[d] ?? d}
              tone="disease"
            />
          ))}
          {studyTypes.map((t) => (
            <Pill
              key={`t-${t}`}
              text={STUDY_TYPE_LABELS[t] ?? t}
              tone="study"
            />
          ))}
        </div>
      )}

      {/* 出处 */}
      <div className="mt-3 space-y-1.5 pl-2">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
          <span className="rounded bg-sky-500/10 px-1.5 py-0.5 font-medium text-sky-300/90 ring-1 ring-sky-500/20">
            出处 PubMed
          </span>
          <span className="text-slate-300">{paper.journal || 'Unknown journal'}</span>
          {paper.date && (
            <>
              <span className="text-slate-600">·</span>
              <time dateTime={paper.date}>{paper.date}</time>
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {paper.pmid && (
            <a
              href={paper.pubmedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-sky-400/90 underline-offset-2 hover:underline"
            >
              PMID {paper.pmid}
            </a>
          )}
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-full px-2.5 py-0.5 text-[11px] text-slate-300 ring-1 ring-slate-600/80 transition-colors hover:bg-slate-800 hover:text-white"
          >
            {copied ? '已复制出处' : '复制出处'}
          </button>
        </div>
      </div>

      {paper.abstract && (
        <p className="mt-3 line-clamp-4 pl-2 text-sm leading-relaxed text-slate-400">
          {paper.abstract}
        </p>
      )}
    </article>
  )
}

export function TrialCard({
  trial,
  favorited,
  onToggleFavorite,
}: TrialCardProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const ok = await copyText(formatTrialCitation(trial))
    if (ok) {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    }
  }

  return (
    <article className="paper-card relative overflow-hidden rounded-2xl border border-slate-700/60 bg-[#1e293b]/90 p-4 backdrop-blur-sm">
      <div className="absolute inset-y-3 left-0 w-1 rounded-r-full bg-gradient-to-b from-emerald-400/80 to-emerald-600/20" />

      <div className="flex items-start gap-2 pl-2">
        <a
          href={trial.url}
          target="_blank"
          rel="noopener noreferrer"
          className="min-w-0 flex-1 text-[15px] font-semibold leading-snug text-slate-50 hover:text-sky-300"
        >
          {trial.title}
        </a>
        <button
          type="button"
          onClick={onToggleFavorite}
          aria-label={favorited ? '取消收藏' : '收藏试验'}
          aria-pressed={favorited}
          className={[
            'shrink-0 rounded-full p-1.5 transition-colors',
            favorited
              ? 'text-amber-300 bg-amber-400/10 ring-1 ring-amber-400/30'
              : 'text-slate-500 hover:text-amber-300 hover:bg-slate-800',
          ].join(' ')}
        >
          <StarIcon filled={favorited} />
        </button>
      </div>

      <div className="mt-2.5 flex flex-wrap gap-1.5 pl-2">
        {trial.category && (
          <Pill
            text={DISEASE_LABELS[trial.category] ?? trial.category}
            tone="disease"
          />
        )}
        <Pill text="临床试验" tone="study" />
      </div>

      <div className="mt-3 space-y-1.5 pl-2">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
          <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 font-medium text-emerald-300/90 ring-1 ring-emerald-500/20">
            出处 ClinicalTrials.gov
          </span>
          <span>{trial.status || '—'}</span>
          <span className="text-slate-600">·</span>
          <span>{trial.phase || 'N/A'}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <a
            href={trial.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-sky-400/90 underline-offset-2 hover:underline"
          >
            {trial.nctId}
          </a>
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-full px-2.5 py-0.5 text-[11px] text-slate-300 ring-1 ring-slate-600/80 transition-colors hover:bg-slate-800 hover:text-white"
          >
            {copied ? '已复制出处' : '复制出处'}
          </button>
        </div>
      </div>
    </article>
  )
}
