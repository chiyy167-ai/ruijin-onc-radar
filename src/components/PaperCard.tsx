import { useState } from 'react'
import {
  formatPaperCitation,
  formatTrialCitation,
} from '../lib/favorites'
import { getCachedTranslation, translateToZh } from '../lib/translate'
import {
  DISEASE_LABELS,
  STUDY_TYPE_LABELS,
  type Paper,
  type Trial,
} from '../types'

interface PaperCardProps {
  paper: Paper
  bookmarked: boolean
  isRead: boolean
  onToggleBookmark: () => void
  onToggleRead: () => void
}

interface TrialCardProps {
  trial: Trial
  bookmarked: boolean
  isRead: boolean
  onToggleBookmark: () => void
  onToggleRead: () => void
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

function BookmarkIcon({ filled }: { filled: boolean }) {
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
        d="M6 4.5h12a1 1 0 011 1V20l-7-3.5L5 20V5.5a1 1 0 011-1z"
      />
    </svg>
  )
}

function TranslateIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 8h7M8.5 8c0 4.5-2 7.5-5 9m9.5-9h7M16 8c0 4.5 2 7.5 5 9M9 20l3-12h.5l3 12M10.5 16h4"
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

async function shareContent(title: string, text: string, url: string) {
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url })
      return true
    } catch {
      /* user cancelled */
    }
  }
  return copyText(`${title}\n${url}`)
}

