import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import Landing from './pages/Landing.jsx'
import StudentLogin from './pages/StudentLogin.jsx'
import TeacherLogin from './pages/TeacherLogin.jsx'
import Student from './pages/Student.jsx'
import Professor from './pages/Professor.jsx'
import StudyHub from './pages/StudyHub.jsx'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Landing />} />
        
        {/* Dedicated Separate Login Pages */}
        <Route path="/login/student" element={<StudentLogin />} />
        <Route path="/login/teacher" element={<TeacherLogin />} />
        
        {/* Convenient Aliases */}
        <Route path="/student-login" element={<Navigate to="/login/student" replace />} />
        <Route path="/teacher-login" element={<Navigate to="/login/teacher" replace />} />
        <Route path="/student/login" element={<Navigate to="/login/student" replace />} />
        <Route path="/teacher/login" element={<Navigate to="/login/teacher" replace />} />

        {/* Portals */}
        <Route path="/student" element={<Student />} />
        <Route path="/professor" element={<Professor />} />
        <Route path="/teacher" element={<Navigate to="/professor" replace />} />
        <Route path="/study" element={<StudyHub />} />
      </Routes>
    </AuthProvider>
  )
}
