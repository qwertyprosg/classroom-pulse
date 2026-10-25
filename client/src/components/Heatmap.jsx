export default function Heatmap({ data }) {
  if (!data.length) return (
    <div className="text-white/25 text-xs text-center py-4">
      Heatmap will populate as the session progresses...
    </div>
  )

  const maxHeight = 52

  function barColor(lost) {
    if (lost < 15) return '#22c55e'
    if (lost < 30) return '#f59e0b'
    return '#ef4444'
  }

  return (
    <div>
      <div className="flex items-end gap-0.5 h-16 overflow-x-auto pb-1">
        {data.map((d, i) => (
          <div
            key={i}
            className="group relative flex-shrink-0"
            style={{ width: Math.max(6, Math.min(14, 800 / data.length)), height: maxHeight }}
          >
            <div
              className="absolute bottom-0 w-full rounded-t transition-all hover:opacity-70 cursor-pointer"
              style={{
                height: Math.max(4, (d.lost / 100) * maxHeight),
                background: barColor(d.lost),
              }}
            />
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-[#1a1a28] border border-white/10 rounded-lg px-2 py-1 text-xs whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-xl">
              {d.time} — {d.lost}% lost
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-5 mt-2 justify-center">
        {[['#22c55e', 'Low (<15%)'], ['#f59e0b', 'Medium (15-30%)'], ['#ef4444', 'High (>30%)']].map(([c, l]) => (
          <div key={l} className="flex items-center gap-1.5 text-xs text-white/40">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: c }} />
            {l}
          </div>
        ))}
      </div>
    </div>
  )
}
