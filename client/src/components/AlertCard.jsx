import { useState } from 'react'

export default function AlertCard({ alert }) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="rounded-xl border-l-4 border-amber-500 bg-amber-500/8 border border-amber-500/20 p-4 animate-slide-right">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-amber-400 font-bold text-sm">⚠️ {alert.timeStr}</span>
          <span className="bg-red-500/20 text-red-400 text-xs font-bold px-2 py-0.5 rounded-full">
            {alert.lostPercent}% Lost
          </span>
          {alert.questionSpike && (
            <span className="bg-purple-500/20 text-purple-400 text-xs font-bold px-2 py-0.5 rounded-full">
              Question spike
            </span>
          )}
          {alert.llmPending && (
            <span className="text-white/30 text-xs flex items-center gap-1">
              <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
              Analyzing...
            </span>
          )}
        </div>
        <button onClick={() => setExpanded(e => !e)} className="text-white/30 hover:text-white transition-colors text-lg leading-none flex-shrink-0">
          {expanded ? '−' : '+'}
        </button>
      </div>

      {expanded && !alert.llmPending && (
        <div className="space-y-2.5 mt-3">
          {alert.likelyTopic && (
            <div>
              <p className="text-xs text-white/40 font-semibold uppercase tracking-wide mb-1">📍 Likely Topic</p>
              <p className="text-sm text-white/90 font-medium">{alert.likelyTopic}</p>
            </div>
          )}
          {alert.studentDoubts?.length > 0 && (
            <div>
              <p className="text-xs text-white/40 font-semibold uppercase tracking-wide mb-1">❓ Students probably wondering</p>
              <ul className="space-y-1">
                {alert.studentDoubts.map((d, i) => (
                  <li key={i} className="text-sm text-white/70 flex gap-2">
                    <span className="text-white/30 flex-shrink-0">{i + 1}.</span>
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {alert.suggestion && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
              <p className="text-xs text-amber-400 font-semibold uppercase tracking-wide mb-1">💡 Suggestion</p>
              <p className="text-sm text-amber-200/90 leading-relaxed">{alert.suggestion}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
