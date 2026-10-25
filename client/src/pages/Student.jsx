import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import socket from '../lib/socket.js'
import { useAuth } from '../context/AuthContext.jsx'

export default function Student() {
  const { user, logout } = useAuth()
  const [phase, setPhase] = useState('join') // join | session | ended
  const [roomCode, setRoomCode] = useState('')
  const [name, setName] = useState(user?.name || user?.id || '')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [studentCount, setStudentCount] = useState(0)
  const [currentState, setCurrentState] = useState(null)
  const [questions, setQuestions] = useState([])
  const [questionText, setQuestionText] = useState('')
  const [panelOpen, setPanelOpen] = useState(false)
  const [captionsOpen, setCaptionsOpen] = useState(false)
  const [anonMode, setAnonMode] = useState(true)
  const [captions, setCaptions] = useState([])
  const bottomRef = useRef(null)

  useEffect(() => {
    if (user?.id && !name) {
      setName(user.name || user.id)
    }
  }, [user])

  // Pre-fill room code from query string
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const r = params.get('room')
    if (r) setRoomCode(r.toUpperCase())
  }, [])

  // Auto-scroll captions
  useEffect(() => {
    if (captionsOpen) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [captions, captionsOpen])

  useEffect(() => {
    socket.on('student-joined', d => setStudentCount(d.studentCount))
    socket.on('student-left', d => setStudentCount(d.studentCount))
    socket.on('settings-updated', s => setAnonMode(s.anonymousQuestions))
    socket.on('new-question', q => setQuestions(prev => [...prev, { ...q, upvoted: false }]))
    socket.on('question-upvoted', upd => setQuestions(prev => prev.map(q => q.id === upd.id ? { ...q, upvotes: upd.upvotes, upvoted: upd.upvoted ?? q.upvoted } : q)))
    socket.on('caption-chunk', chunk => setCaptions(prev => [...prev, chunk]))
    socket.on('session-ended', () => setPhase('ended'))
    return () => {
      socket.off('student-joined'); socket.off('student-left')
      socket.off('settings-updated'); socket.off('new-question')
      socket.off('question-upvoted'); socket.off('caption-chunk'); socket.off('session-ended')
    }
  }, [])

  const handleJoin = () => {
    if (roomCode.length < 6) return
    setLoading(true); setError('')
    socket.emit('join-session', { roomCode, name: name || null }, res => {
      setLoading(false)
      if (!res.success) return setError(res.error)
      setStudentCount(res.studentCount)
      setAnonMode(res.settings.anonymousQuestions)
      setQuestions((res.questions || []).map(q => ({ ...q, upvoted: false })))
      setCaptions(res.captions || [])
      setPhase('session')
    })
  }

  const handleTap = useCallback(state => {
    const next = currentState === state ? null : state
    setCurrentState(next)
    socket.emit('comprehension-tap', { state: next })
  }, [currentState])

  const handleSubmitQuestion = () => {
    if (!questionText.trim()) return
    socket.emit('submit-question', { text: questionText }, res => {
      if (res?.success) setQuestionText('')
    })
  }

  const handleUpvote = (qId) => {
    socket.emit('upvote-question', { questionId: qId }, () => {})
  }

  const sortedQuestions = [...questions].sort((a, b) => b.upvotes - a.upvotes)

  if (phase === 'ended') return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-6">
      <div className="text-center bg-white/5 border border-white/10 rounded-2xl p-10 max-w-sm animate-fade-in">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-2xl font-bold mb-2">Session Ended</h2>
        <p className="text-white/50 mb-8">Thank you for participating!</p>
        <Link to="/" className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold px-8 py-3 rounded-xl hover:-translate-y-0.5 hover:shadow-lg transition-all">
          Back to Home
        </Link>
      </div>
    </div>
  )

  if (phase === 'join') return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-6">
      <div className="w-full max-w-sm animate-slide-up">
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
            <Link to="/login/student" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
              Student Login →
            </Link>
          )}
        </div>

        {user && (
          <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 mb-6 text-xs text-blue-200">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              <span>Signed in: <strong>{user.id}</strong></span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/25 text-blue-300 uppercase tracking-wider font-bold">Student</span>
          </div>
        )}

        <div className="text-5xl text-center mb-4">🙋</div>
        <h1 className="text-3xl font-black text-center mb-1">Join Session</h1>
        <p className="text-white/40 text-sm text-center mb-8">Enter the room code from your professor</p>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-2 mb-3">
          <input
            className="w-full bg-transparent text-center text-3xl font-black tracking-[0.3em] py-3 text-white placeholder:text-white/20 placeholder:tracking-[0.1em] placeholder:text-xl focus:outline-none uppercase"
            maxLength={6} placeholder="ROOM CODE" value={roomCode}
            onChange={e => { setRoomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')); setError('') }}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
          />
        </div>
        <input
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20 mb-4 transition-colors"
          placeholder="Your name (optional)" value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleJoin()}
        />

        {error && <p className="text-accent-red text-sm text-center mb-3">{error}</p>}

        <button
          onClick={handleJoin}
          disabled={roomCode.length < 6 || loading}
          className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-4 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-[0_8px_25px_rgba(168,85,247,0.4)] hover:-translate-y-0.5 active:translate-y-0 transition-all"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
              Joining...
            </span>
          ) : 'Join Session'}
        </button>
      </div>
    </div>
  )

  // Session screen
  const BTNS = [
    { state: 'following', emoji: '🟢', label: 'Following', activeClass: 'border-accent-green bg-green-500/10 shadow-[0_0_20px_rgba(34,197,94,0.3)]' },
    { state: 'lost',      emoji: '🔴', label: 'Lost',      activeClass: 'border-accent-red  bg-red-500/10  shadow-[0_0_20px_rgba(239,68,68,0.3)]'  },
    { state: 'ahead',     emoji: '⚡', label: 'Ahead',     activeClass: 'border-accent-amber bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.3)]' },
    { state: 'question',  emoji: '❓', label: 'Questions', activeClass: 'border-accent-purple bg-purple-500/10 shadow-[0_0_20px_rgba(168,85,247,0.3)]', isPanel: true },
  ]

  return (
    <div className="min-h-screen bg-surface flex flex-col pb-4">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-accent-green pulse-dot" />
          <span className="font-bold tracking-widest text-white/60 text-sm">{roomCode}</span>
          {user && (
            <span className="hidden sm:inline-block text-[11px] px-2 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 font-medium ml-2">
              👤 {user.id}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setCaptionsOpen(true)} className="flex items-center gap-1 text-white/50 hover:text-white bg-white/5 border border-white/10 px-2 py-1 rounded-lg text-xs font-semibold mr-1">
            🎙 Captions
          </button>
          <div className="flex items-center gap-1 text-accent-blue text-xs font-semibold bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-full">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            {studentCount}
          </div>
        </div>
      </div>

      {/* Comp buttons */}
      <div className="flex-1 flex flex-col justify-center px-4 py-6">
        <p className="text-center text-white/50 text-sm font-medium mb-5">How are you feeling right now?</p>
        <div className="grid grid-cols-2 gap-3">
          {BTNS.map(btn => (
            <button
              key={btn.state}
              onClick={() => btn.isPanel ? setPanelOpen(true) : handleTap(btn.state)}
              className={`relative flex flex-col items-center justify-center gap-2 py-7 rounded-2xl border-2 border-white/10 bg-white/5 font-semibold text-sm transition-all active:scale-95 ${currentState === btn.state ? btn.activeClass : 'hover:border-white/20 hover:bg-white/8'}`}
            >
              <span className={`text-3xl transition-transform ${currentState === btn.state ? 'scale-110 float' : ''}`}>{btn.emoji}</span>
              <span>{btn.label}</span>
              {btn.isPanel && questions.length > 0 && (
                <span className="absolute top-2 right-2 bg-accent-purple text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {questions.length}
                </span>
              )}
            </button>
          ))}
        </div>
        <p className="text-center text-white/25 text-xs mt-4">Your responses are always anonymous</p>
      </div>

      {/* Question bottom sheet */}
      {panelOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setPanelOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-[#1a1a28] border border-white/10 rounded-t-3xl p-5 flex flex-col max-h-[85vh] animate-slide-up">
            <div className="w-10 h-1 bg-white/20 rounded mx-auto mb-4" />
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-bold">Questions</h2>
              <button onClick={() => setPanelOpen(false)} className="text-white/40 hover:text-white text-xl transition-colors">✕</button>
            </div>
            <p className="text-xs text-white/30 mb-4">{anonMode ? 'Anonymous mode — your name won\'t be shown' : 'Named mode — your name will be shown'}</p>

            {/* Input */}
            <div className="flex gap-2 mb-4">
              <textarea
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-white/20 text-white placeholder:text-white/30 transition-colors"
                placeholder="Type your question..." rows={2} maxLength={500} value={questionText}
                onChange={e => setQuestionText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmitQuestion() } }}
              />
              <button
                onClick={handleSubmitQuestion}
                disabled={!questionText.trim()}
                className="w-11 self-end bg-gradient-to-b from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center disabled:opacity-30 transition-all hover:scale-105"
              >
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
            </div>

            {/* List */}
            <div className="overflow-y-auto flex-1 flex flex-col gap-2">
              {sortedQuestions.length === 0 ? (
                <div className="text-center py-10 text-white/30 text-sm">
                  <div className="text-3xl mb-2">🤔</div>No questions yet. Be the first!
                </div>
              ) : sortedQuestions.map(q => (
                <div key={q.id} className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-xl p-3">
                  <div className="flex-1">
                    <p className="text-sm leading-relaxed">{q.text}</p>
                    <p className="text-xs text-white/30 mt-1">{q.author}</p>
                  </div>
                  <button
                    onClick={() => handleUpvote(q.id)}
                    className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-all text-xs font-bold ${q.upvoted ? 'bg-purple-500/20 text-accent-purple' : 'text-white/30 hover:text-white/60'}`}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15"/></svg>
                    {q.upvotes}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Captions bottom sheet */}
      {captionsOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setCaptionsOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-[#1a1a28] border border-white/10 rounded-t-3xl p-5 flex flex-col h-[60vh] animate-slide-up">
            <div className="w-10 h-1 bg-white/20 rounded mx-auto mb-4" />
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">🎙 Live Captions</h2>
              <button onClick={() => setCaptionsOpen(false)} className="text-white/40 hover:text-white text-xl transition-colors">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 text-sm font-mono bg-[#0f0f17] p-4 rounded-xl border border-white/5">
              {!captions.length ? (
                <div className="text-white/30 text-center py-6 font-sans">No captions yet.</div>
              ) : captions.map((c, i) => (
                <div key={i} className="flex gap-2 group">
                  <span className="text-white/25 flex-shrink-0 pt-0.5 mt-0.5 text-xs">{new Date(c.timestamp).toLocaleTimeString('en-US',{hour12:false,hour:'2-digit',minute:'2-digit'})}</span>
                  <span className="text-white/80 leading-relaxed">{c.text}</span>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
