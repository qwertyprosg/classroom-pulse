import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

const AUTH_STORAGE_KEY = 'classroom_pulse_user'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY)
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user))
      } else {
        localStorage.removeItem(AUTH_STORAGE_KEY)
      }
    } catch (e) {
      console.warn('Failed to update localStorage auth:', e)
    }
  }, [user])

  const login = (role, id, password, name) => {
    const cleanedId = (id || '').trim() || (role === 'student' ? 'STU-1001' : 'PROF-101')
    const displayName = (name || '').trim() || cleanedId
    const userData = {
      role, // 'student' | 'teacher'
      id: cleanedId,
      name: displayName,
      loggedInAt: Date.now()
    }
    setUser(userData)
    return userData
  }

  const logout = () => {
    setUser(null)
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY)
    } catch {
      // ignore
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isStudent: user?.role === 'student',
        isTeacher: user?.role === 'teacher',
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
