export default function SummaryModal({ summary, onClose }) {
  if (!summary) return null

  const downloadTranscript = () => {
    const lines = (summary.fullTranscript || []).map(c => {
      const d = new Date(c.timestamp)
      const t = d.toLocaleTimeString('en-US', { hour12: false })
      return `[${t}] ${c.text}`
    }).join('\n')
    const blob = new Blob([lines || 'No transcript recorded.'], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'session-transcript.txt'; a.click()
    URL.revokeObjectURL(url)
  }

  const { duration, totalStudents, averageComprehension: avg, peakLostMoments, topQuestions, alerts } = summary

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-[#13131e] border border-white/10 rounded-2xl p-6 max-w-2xl w-full max-h-[88vh] overflow-y-auto shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-black">📋 Session Summary</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all">✕</button>
        </div>

        {/* Overview stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Duration', value: duration, color: 'text-white' },
            { label: 'Students', value: totalStudents, color: 'text-accent-blue' },
            { label: 'Avg Following', value: `${avg.following}%`, color: 'text-accent-green' },
          ].map(s => (
            <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
              <div className="text-xs text-white/40 mt-1 font-medium">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Comprehension breakdown */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Following', value: avg.following, color: '#22c55e', bg: 'bg-green-500/10' },
            { label: 'Lost', value: avg.lost, color: '#ef4444', bg: 'bg-red-500/10' },
            { label: 'Ahead', value: avg.ahead, color: '#f59e0b', bg: 'bg-amber-500/10' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} border border-white/10 rounded-xl p-4 text-center`}>
              <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}%</div>
              <div className="text-xs text-white/40 mt-1">Avg {s.label}</div>
            </div>
          ))}
        </div>

        {/* Peak lost moments */}
        <div className="mb-6">
          <h3 className="text-sm font-bold text-white/50 uppercase tracking-wider mb-3">🔴 Peak Lost Moments</h3>
          {!peakLostMoments?.length ? (
            <p className="text-white/30 text-sm">No significant confusion spikes.</p>
          ) : peakLostMoments.map((p, i) => (
            <div key={i} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-3 mb-2">
              <span className="font-mono font-bold text-sm text-white/70 w-12 flex-shrink-0">{p.time}</span>
              <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-red-500 to-rose-600 rounded-full" style={{ width: `${p.lostPercent}%` }} />
              </div>
              <span className="text-accent-red font-bold text-sm w-10 text-right">{p.lostPercent}%</span>
            </div>
          ))}
        </div>

        {/* AI alerts */}
        {alerts?.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-bold text-white/50 uppercase tracking-wider mb-3">🚨 AI Alerts ({alerts.length})</h3>
            <div className="space-y-2">
              {alerts.map((a, i) => (
                <div key={i} className="bg-amber-500/8 border border-amber-500/20 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-amber-400 font-bold text-xs">{a.timeStr}</span>
                    <span className="bg-red-500/20 text-red-400 text-xs px-2 py-0.5 rounded-full">{a.lostPercent}% Lost</span>
                  </div>
                  {a.likelyTopic && <p className="text-sm text-white/70"><span className="text-white/40">Topic: </span>{a.likelyTopic}</p>}
                  {a.suggestion && <p className="text-xs text-amber-200/70 mt-1">{a.suggestion}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top questions */}
        <div className="mb-6">
          <h3 className="text-sm font-bold text-white/50 uppercase tracking-wider mb-3">❓ Top Questions</h3>
          {!topQuestions?.length ? <p className="text-white/30 text-sm">No questions submitted.</p> : topQuestions.map((q, i) => (
            <div key={i} className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-xl p-3 mb-2">
              <span className="bg-purple-500/20 text-accent-purple text-xs font-bold px-2 py-1 rounded-lg flex-shrink-0">▲ {q.upvotes}</span>
              <span className="text-sm text-white/80">{q.text}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={downloadTranscript} className="flex-1 flex items-center justify-center gap-2 bg-white/5 border border-white/10 text-white/70 hover:text-white hover:border-white/20 py-3 rounded-xl text-sm font-semibold transition-all">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download Transcript
          </button>
          <a href="/" className="flex-1 flex items-center justify-center bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-3 rounded-xl text-sm hover:-translate-y-0.5 hover:shadow-lg transition-all">
            Back to Home
          </a>
        </div>
      </div>
    </div>
  )
}
