interface LoadingScreenProps {
  visible: boolean
}

export default function LoadingScreen({ visible }: LoadingScreenProps) {
  return (
    <div
      className={[
        'fixed inset-0 z-50 flex flex-col items-center justify-center',
        'bg-[#0b1220] transition-opacity duration-500',
        visible ? 'opacity-100' : 'pointer-events-none opacity-0',
      ].join(' ')}
      aria-busy={visible}
      aria-live="polite"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute -right-16 bottom-1/4 h-64 w-64 rounded-full bg-rose-700/15 blur-3xl" />
        <div className="mesh-grid absolute inset-0 opacity-40" />
      </div>

      <div className="relative mb-8">
        {/* 雷达扫描环 */}
        <div className="radar-ring absolute inset-[-18px] rounded-full" />
        <div className="radar-ring radar-ring-delay absolute inset-[-18px] rounded-full" />
        <div className="radar-sweep absolute inset-[-18px] rounded-full" />

        <div className="relative flex h-[104px] w-[104px] items-center justify-center rounded-full bg-white/95 p-2 shadow-[0_0_40px_rgba(185,28,28,0.25)] ring-1 ring-amber-200/40">
          <img
            src={`${import.meta.env.BASE_URL}logo-ruijin.svg`}
            alt="瑞金医院"
            className="h-full w-full object-contain"
            draggable={false}
          />
        </div>
      </div>

      <h1 className="relative text-center text-lg font-semibold tracking-wide text-white sm:text-xl">
        瑞金肿瘤内科科研雷达
      </h1>
      <p className="relative mt-2 text-center text-xs tracking-[0.2em] text-sky-300/80">
        RUIJIN ONCOLOGY RESEARCH RADAR
      </p>

      <div className="relative mt-8 flex flex-col items-center gap-3">
        <div className="loading-dots flex items-center gap-1.5" aria-hidden>
          <span />
          <span />
          <span />
        </div>
        <p className="text-sm text-slate-400">正在加载最新科研数据…</p>
        <p className="text-[11px] text-slate-600">
          上海交通大学医学院附属瑞金医院 · 肿瘤内科
        </p>
      </div>
    </div>
  )
}
