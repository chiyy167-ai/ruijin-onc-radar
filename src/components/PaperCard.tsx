import {
  DISEASE_LABELS,
  STUDY_TYPE_LABELS,
  type Paper,
  type Trial,
} from '../types'

interface PaperCardProps {
  paper: Paper
}

interface TrialCardProps {
  trial: Trial
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

export function PaperCard({ paper }: PaperCardProps) {
  const diseases = paper.categories?.disease ?? []
  const studyTypes = paper.categories?.studyType ?? []

  return (
    <article className="paper-card relative overflow-hidden rounded-2xl border border-slate-700/60 bg-[#1e293b]/90 p-4 backdrop-blur-sm">
      <div className="absolute inset-y-3 left-0 w-1 rounded-r-full bg-gradient-to-b from-sky-400/80 to-sky-600/20" />
      <a
        href={paper.pubmedUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block pl-2 text-[15px] font-semibold leading-snug text-slate-50 hover:text-sky-300"
      >
        {paper.title}
      </a>

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

      <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 pl-2 text-xs text-slate-400">
        <span className="text-slate-300">{paper.journal || 'Unknown journal'}</span>
        <span className="text-slate-600">·</span>
        <time dateTime={paper.date}>{paper.date || '—'}</time>
        {paper.pmid && (
          <>
            <span className="text-slate-600">·</span>
            <span>PMID {paper.pmid}</span>
          </>
        )}
      </div>

      {paper.abstract && (
        <p className="mt-3 line-clamp-4 pl-2 text-sm leading-relaxed text-slate-400">
          {paper.abstract}
        </p>
      )}
    </article>
  )
}

export function TrialCard({ trial }: TrialCardProps) {
  return (
    <article className="paper-card relative overflow-hidden rounded-2xl border border-slate-700/60 bg-[#1e293b]/90 p-4 backdrop-blur-sm">
      <div className="absolute inset-y-3 left-0 w-1 rounded-r-full bg-gradient-to-b from-emerald-400/80 to-emerald-600/20" />
      <a
        href={trial.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block pl-2 text-[15px] font-semibold leading-snug text-slate-50 hover:text-sky-300"
      >
        {trial.title}
      </a>
      <div className="mt-2.5 flex flex-wrap gap-1.5 pl-2">
        {trial.category && (
          <Pill
            text={DISEASE_LABELS[trial.category] ?? trial.category}
            tone="disease"
          />
        )}
        <Pill text="临床试验" tone="study" />
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 pl-2 text-xs text-slate-400">
        <span className="font-mono text-slate-300">{trial.nctId}</span>
        <span className="text-slate-600">·</span>
        <span>{trial.status || '—'}</span>
        <span className="text-slate-600">·</span>
        <span>{trial.phase || 'N/A'}</span>
      </div>
    </article>
  )
}
