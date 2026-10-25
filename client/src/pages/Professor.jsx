import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import socket from '../lib/socket.js'
import { useAuth } from '../context/AuthContext.jsx'
import LiveChart from '../components/LiveChart.jsx'
import Heatmap from '../components/Heatmap.jsx'
import AlertCard from '../components/AlertCard.jsx'
import QuestionFeed from '../components/QuestionFeed.jsx'
import CaptionFeed from '../components/CaptionFeed.jsx'
import SummaryModal from '../components/SummaryModal.jsx'
import useSpeechRecognition from '../hooks/useSpeechRecognition.js'

export default function Professor() {
  const { user, logout } = useAuth()
  const [phase, setPhase] = useState('create') // create | dashboard
  const [roomCode, setRoomCode] = useState('')
  const [creating, setCreating] = useState(false)
  const [studentCount, setStudentCount] = useState(0)
  const [stats, setStats] = useState({ following: 0, lost: 0, ahead: 0 })
  const [chartData, setChartData] = useState([])
  const [heatData, setHeatData] = useState([])
  const [questions, setQuestions] = useState([])
  const [alerts, setAlerts] = useState([])
  const [anonMode, setAnonMode] = useState(true)
  const [captions, setCaptions] = useState([])
  const [isRecording, setIsRecording] = useState(false)
  const [summary, setSummary] = useState(null)
  const [showSummary, setShowSummary] = useState(false)
  const [activeTab, setActiveTab] = useState('chart') // chart | captions
  const [toasts, setToasts] = useState([])
  const sessionStartRef = useRef(Date.now())

  const toast = (msg, type = 'info') => {
    const id = Date.now()
    setToasts(t => [...t, { id, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500)
  }

  // Speech recognition hook
  const handleCaption = useCallback(chunk => {
    setCaptions(prev => [...prev, chunk])
  }, [])
  useSpeechRecognition({ isRecording, onChunk: handleCaption })

  useEffect(() => {
    socket.on('comprehension-update', data => {
      setStats({ following: data.following, lost: data.lost, ahead: data.ahead })
      setStudentCount(data.studentCount)
      const elapsed = data.timestamp - sessionStartRef.current
      const mins = Math.floor(elapsed / 60000)
      const secs = Math.floor((elapsed % 60000) / 1000)
      const time = `${mins}:${secs.toString().padStart(2, '0')}`
      setChartData(prev => {
        const next = [...prev, { time, following: data.following, lost: data.lost, ahead: data.ahead }]
        return next.length > 120 ? next.slice(-120) : next
      })
      setHeatData(prev => {
        const next = [...prev, { time, lost: data.lost, timestamp: data.timestamp }]
        return next.length > 180 ? next.slice(-180) : next
      })
    })
    socket.on('student-joined', d => { setStudentCount(d.studentCount); toast(`Student joined (${d.studentCount} total)`) })
    socket.on('student-left', d => setStudentCount(d.studentCount))
    socket.on('new-question', q => { setQuestions(prev => [...prev, q]); toast('New question received', 'purple') })
    socket.on('question-upvoted', upd => setQuestions(prev => prev.map(q => q.id === upd.id ? { ...q, upvotes: upd.upvotes } : q)))
    socket.on('pivot-alert', a => { setAlerts(prev => [a, ...prev]); toast('⚠️ AI Alert fired!', 'warning') })
    socket.on('pivot-alert-enriched', enriched => {
      setAlerts(prev => prev.map(a => a.id === enriched.id ? enriched : a))
    })
    socket.on('caption-chunk', chunk => setCaptions(prev => [...prev, chunk]))
    return () => {
      ['comprehension-update','student-joined','student-left','new-question','question-upvoted',
       'pivot-alert','pivot-alert-enriched','caption-chunk'].forEach(e => socket.off(e))
    }
  }, [])

  const handleCreate = () => {
    setCreating(true)
    socket.emit('create-session', res => {
      setCreating(false)
      if (res.success) {
        setRoomCode(res.roomCode)
        sessionStartRef.current = Date.now()
        setPhase('dashboard')
      }
    })
  }

  const handleToggleAnon = () => {
    const next = !anonMode
    setAnonMode(next)
    socket.emit('toggle-anonymous', { enabled: next }, () => {})
  }

  const handleEndSession = () => {
    if (!confirm('End this session? This cannot be undone.')) return
    if (isRecording) setIsRecording(false)
    socket.emit('end-session', res => {
      if (res.success) { setSummary(res.summary); setShowSummary(true) }
    })
  }

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode)
    toast('Room code copied!')
  }

  if (phase === 'create') return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-6">
      <div className="w-full max-w-sm text-center animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <Link to="/" className="text-white/40 text-sm hover:text-white/70 transition-colors">← Back</Link>
          {user ? (
            <button
              onClick={logout}
              className="text-xs text-red-400/80 hover:text-red-300 transition-colors"
            >
              Sign Out
            </button>
          ) : (
            <Link to="/login/teacher" className="text-xs text-purple-400 hover:text-purple-300 transition-colors">
              Teacher Login →
            </Link>
          )}
        </div>

        {user && (
          <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 mb-6 text-xs text-purple-200">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
              <span>Signed in: <strong>{user.id}</strong></span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/25 text-purple-300 uppercase tracking-wider font-bold">Faculty</span>
          </div>
        )}

        <div className="text-5xl mb-4">👨‍🏫</div>
        <h1 className="text-3xl font-black mb-2">Create a Session</h1>
        <p className="text-white/40 text-sm mb-10 leading-relaxed">Start a live classroom session and share the room code with your students</p>
        <button
          onClick={handleCreate} disabled={creating}
          className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-4 rounded-xl disabled:opacity-40 hover:shadow-[0_8px_25px_rgba(168,85,247,0.4)] hover:-translate-y-0.5 transition-all"
        >
          {creating ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
              Creating...
            </span>
          ) : 'Create Session'}
        </button>
      </div>
    </div>
  )

  // ── Dashboard ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Toasts */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className={`px-4 py-2.5 rounded-xl text-sm font-medium border shadow-xl animate-slide-right pointer-events-none max-w-xs ${
            t.type === 'error' ? 'bg-red-500/90 border-red-400 text-white' :
            t.type === 'warning' ? 'bg-amber-500/90 border-amber-400 text-black' :
            t.type === 'green' ? 'bg-green-500/90 border-green-400 text-white' :
            t.type === 'purple' ? 'bg-purple-500/90 border-purple-400 text-white' :
            'bg-[#1e1e2e] border-white/20 text-white'
          }`}>{t.msg}</div>
        ))}
      </div>

      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3 bg-[#13131e] border-b border-white/10 sticky top-0 z-40 flex-wrap gap-3">
        <h1 className="font-black text-lg whitespace-nowrap">
          🎓 Classroom <span className="bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">Pulse</span>
        </h1>

        {/* Room code */}
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
          <div className="w-2 h-2 rounded-full bg-accent-green pulse-dot" />
          <span className="font-black tracking-[0.2em] text-sm">{roomCode}</span>
          <button onClick={copyCode} className="text-white/40 hover:text-white transition-colors ml-1">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
          </button>
          <span className="text-white/30 text-xs border-l border-white/10 pl-2 ml-1">
            Share: <code className="text-white/60">localhost:5173/student?room={roomCode}</code>
          </span>
        </div>

        <div className="flex items-center gap-3">
          {user && (
            <div className="hidden md:flex items-center gap-1.5 text-xs font-semibold text-purple-300 bg-purple-500/10 border border-purple-500/20 rounded-xl px-3 py-2">
              <span>👨‍🏫 {user.id}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-xs font-semibold text-white/50 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
            </svg>
            {studentCount} students
          </div>
          <button onClick={handleEndSession} className="bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white text-xs font-bold px-4 py-2 rounded-xl transition-all">
            End Session
          </button>
        </div>
      </header>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-[#11111c] border-b border-white/10">
        {[
          { emoji: '🟢', label: 'Following', value: stats.following, color: 'text-accent-green', glow: 'shadow-[0_0_12px_rgba(34,197,94,0.15)]' },
          { emoji: '🔴', label: 'Lost',      value: stats.lost,      color: 'text-accent-red',   glow: 'shadow-[0_0_12px_rgba(239,68,68,0.15)]' },
          { emoji: '⚡', label: 'Ahead',     value: stats.ahead,     color: 'text-accent-amber', glow: 'shadow-[0_0_12px_rgba(245,158,11,0.15)]' },
          { emoji: '❓', label: 'Questions', value: questions.length, color: 'text-accent-purple', glow: 'shadow-[0_0_12px_rgba(168,85,247,0.15)]' },
        ].map(s => (
          <div key={s.label} className={`flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3 ${s.glow}`}>
            <span className="text-2xl">{s.emoji}</span>
            <div>
              <div className={`text-2xl font-black ${s.color}`}>{s.value}{s.label !== 'Questions' ? '%' : ''}</div>
              <div className="text-xs text-white/40 font-semibold uppercase tracking-wide">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main content */}
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-4 p-4 min-h-0">

        {/* LEFT: Tabs (Chart / MindMap / Captions) + Heatmap */}
        <div className="flex flex-col gap-4 min-h-0">

          {/* Tab bar */}
          <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
            {[
              { key: 'chart', label: '📊 Live Chart' },
              { key: 'captions', label: '🎙 Captions' },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === t.key ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="bg-[#13131e] border border-white/10 rounded-2xl p-4 flex-1 min-h-0" style={{ minHeight: 360 }}>
            {activeTab === 'chart' && (
              <div className="h-full" style={{ minHeight: 320 }}>
                <LiveChart data={chartData} />
              </div>
            )}

            {activeTab === 'captions' && (
              <div className="h-full flex flex-col" style={{ minHeight: 320 }}>
                {!window.SpeechRecognition && !window.webkitSpeechRecognition ? (
                  <div className="text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-sm mb-4">
                    ⚠️ Web Speech API is not supported in this browser. Use Chrome or Edge for live captions.
                  </div>
                ) : null}
                <CaptionFeed
                  captions={captions}
                  isRecording={isRecording}
                  onToggle={() => setIsRecording(r => !r)}
                />
              </div>
            )}
          </div>

          {/* Heatmap */}
          <div className="bg-[#13131e] border border-white/10 rounded-2xl p-4">
            <h3 className="text-sm font-bold text-white/50 mb-3 uppercase tracking-wider">🔥 Confusion Heatmap</h3>
            <Heatmap data={heatData} />
          </div>
        </div>

        {/* RIGHT: Alerts + Questions */}
        <div className="flex flex-col gap-4 min-h-0">

          {/* Alerts */}
          <div className="bg-[#13131e] border border-white/10 rounded-2xl p-4 flex flex-col" style={{ maxHeight: 420 }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white/60 uppercase tracking-wider">🚨 AI Alerts</h3>
              {alerts.length > 0 && (
                <span className="bg-amber-500/20 text-amber-400 text-xs font-bold px-2 py-0.5 rounded-full">{alerts.length}</span>
              )}
            </div>
            <div className="overflow-y-auto flex-1 flex flex-col gap-2">
              {!alerts.length ? (
                <div className="text-center py-8 text-white/25">
                  <div className="text-3xl mb-2">🤖</div>
                  <p className="text-sm">AI is monitoring comprehension.</p>
                  <p className="text-xs mt-1">Alerts appear when confusion spikes.</p>
                </div>
              ) : alerts.map(a => <AlertCard key={a.id} alert={a} />)}
            </div>
          </div>

          {/* Questions */}
          <div className="bg-[#13131e] border border-white/10 rounded-2xl p-4 flex flex-col flex-1" style={{ maxHeight: 420 }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white/60 uppercase tracking-wider">❓ Questions</h3>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs text-white/40">Anonymous</span>
                <div
                  onClick={handleToggleAnon}
                  className={`relative w-9 h-5 rounded-full transition-all cursor-pointer ${anonMode ? 'bg-purple-600' : 'bg-white/10'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${anonMode ? 'left-[18px]' : 'left-0.5'}`} />
                </div>
              </label>
            </div>
            <div className="overflow-y-auto flex-1">
              <QuestionFeed questions={questions} />
            </div>
          </div>
        </div>
      </div>

      {/* Summary Modal */}
      {showSummary && <SummaryModal summary={summary} onClose={() => setShowSummary(false)} />}
    </div>
  )
}
