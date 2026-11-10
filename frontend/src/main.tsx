import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import Login from './pages/Login'
import StudentLogin from './pages/StudentLogin'
import FacultyLogin from './pages/FacultyLogin'
import AuthorityLogin from './pages/AuthorityLogin'
import AuthorityDashboard from './pages/AuthorityDashboard'
import StudentDashboard from './pages/StudentDashboard'
import FacultyDashboard from './pages/FacultyDashboard'
import FacultyLeadership from './pages/FacultyLeadership'
import Events from './pages/Events'
import EventDetail from './pages/EventDetail'
import EventFormBuilderPage from './pages/EventFormBuilderPage'
import CandidateFormInspection from './pages/CandidateFormInspection'
import Notifications from './pages/Notifications'
import Layout from './components/Layout'
import AccessDenied from './components/auth/AccessDenied'
import ErrorBoundary from './components/ui/ErrorBoundary'

function Guard({ children, type }: { children: React.ReactElement; type?: string }) {
  const token = localStorage.getItem('ex_token')
  const currentType = localStorage.getItem('ex_type')

  if (!token) {
    if (type === 'AUTHORITY') return <Navigate to="/authority/login" replace />
    if (type === 'FACULTY') return <Navigate to="/faculty/login" replace />
    return <Navigate to="/student/login" replace />
  }

  if (type && currentType !== type) {
    return (
      <Layout>
        <AccessDenied requiredRole={type} currentRole={currentType} />
      </Layout>
    )
  }

  if (!type && currentType === 'AUTHORITY') {
    return (
      <Layout>
        <AccessDenied requiredRole="CAMPUS" currentRole={currentType} />
      </Layout>
    )
  }

  return children
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
        {/* Authentication Entrypoints */}
        <Route path="/authority/login" element={<AuthorityLogin />} />
        <Route path="/student/login" element={<StudentLogin />} />
        <Route path="/faculty/login" element={<FacultyLogin />} />
        <Route path="/login" element={<Navigate to="/student/login" replace />} />
        <Route path="/login/:role" element={<Navigate to="/student/login" replace />} />
        <Route path="/" element={<Navigate to="/student/login" replace />} />

        {/* Authority Portal Routes */}
        <Route path="/authority" element={<Navigate to="/authority/dashboard" replace />} />
        <Route path="/authority/dashboard" element={<Guard type="AUTHORITY"><Layout><AuthorityDashboard /></Layout></Guard>} />
        <Route path="/authority/students" element={<Guard type="AUTHORITY"><Layout><AuthorityDashboard /></Layout></Guard>} />
        <Route path="/authority/faculty" element={<Guard type="AUTHORITY"><Layout><AuthorityDashboard /></Layout></Guard>} />
        <Route path="/authority/accounts" element={<Guard type="AUTHORITY"><Layout><AuthorityDashboard /></Layout></Guard>} />
        <Route path="/authority/bulk-import" element={<Guard type="AUTHORITY"><Layout><AuthorityDashboard /></Layout></Guard>} />
        <Route path="/authority/departments" element={<Guard type="AUTHORITY"><Layout><AuthorityDashboard /></Layout></Guard>} />
        <Route path="/authority/hods" element={<Guard type="AUTHORITY"><Layout><AuthorityDashboard /></Layout></Guard>} />
        <Route path="/authority/class-teachers" element={<Guard type="AUTHORITY"><Layout><AuthorityDashboard /></Layout></Guard>} />
        <Route path="/authority/academic-years" element={<Guard type="AUTHORITY"><Layout><AuthorityDashboard /></Layout></Guard>} />
        <Route path="/authority/academic-settings" element={<Guard type="AUTHORITY"><Layout><AuthorityDashboard /></Layout></Guard>} />
        <Route path="/authority/sections" element={<Guard type="AUTHORITY"><Layout><AuthorityDashboard /></Layout></Guard>} />
        <Route path="/authority/audit-logs" element={<Guard type="AUTHORITY"><Layout><AuthorityDashboard /></Layout></Guard>} />
        <Route path="/authority/settings" element={<Guard type="AUTHORITY"><Layout><AuthorityDashboard /></Layout></Guard>} />
        <Route path="/authority/profile" element={<Guard type="AUTHORITY"><Layout><AuthorityDashboard initialTab="profile" /></Layout></Guard>} />

        {/* Faculty Portal Routes */}
        <Route path="/faculty" element={<Navigate to="/faculty/dashboard" replace />} />
        <Route path="/faculty/dashboard" element={<Guard type="FACULTY"><Layout><FacultyDashboard initialTab="normal_dept" /></Layout></Guard>} />
        <Route path="/faculty/profile" element={<Guard type="FACULTY"><Layout><FacultyDashboard initialTab="security" /></Layout></Guard>} />
        <Route path="/faculty/events/create" element={<Guard type="FACULTY"><Layout><FacultyDashboard initialTab="create_event" /></Layout></Guard>} />
        <Route path="/faculty/leadership" element={<Guard type="FACULTY"><Layout><FacultyLeadership /></Layout></Guard>} />
        <Route path="/faculty/events/active" element={<Guard type="FACULTY"><Layout><FacultyDashboard initialTab="active_events" /></Layout></Guard>} />
        <Route path="/faculty/events/history" element={<Guard type="FACULTY"><Layout><FacultyDashboard initialTab="history_events" /></Layout></Guard>} />
        <Route path="/faculty/class-teacher/students" element={<Guard type="FACULTY"><Layout><FacultyDashboard initialTab="ct_students" /></Layout></Guard>} />
        <Route path="/faculty/class-teacher/reviews" element={<Guard type="FACULTY"><Layout><FacultyDashboard initialTab="ct_academics" /></Layout></Guard>} />
        <Route path="/faculty/students" element={<Guard type="FACULTY"><Layout><FacultyDashboard initialTab="ct_students" /></Layout></Guard>} />
        <Route path="/faculty/academic-reviews" element={<Guard type="FACULTY"><Layout><FacultyDashboard initialTab="ct_academics" /></Layout></Guard>} />
        <Route path="/faculty/events" element={<Guard type="FACULTY"><Layout><Events /></Layout></Guard>} />
        <Route path="/faculty/events/:id" element={<Guard type="FACULTY"><Layout><EventDetail /></Layout></Guard>} />
        <Route path="/faculty/events/:id/form-builder" element={<Guard type="FACULTY"><Layout><EventFormBuilderPage /></Layout></Guard>} />
        <Route path="/faculty/events/:id/submissions/:regId" element={<Guard type="FACULTY"><Layout><CandidateFormInspection /></Layout></Guard>} />
        <Route path="/faculty/events/:id/candidates/:regId" element={<Guard type="FACULTY"><Layout><CandidateFormInspection /></Layout></Guard>} />
        <Route path="/faculty/events/:id/registrations" element={<Guard type="FACULTY"><Layout><EventDetail initialTab="participants" /></Layout></Guard>} />
        <Route path="/faculty/events/:id/teams" element={<Guard type="FACULTY"><Layout><EventDetail initialTab="team" /></Layout></Guard>} />
        <Route path="/faculty/events/:id/volunteers" element={<Guard type="FACULTY"><Layout><EventDetail initialTab="volunteer" /></Layout></Guard>} />
        <Route path="/faculty/events/:id/attendance" element={<Guard type="FACULTY"><Layout><EventDetail initialTab="attendance" /></Layout></Guard>} />
        <Route path="/faculty/reports" element={<Guard type="FACULTY"><Layout><FacultyDashboard initialTab="history_events" /></Layout></Guard>} />

        {/* Student Portal Routes */}
        <Route path="/student" element={<Navigate to="/student/dashboard" replace />} />
        <Route path="/student/dashboard" element={<Guard type="STUDENT"><Layout><StudentDashboard initialTab="normal_activities" /></Layout></Guard>} />
        <Route path="/student/coordination" element={<Guard type="STUDENT"><Layout><StudentDashboard initialTab="coordination" /></Layout></Guard>} />
        <Route path="/student/leadership" element={<Guard type="STUDENT"><Layout><StudentDashboard initialTab="coordination" /></Layout></Guard>} />
        <Route path="/student/academics" element={<Guard type="STUDENT"><Layout><StudentDashboard initialTab="academics" /></Layout></Guard>} />
        <Route path="/student/internships" element={<Guard type="STUDENT"><Layout><StudentDashboard initialTab="academics" /></Layout></Guard>} />
        <Route path="/student/external-events" element={<Guard type="STUDENT"><Layout><StudentDashboard initialTab="academics" /></Layout></Guard>} />
        <Route path="/student/events" element={<Guard type="STUDENT"><Layout><Events /></Layout></Guard>} />
        <Route path="/student/events/:id" element={<Guard type="STUDENT"><Layout><EventDetail /></Layout></Guard>} />
        <Route path="/student/events/:id/form-builder" element={<Guard><Layout><EventFormBuilderPage /></Layout></Guard>} />
        <Route path="/student/registrations" element={<Guard type="STUDENT"><Layout><StudentDashboard initialTab="normal_activities" /></Layout></Guard>} />
        <Route path="/student/teams" element={<Guard type="STUDENT"><Layout><StudentDashboard initialTab="normal_activities" /></Layout></Guard>} />
        <Route path="/student/invitations" element={<Guard type="STUDENT"><Layout><StudentDashboard initialTab="normal_activities" /></Layout></Guard>} />
        <Route path="/student/volunteers" element={<Guard type="STUDENT"><Layout><StudentDashboard initialTab="normal_activities" /></Layout></Guard>} />
        <Route path="/student/profile" element={<Guard type="STUDENT"><Layout><StudentDashboard initialTab="security" /></Layout></Guard>} />
        <Route path="/student/security" element={<Guard type="STUDENT"><Layout><StudentDashboard initialTab="security" /></Layout></Guard>} />

        {/* Shared Authenticated Routes */}
        <Route path="/events" element={<Guard><Layout><Events /></Layout></Guard>} />
        <Route path="/events/:id" element={<Guard><Layout><EventDetail /></Layout></Guard>} />
        <Route path="/events/:id/form-builder" element={<Guard><Layout><EventFormBuilderPage /></Layout></Guard>} />
        <Route path="/events/:id/submissions/:regId" element={<Guard><Layout><CandidateFormInspection /></Layout></Guard>} />
        <Route path="/events/:id/candidates/:regId" element={<Guard><Layout><CandidateFormInspection /></Layout></Guard>} />
        <Route path="/student/events/:id/submissions/:regId" element={<Guard type="STUDENT"><Layout><CandidateFormInspection /></Layout></Guard>} />
        <Route path="/notifications" element={<Guard><Layout><Notifications /></Layout></Guard>} />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/student/login" replace />} />
      </Routes>
    </BrowserRouter>
  </ErrorBoundary>
</React.StrictMode>,
)
