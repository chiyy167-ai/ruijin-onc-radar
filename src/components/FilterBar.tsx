import { DISEASE_OPTIONS, STUDY_TYPE_OPTIONS } from '../types'

interface FilterBarProps {
  selectedDisease: string | null
  selectedType: string | null
  onDiseaseChange: (key: string | null) => void
  onTypeChange: (key: string | null) => void
}

function ChipRow({
  label,
  options,
  selected,
  onChange,
  activeClass,
}: {
  label: string
  options: { key: string | null; label: string }[]
  selected: string | null
  onChange: (key: string | null) => void
  activeClass: string
}) {
  return (
    <div className="mb-2.5 last:mb-0">
      <div className="mb-1.5 px-1 text-[11px] font-medium tracking-[0.16em] text-slate-500">
        {label}
      </div>
      <div className="chip-scroll flex gap-2 overflow-x-auto pb-0.5">
        {options.map((opt) => {
          const active = selected === opt.key
          return (
            <button
              key={opt.label}
              type="button"
              onClick={() => onChange(opt.key)}
              className={[
                'shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all',
                'border focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60',
                active
                  ? `${activeClass} shadow-sm`
                  : 'border-slate-600/70 bg-slate-800/50 text-slate-300 active:scale-[0.98] active:bg-slate-700',
              ].join(' ')}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function FilterBar({
  selectedDisease,
  selectedType,
  onDiseaseChange,
  onTypeChange,
}: FilterBarProps) {
  return (
    <div className="sticky top-0 z-30 border-b border-slate-700/70 bg-[#0b1220]/88 backdrop-blur-xl safe-top">
      <div className="mx-auto max-w-3xl px-3 py-3">
        <ChipRow
          label="疾病部位"
          options={DISEASE_OPTIONS}
          selected={selectedDisease}
          onChange={onDiseaseChange}
          activeClass="border-sky-400 bg-sky-500/20 text-sky-300"
        />
        <ChipRow
          label="研究类型"
          options={STUDY_TYPE_OPTIONS}
          selected={selectedType}
          onChange={onTypeChange}
          activeClass="border-emerald-400 bg-emerald-500/20 text-emerald-300"
        />
      </div>
    </div>
  )
}
