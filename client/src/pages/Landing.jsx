import { Link } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { GraduationCap, Users, Sparkles, ArrowRight, BookOpen, ShieldCheck } from 'lucide-react'

export default function Landing() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let raf
    const dots = Array.from({ length: 50 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.5 + 0.5,
      dx: (Math.random() - 0.5) * 0.35,
      dy: (Math.random() - 0.5) * 0.35,
      opacity: Math.random() * 0.4 + 0.1,
    }))

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      dots.forEach(d => {
        d.x += d.dx
        d.y += d.dy
        if (d.x < 0 || d.x > canvas.width) d.dx *= -1
        if (d.y < 0 || d.y > canvas.height) d.dy *= -1
        ctx.beginPath()
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(168,85,247,${d.opacity})`
        ctx.fill()
      })
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-surface px-4 py-12">
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

      {/* Atmospheric Glowing Blobs */}
      <div className="absolute top-[-100px] left-[-100px] w-96 h-96 rounded-full bg-accent-purple/20 blur-[110px] pointer-events-none float" />
      <div className="absolute bottom-[-100px] right-[-100px] w-96 h-96 rounded-full bg-accent-blue/20 blur-[110px] pointer-events-none float" style={{ animationDelay: '-2.5s' }} />
      <div className="absolute top-1/3 right-1/4 w-72 h-72 rounded-full bg-cyan-500/10 blur-[90px] pointer-events-none float" style={{ animationDelay: '-4s' }} />

      {/* Grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: '36px 36px'
        }}
      />

      <div className="relative z-10 text-center max-w-4xl w-full mx-auto animate-fade-in">
        {/* Top Status Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-8 shadow-sm">
          <div className="flex gap-1.5">
            <span className="w-2 h-2 rounded-full bg-accent-green pulse-dot" />
            <span className="w-2 h-2 rounded-full bg-accent-amber pulse-dot" style={{ animationDelay: '0.4s' }} />
            <span className="w-2 h-2 rounded-full bg-accent-purple pulse-dot" style={{ animationDelay: '0.8s' }} />
          </div>
          <span className="text-xs font-medium text-white/70 tracking-wide">
            Real-Time Classroom Comprehension Monitor
          </span>
        </div>

        {/* Hero Branding */}
        <div className="text-6xl md:text-7xl mb-4 select-none float">
          🎓
        </div>
        <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-4">
          Classroom{' '}
          <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent">
            Pulse
          </span>
        </h1>
        <p className="text-white/60 text-base md:text-lg leading-relaxed mb-12 max-w-xl mx-auto">
          Instant comprehension feedback and live telemetry for modern lectures.  
          Please select your login portal to continue.
        </p>

        {/* The 2 Main Login Buttons / Portals */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto mb-10 text-left">
          
          {/* 1. Student Login Button / Card */}
          <Link
            to="/login/student"
            className="group relative overflow-hidden rounded-3xl border border-blue-500/30 bg-gradient-to-b from-blue-950/20 to-white/[0.03] p-7 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-blue-400 hover:shadow-[0_12px_40px_rgba(59,130,246,0.3)] flex flex-col justify-between"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all pointer-events-none" />

            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-3xl shadow-inner group-hover:scale-105 transition-transform">
                  🙋
                </div>
                <span className="px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Student Portal
                </span>
              </div>

              <h2 className="text-2xl font-black text-white mb-2 flex items-center gap-2 group-hover:text-blue-300 transition-colors">
                Student Login
              </h2>
              <p className="text-white/50 text-xs leading-relaxed mb-6">
                Join live sessions with your room code, tap comprehension reactions, and submit questions with full anonymity.
              </p>
            </div>

            <div className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 group-hover:shadow-blue-500/40 group-hover:from-blue-500 group-hover:to-cyan-500 transition-all">
              <span>Student Login</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* 2. Teacher Login Button / Card */}
          <Link
            to="/login/teacher"
            className="group relative overflow-hidden rounded-3xl border border-purple-500/30 bg-gradient-to-b from-purple-950/20 to-white/[0.03] p-7 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-purple-400 hover:shadow-[0_12px_40px_rgba(168,85,247,0.3)] flex flex-col justify-between"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all pointer-events-none" />

            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-14 h-14 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-3xl shadow-inner group-hover:scale-105 transition-transform">
                  👨‍🏫
                </div>
                <span className="px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Faculty Portal
                </span>
              </div>

              <h2 className="text-2xl font-black text-white mb-2 flex items-center gap-2 group-hover:text-purple-300 transition-colors">
                Teacher Login
              </h2>
              <p className="text-white/50 text-xs leading-relaxed mb-6">
                Create live lecture rooms, monitor real-time class heatmaps, and receive proactive AI pivot alerts when students are lost.
              </p>
            </div>

            <div className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 via-purple-600 to-indigo-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25 group-hover:shadow-purple-500/40 group-hover:from-purple-500 group-hover:to-indigo-500 transition-all">
              <span>Teacher Login</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

        </div>

        {/* Secondary Auxiliary Link (Study Hub & Testing Note) */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-xs text-white/40">
          <Link
            to="/study"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white/70 hover:text-white transition-all"
          >
            <BookOpen className="w-3.5 h-3.5 text-accent-green" />
            <span>Open Study Hub (Mind Maps & Pomodoro)</span>
          </Link>
          <span className="hidden sm:inline text-white/20">•</span>
          <span className="text-white/40">
            🧪 Fast Testing: Any ID and password works instantly
          </span>
        </div>
      </div>
    </div>
  )
}
