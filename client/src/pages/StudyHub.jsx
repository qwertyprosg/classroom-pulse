import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import MindMap from '../components/MindMap.jsx'

export default function StudyHub() {
  // Mind Map State
  const [mindMapTree, setMindMapTree] = useState(null)
  const [pdfUploading, setPdfUploading] = useState(false)
  const [pdfName, setPdfName] = useState(null)
  const fileInputRef = useRef(null)

  // Pomodoro State
  const [pomoMode, setPomoMode] = useState('25/5') // '25/5' | '50/10'
  const [timerType, setTimerType] = useState('work') // 'work' | 'break'
  const [timeLeft, setTimeLeft] = useState(25 * 60)
  const [isRunning, setIsRunning] = useState(false)
  
  // Stats State
  const [studyLogs, setStudyLogs] = useState([])

  useEffect(() => {
    const logs = JSON.parse(localStorage.getItem('studyLogs') || '[]')
    setStudyLogs(logs)
  }, [])

  useEffect(() => {
    if (!isRunning) return
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          handleTimerComplete()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [isRunning, timerType, pomoMode])

  const handleTimerComplete = () => {
    setIsRunning(false)
    if (timerType === 'work') {
      const minsStudied = pomoMode === '25/5' ? 25 : 50
      const newLog = {
        id: Date.now(),
        date: new Date().toISOString().split('T')[0],
        minutes: minsStudied,
        timestamp: Date.now()
      }
      const newLogs = [...studyLogs, newLog]
      setStudyLogs(newLogs)
      localStorage.setItem('studyLogs', JSON.stringify(newLogs))
      
      setTimerType('break')
      setTimeLeft(pomoMode === '25/5' ? 5 * 60 : 10 * 60)
      alert(`Great job! You studied for ${minsStudied} minutes. Time for a break!`)
    } else {
      setTimerType('work')
      setTimeLeft(pomoMode === '25/5' ? 25 * 60 : 50 * 60)
      alert('Break is over! Ready to focus again?')
    }
  }

  const toggleTimer = () => setIsRunning(r => !r)

  const resetTimer = () => {
    setIsRunning(false)
    if (timerType === 'work') {
      setTimeLeft(pomoMode === '25/5' ? 25 * 60 : 50 * 60)
    } else {
      setTimeLeft(pomoMode === '25/5' ? 5 * 60 : 10 * 60)
    }
  }

  const switchMode = (mode) => {
    setIsRunning(false)
    setPomoMode(mode)
    setTimerType('work')
    setTimeLeft(mode === '25/5' ? 25 * 60 : 50 * 60)
  }

  const handlePdfUpload = async (file) => {
    if (!file || !file.name.endsWith('.pdf')) return alert('Please upload a PDF file')
    setPdfUploading(true); setPdfName(file.name)
    const fd = new FormData()
    fd.append('pdf', file)
    try {
      const res = await fetch('/api/upload-pdf', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.success) {
        setMindMapTree(data.mindMap)
      } else alert(data.error || 'PDF parse failed')
    } catch { alert('Upload failed') }
    setPdfUploading(false)
  }

  // Calculate stats
  const todayStr = new Date().toISOString().split('T')[0]
  const todayMins = studyLogs.filter(l => l.date === todayStr).reduce((sum, l) => sum + l.minutes, 0)
  const todayHours = (todayMins / 60).toFixed(1)

  // Chart data
  const getLast7Days = () => {
    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const mins = studyLogs.filter(l => l.date === dateStr).reduce((sum, l) => sum + l.minutes, 0)
      days.push({
        day: d.toLocaleDateString('en-US', { weekday: 'short' }),
        hours: Number((mins / 60).toFixed(1))
      })
    }
    return days
  }
  const chartData = getLast7Days()

  const mins = Math.floor(timeLeft / 60)
  const secs = timeLeft % 60
  const timeDisplay = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`

  return (
    <div className="min-h-screen bg-surface flex flex-col pb-4">
      <header className="flex items-center justify-between px-5 py-3 bg-[#13131e] border-b border-white/10 sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-white/40 hover:text-white transition-colors">← Back</Link>
          <h1 className="font-black text-lg">
            📚 Study <span className="bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">Hub</span>
          </h1>
        </div>
      </header>

      <div className="flex-1 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 p-6">
        
        {/* LEFT COLUMN: Mind Map */}
        <div className="flex flex-col gap-4 min-h-[500px]">
          <div className="bg-[#13131e] border border-white/10 rounded-2xl p-5 flex flex-col flex-1">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
              <h2 className="text-sm font-bold text-white/50 uppercase tracking-wider">🗺️ Auto Mind Map</h2>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={pdfUploading}
                  className="flex items-center gap-2 bg-green-500/15 border border-green-500/30 text-green-400 hover:bg-green-500/25 text-sm font-semibold px-4 py-2 rounded-xl transition-all disabled:opacity-40"
                >
                  {pdfUploading ? (
                    <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Parsing PDF...</>
                  ) : (
                    <><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>Upload PDF Notes</>
                  )}
                </button>
                {pdfName && <span className="text-xs text-white/40 truncate max-w-xs">{pdfName}</span>}
                <input ref={fileInputRef} type="file" accept=".pdf" className="hidden"
                  onChange={e => { const f = e.target.files[0]; if (f) handlePdfUpload(f); e.target.value = '' }} />
              </div>
            </div>
            
            <div className="flex-1 rounded-xl overflow-hidden border border-white/5 bg-[#0f0f17]">
              <MindMap tree={mindMapTree} />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Pomodoro + Stats */}
        <div className="flex flex-col gap-6">
          
          {/* Tracker Stat */}
          <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20 rounded-2xl p-6 flex items-center justify-between shadow-[0_0_20px_rgba(34,197,94,0.1)]">
            <div>
              <p className="text-xs font-bold text-green-400 uppercase tracking-widest mb-1">Today's Focus</p>
              <h3 className="text-4xl font-black text-white">{todayHours} <span className="text-xl text-white/50 font-medium">hrs</span></h3>
            </div>
            <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center text-2xl">
              🔥
            </div>
          </div>

          {/* Pomodoro Timer */}
          <div className="bg-[#13131e] border border-white/10 rounded-2xl p-6 text-center">
            <h2 className="text-sm font-bold text-white/50 uppercase tracking-wider mb-4">🍅 Focus Timer</h2>
            
            <div className="flex bg-white/5 p-1 rounded-xl mb-8 w-max mx-auto">
              <button 
                onClick={() => switchMode('25/5')}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${pomoMode === '25/5' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'}`}
              >
                25 / 5
              </button>
              <button 
                onClick={() => switchMode('50/10')}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${pomoMode === '50/10' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'}`}
              >
                50 / 10
              </button>
            </div>

            <div className="mb-2">
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${timerType === 'work' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
                {timerType === 'work' ? '🧠 Deep Work' : '☕ Break Time'}
              </span>
            </div>

            <div className="text-7xl font-black tracking-wider font-mono my-6 text-white drop-shadow-lg">
              {timeDisplay}
            </div>

            <div className="flex justify-center gap-3">
              <button 
                onClick={toggleTimer}
                className="w-24 bg-white text-black hover:bg-white/90 font-bold py-3 rounded-xl transition-all"
              >
                {isRunning ? 'PAUSE' : 'START'}
              </button>
              <button 
                onClick={resetTimer}
                className="w-24 bg-white/10 text-white hover:bg-white/20 font-bold py-3 rounded-xl transition-all"
              >
                RESET
              </button>
            </div>
          </div>

          {/* Weekly Chart */}
          <div className="bg-[#13131e] border border-white/10 rounded-2xl p-5 flex-1 min-h-[250px] flex flex-col">
            <h2 className="text-sm font-bold text-white/50 uppercase tracking-wider mb-4">📈 Weekly Hours</h2>
            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: '#5a5a6a', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: '#5a5a6a', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{ fill: '#ffffff05' }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="bg-[#1a1a28] border border-white/10 px-3 py-2 rounded-lg text-xs shadow-xl">
                          <span className="text-white/50">{payload[0].payload.day}: </span>
                          <span className="font-bold text-green-400">{payload[0].value} hrs</span>
                        </div>
                      )
                    }}
                  />
                  <Bar dataKey="hours" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
