import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { GraduationCap, Lock, User, ArrowRight, Eye, EyeOff, Sparkles, CheckCircle2 } from 'lucide-react'

export default function StudentLogin() {
  const [studentId, setStudentId] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleAutofillDemo = () => {
    setStudentId('STU-2048')
    setPassword('student123')
    setError('')
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!studentId.trim() && !password.trim()) {
      // If completely blank, auto-fill demo credentials for the user for quick testing
      const defaultId = 'STU-2048'
      login('student', defaultId, 'student123', defaultId)
      navigate('/student')
      return
    }

    setLoading(true)
    setTimeout(() => {
      login('student', studentId.trim() || 'STU-2048', password || 'pass', studentId.trim() || 'Student')
      setLoading(false)
      navigate('/student')
    }, 400)
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-surface overflow-hidden px-4 py-12">
      {/* Background ambient lighting - Student theme: Blue & Cyan */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-blue-600/20 blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-cyan-500/15 blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-indigo-500/5 blur-[140px] pointer-events-none" />

      {/* Grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: '32px 32px'
        }}
      />

      <div className="relative z-10 w-full max-w-md animate-slide-up">
        {/* Top Back Navigation */}
        <div className="flex items-center justify-between mb-6">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors group"
          >
            <span className="transition-transform group-hover:-translate-x-1">←</span>
            <span>Back to Home</span>
          </Link>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-medium text-blue-300">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            Student Portal
          </div>
        </div>

        {/* Card Container */}
        <div className="backdrop-blur-xl bg-white/[0.04] border border-white/10 rounded-3xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          {/* Card Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-400 p-0.5 mb-4 shadow-lg shadow-blue-500/20">
              <div className="w-full h-full bg-[#12121d] rounded-2xl flex items-center justify-center text-3xl">
                🎓
              </div>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white mb-2">
              Student Login
            </h1>
            <p className="text-sm text-white/50 max-w-xs mx-auto">
              Sign in to join live lectures, submit doubts, and track your comprehension.
            </p>
          </div>

          {/* Quick Demo Mode Notification Banner */}
          <div className="mb-6 p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/25 flex items-start gap-3 text-left">
            <Sparkles className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs">
              <span className="font-semibold text-blue-200">Testing Mode Enabled: </span>
              <span className="text-blue-300/80">Any Student ID and password will work.</span>
              <button
                type="button"
                onClick={handleAutofillDemo}
                className="mt-1.5 block text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition-colors"
              >
                Click here to autofill demo credentials
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Student ID Field */}
            <div>
              <label className="block text-xs font-semibold text-white/70 uppercase tracking-wider mb-2">
                Student ID / Roll No. / Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-white/30">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={studentId}
                  onChange={(e) => {
                    setStudentId(e.target.value)
                    setError('')
                  }}
                  placeholder="e.g. STU-2024 or student@univ.edu"
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/25 text-sm focus:outline-none focus:border-blue-400 focus:bg-white/[0.07] focus:ring-1 focus:ring-blue-400 transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-white/70 uppercase tracking-wider">
                  Password
                </label>
                <span className="text-[11px] text-white/40">Any password works for test</span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-white/30">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setError('')
                  }}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-11 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/25 text-sm focus:outline-none focus:border-blue-400 focus:bg-white/[0.07] focus:ring-1 focus:ring-blue-400 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-white/30 hover:text-white/70 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-2.5 text-center">
                {error}
              </p>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 text-white font-bold text-sm shadow-[0_10px_25px_rgba(59,130,246,0.35)] hover:shadow-[0_12px_30px_rgba(59,130,246,0.5)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 transition-all duration-200"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In as Student</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Teacher Alternative Switcher */}
          <div className="mt-8 pt-6 border-t border-white/10 text-center">
            <p className="text-xs text-white/40 mb-3">
              Are you an instructor or teaching assistant?
            </p>
            <Link
              to="/login/teacher"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-300 text-xs font-semibold hover:border-purple-500/40 transition-all"
            >
              <span>Switch to Teacher Login</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center mt-6">
          <p className="text-xs text-white/30">
            Classroom Pulse • Real-time Comprehension & Engagement
          </p>
        </div>
      </div>
    </div>
  )
}
