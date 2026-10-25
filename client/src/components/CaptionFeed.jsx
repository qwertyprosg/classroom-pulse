import { useEffect, useRef } from 'react'

function formatTime(ts) {
  const d = new Date(ts)
  return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function CaptionFeed({ captions, isRecording, onToggle }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [captions])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isRecording && <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
          <span className="text-xs text-white/50 font-medium">
            {isRecording ? 'Recording...' : 'Captions paused'}
          </span>
        </div>
        <button
          onClick={onToggle}
          className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
            isRecording
              ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
              : 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30'
          }`}
        >
          {isRecording ? '⏹ Stop' : '🎙 Start Captions'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 text-xs font-mono">
        {!captions.length ? (
          <div className="text-white/25 text-center py-6 font-sans text-sm">
            {isRecording ? 'Listening...' : 'Start captions to see live transcript'}
          </div>
        ) : captions.map((c, i) => (
          <div key={i} className="flex gap-2 group">
            <span className="text-white/25 flex-shrink-0 pt-0.5">{formatTime(c.timestamp)}</span>
            <span className="text-white/70 leading-relaxed">{c.text}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
