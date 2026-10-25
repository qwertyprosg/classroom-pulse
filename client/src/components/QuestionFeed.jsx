export default function QuestionFeed({ questions }) {
  const sorted = [...questions].sort((a, b) => b.upvotes - a.upvotes)

  if (!sorted.length) return (
    <div className="flex flex-col items-center justify-center py-10 text-white/25">
      <div className="text-3xl mb-2">💬</div>
      <p className="text-sm text-center">No questions yet.</p>
    </div>
  )

  return (
    <div className="flex flex-col gap-2">
      {sorted.map((q, i) => (
        <div key={q.id} className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-xl p-3 animate-fade-in">
          <div className="w-7 h-7 rounded-full bg-purple-500/20 text-accent-purple text-xs font-black flex items-center justify-center flex-shrink-0">
            {i + 1}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm leading-relaxed text-white/90">{q.text}</p>
            <p className="text-xs text-white/30 mt-1">{q.author}</p>
          </div>
          <div className="flex items-center gap-1 text-accent-purple text-xs font-bold flex-shrink-0">
            <svg className="w-3 h-3 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15"/></svg>
            {q.upvotes}
          </div>
        </div>
      ))}
    </div>
  )
}