export function PaperCard({
  paper,
  bookmarked,
  isRead,
  onToggleBookmark,
  onToggleRead,
}: PaperCardProps) {
  const diseases = paper.categories?.disease ?? []
  const studyTypes = paper.categories?.studyType ?? []
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [shared, setShared] = useState(false)
  const [showZh, setShowZh] = useState(false)
  const [zhText, setZhText] = useState<string | null>(() =>
    paper.abstract ? getCachedTranslation(paper.abstract) : null,
  )
  const [translating, setTranslating] = useState(false)
  const [translateErr, setTranslateErr] = useState<string | null>(null)

  const handleCopy = async () => {
    const ok = await copyText(formatPaperCitation(paper))
    if (ok) {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    }
  }

  const handleShare = async () => {
    const ok = await shareContent(
      paper.title,
      formatPaperCitation(paper),
      paper.pubmedUrl,
    )
    if (ok) {
      setShared(true)
      window.setTimeout(() => setShared(false), 1600)
    }
  }

  const handleTranslate = async () => {
    if (!paper.abstract) return
    // 已有译文：切换中英文
    if (zhText) {
      setShowZh((v) => !v)
      setTranslateErr(null)
      return
    }
    setTranslating(true)
    setTranslateErr(null)
    setExpanded(true)
    try {
      const zh = await translateToZh(paper.abstract)
      setZhText(zh)
      setShowZh(true)
    } catch (e) {
      setTranslateErr(e instanceof Error ? e.message : '翻译失败')
    } finally {
      setTranslating(false)
    }
  }

  const abstractDisplay = showZh && zhText ? zhText : paper.abstract

  return (
    <article
      className={[
        'paper-card relative overflow-hidden rounded-2xl border bg-[#1e293b]/90 p-4 backdrop-blur-sm',
        isRead ? 'border-slate-700/40 opacity-80' : 'border-slate-700/60',
      ].join(' ')}
    >
      <div className="absolute inset-y-3 left-0 w-1 rounded-r-full bg-gradient-to-b from-sky-400/80 to-sky-600/20" />

      <div className="flex items-start gap-2 pl-2">
        <a
          href={paper.pubmedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="min-w-0 flex-1 text-[15px] font-semibold leading-snug text-slate-50 hover:text-sky-300"
        >
          {paper.title}
          {isRead && (
            <span className="ml-2 align-middle text-[11px] font-normal text-slate-500">
              已读
            </span>
          )}
        </a>
        <button
          type="button"
          onClick={onToggleBookmark}
          aria-label={bookmarked ? '取消书签' : '加入书签'}
          aria-pressed={bookmarked}
          className={[
            'shrink-0 rounded-full p-1.5 transition-colors',
            bookmarked
              ? 'bg-amber-400/10 text-amber-300 ring-1 ring-amber-400/30'
              : 'text-slate-500 hover:bg-slate-800 hover:text-amber-300',
          ].join(' ')}
        >
          <BookmarkIcon filled={bookmarked} />
        </button>
      </div>

      {(diseases.length > 0 || studyTypes.length > 0) && (
        <div className="mt-2.5 flex flex-wrap gap-1.5 pl-2">
          {diseases.map((d) => (
            <Pill key={`d-${d}`} text={DISEASE_LABELS[d] ?? d} tone="disease" />
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

      <div className="mt-3 space-y-1.5 pl-2">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
          <span className="rounded bg-sky-500/10 px-1.5 py-0.5 font-medium text-sky-300/90 ring-1 ring-sky-500/20">
            出处 PubMed
          </span>
          <span className="text-slate-300">
            {paper.journal || 'Unknown journal'}
          </span>
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
            className="rounded-full px-2.5 py-0.5 text-[11px] text-slate-300 ring-1 ring-slate-600/80 hover:bg-slate-800"
          >
            {copied ? '已复制' : '复制出处'}
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="rounded-full px-2.5 py-0.5 text-[11px] text-slate-300 ring-1 ring-slate-600/80 hover:bg-slate-800"
          >
            {shared ? '已分享/复制' : '分享'}
          </button>
          <button
            type="button"
            onClick={onToggleRead}
            className="rounded-full px-2.5 py-0.5 text-[11px] text-slate-300 ring-1 ring-slate-600/80 hover:bg-slate-800"
          >
            {isRead ? '标为未读' : '标为已读'}
          </button>
        </div>
      </div>

      {paper.abstract && (
        <div className="mt-3 pl-2">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleTranslate}
              disabled={translating}
              aria-label={showZh ? '显示英文原文' : '翻译成中文'}
              className={[
                'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition',
                'ring-1 disabled:opacity-60',
                showZh
                  ? 'bg-violet-500/15 text-violet-300 ring-violet-400/40'
                  : 'text-slate-300 ring-slate-600/80 hover:bg-slate-800',
              ].join(' ')}
            >
              <TranslateIcon />
              {translating
                ? '翻译中…'
                : showZh
                  ? '看原文'
                  : zhText
                    ? '看中文'
                    : '译中文'}
            </button>
            {showZh && (
              <span className="text-[10px] text-slate-500">
                机器翻译，仅供参考
              </span>
            )}
          </div>
          <p
            className={[
              'text-sm leading-relaxed',
              showZh ? 'text-slate-300' : 'text-slate-400',
              expanded ? '' : 'line-clamp-3',
            ].join(' ')}
          >
            {abstractDisplay}
          </p>
          {translateErr && (
            <p className="mt-1.5 text-xs text-rose-300">{translateErr}</p>
          )}
          {(paper.abstract.length > 120 || (zhText && zhText.length > 80)) && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-1.5 text-xs text-sky-400/90"
            >
              {expanded ? '收起摘要' : '展开摘要'}
            </button>
          )}
        </div>
      )}
    </article>
  )
}

export function TrialCard({
  trial,
  bookmarked,
  isRead,
  onToggleBookmark,
  onToggleRead,
}: TrialCardProps) {
  const [copied, setCopied] = useState(false)
  const [shared, setShared] = useState(false)

  const handleCopy = async () => {
    const ok = await copyText(formatTrialCitation(trial))
    if (ok) {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    }
  }

  const handleShare = async () => {
    const ok = await shareContent(
      trial.title,
      formatTrialCitation(trial),
      trial.url,
    )
    if (ok) {
      setShared(true)
      window.setTimeout(() => setShared(false), 1600)
    }
  }

  return (
    <article
      className={[
        'paper-card relative overflow-hidden rounded-2xl border bg-[#1e293b]/90 p-4 backdrop-blur-sm',
        isRead ? 'border-slate-700/40 opacity-80' : 'border-slate-700/60',
      ].join(' ')}
    >
      <div className="absolute inset-y-3 left-0 w-1 rounded-r-full bg-gradient-to-b from-emerald-400/80 to-emerald-600/20" />

      <div className="flex items-start gap-2 pl-2">
        <a
          href={trial.url}
          target="_blank"
          rel="noopener noreferrer"
          className="min-w-0 flex-1 text-[15px] font-semibold leading-snug text-slate-50 hover:text-sky-300"
        >
          {trial.title}
          {isRead && (
            <span className="ml-2 align-middle text-[11px] font-normal text-slate-500">
              已读
            </span>
          )}
        </a>
        <button
          type="button"
          onClick={onToggleBookmark}
          aria-label={bookmarked ? '取消书签' : '加入书签'}
          aria-pressed={bookmarked}
          className={[
            'shrink-0 rounded-full p-1.5 transition-colors',
            bookmarked
              ? 'bg-amber-400/10 text-amber-300 ring-1 ring-amber-400/30'
              : 'text-slate-500 hover:bg-slate-800 hover:text-amber-300',
          ].join(' ')}
        >
          <BookmarkIcon filled={bookmarked} />
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
            className="rounded-full px-2.5 py-0.5 text-[11px] text-slate-300 ring-1 ring-slate-600/80 hover:bg-slate-800"
          >
            {copied ? '已复制' : '复制出处'}
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="rounded-full px-2.5 py-0.5 text-[11px] text-slate-300 ring-1 ring-slate-600/80 hover:bg-slate-800"
          >
            {shared ? '已分享/复制' : '分享'}
          </button>
          <button
            type="button"
            onClick={onToggleRead}
            className="rounded-full px-2.5 py-0.5 text-[11px] text-slate-300 ring-1 ring-slate-600/80 hover:bg-slate-800"
          >
            {isRead ? '标为未读' : '标为已读'}
          </button>
        </div>
      </div>
    </article>
  )
}
