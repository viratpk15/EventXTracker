import React, { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../api'
import { ThemeToggle } from '../components/ui/ThemeToggle'
import {
  IconBuilding,
  IconLock,
  IconMail,
  IconAlertTriangle,
  IconExternalLink,
  IconGraduationCap,
  IconShield,
  IconCheckCircle
} from '../components/ui/Icons'

export default function FacultyLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [errorRole, setErrorRole] = useState<'STUDENT' | 'AUTHORITY' | null>(null)
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // Clear any stale session if switching portal
    if (localStorage.getItem('ex_type') !== 'FACULTY') {
      localStorage.removeItem('ex_token')
      localStorage.removeItem('ex_type')
    }
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setErrorRole(null)

    try {
      const r = await api.facultyLogin(email.trim(), password)
      if (r.account_type === 'FACULTY') {
        navigate('/faculty/dashboard')
      } else {
        throw new Error('Access denied: Only faculty members can log in here.')
      }
    } catch (err: any) {
      const msg = err.message || 'Login failed. Please verify credentials.'
      setError(msg)
      if (msg.toLowerCase().includes('student')) {
        setErrorRole('STUDENT')
      } else if (msg.toLowerCase().includes('authority')) {
        setErrorRole('AUTHORITY')
      }
    } finally {
      setBusy(false)
    }
  }

  const fillDemoFaculty = (demoEmail: string) => {
    setEmail(demoEmail)
    setPassword('faculty123')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg-primary)] text-[var(--text-primary)] px-4 py-8 relative overflow-hidden transition-colors duration-180">
      {/* Top right Theme Toggle */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      <div className="card w-full max-w-md shadow-xl border border-border-default bg-[var(--bg-surface)] p-8 relative z-10 space-y-6">
        <div className="text-center">
          <div className="inline-block px-3 py-1 mb-2 text-[11px] font-bold tracking-wider text-teal-700 dark:text-teal-400 bg-teal-500/10 border border-teal-500/20 rounded-full uppercase">
            Vidyavardhaka College of Engineering
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            EventXTracker
          </h1>
          <div className="mt-1 flex items-center justify-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
            <p className="text-xs font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider">
              Faculty & HOD Portal Access
            </p>
          </div>
        </div>

        {/* Portal Switcher Tabs */}
        <div className="flex border-b border-border-default text-xs font-medium">
          <Link
            to="/student/login"
            className="flex-1 py-2 text-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-t-lg transition"
          >
            Student Login
          </Link>
          <span className="flex-1 py-2 text-center border-b-2 border-teal-500 text-teal-700 dark:text-teal-400 font-bold bg-teal-500/10 rounded-t-lg">
            Faculty Portal
          </span>
          <Link
            to="/authority/login"
            className="flex-1 py-2 text-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-t-lg transition"
          >
            Authority
          </Link>
        </div>

        <div className="bg-teal-500/10 border border-teal-500/20 rounded-xl p-3.5 flex items-center gap-2.5 text-xs text-teal-900 dark:text-teal-200">
          <IconBuilding size={18} className="text-teal-600 dark:text-teal-400 shrink-0" />
          <div>
            <h2 className="font-bold text-teal-950 dark:text-teal-100">Authorized Faculty & HOD Access</h2>
            <p className="text-[11px] text-teal-800/80 dark:text-teal-300/80 mt-0.5">
              Sign in with your official faculty institutional email to access event coordination, student supervision, and academic verification.
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Faculty Institutional Email
            </label>
            <div className="relative flex items-center">
              <div className="absolute left-3.5 flex items-center pointer-events-none text-slate-400">
                <IconMail size={16} />
              </div>
              <input
                className="input input-icon-left text-sm"
                style={{ paddingLeft: '2.75rem' }}
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="faculty.cse1@vvce.ac.in"
                required
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Password
            </label>
            <div className="relative flex items-center">
              <div className="absolute left-3.5 flex items-center pointer-events-none text-slate-400">
                <IconLock size={16} />
              </div>
              <input
                className="input input-icon-left text-sm"
                style={{ paddingLeft: '2.75rem' }}
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
              />
            </div>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs space-y-2">
              <div className="flex items-center gap-2 font-semibold">
                <IconAlertTriangle size={16} className="text-rose-500 shrink-0" />
                <span>{error}</span>
              </div>
              {errorRole === 'STUDENT' && (
                <div className="pt-2 border-t border-rose-200 dark:border-rose-800/60 flex items-center justify-between">
                  <span>Looking for Student Portal?</span>
                  <Link
                    to="/student/login"
                    className="inline-flex items-center gap-1.5 font-bold text-blue-600 dark:text-blue-400 hover:underline text-xs"
                  >
                    <span>Go to Student Login</span>
                    <IconExternalLink size={15} />
                  </Link>
                </div>
              )}
              {errorRole === 'AUTHORITY' && (
                <div className="pt-2 border-t border-rose-200 dark:border-rose-800/60 flex items-center justify-between">
                  <span>Looking for Authority Center?</span>
                  <Link
                    to="/authority/login"
                    className="inline-flex items-center gap-1.5 font-bold text-blue-600 dark:text-blue-400 hover:underline text-xs"
                  >
                    <span>Go to Authority Login</span>
                    <IconExternalLink size={15} />
                  </Link>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="btn btn-primary w-full py-2.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm"
          >
            {busy ? 'Authenticating...' : 'Sign In as Faculty'}
          </button>
        </form>

        {/* Demo Credentials Quick-Select Pill Helper */}
        <div className="pt-2 border-t border-border-default text-center">
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-2 font-medium">Quick Test Faculty Accounts (Password: faculty123)</p>
          <div className="flex flex-wrap gap-1.5 justify-center">
            <button
              type="button"
              onClick={() => fillDemoFaculty('faccse01@vvce.ac.in')}
              className="px-2.5 py-1 text-[11px] font-mono rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-teal-50 dark:hover:bg-teal-950/40 hover:text-teal-700 dark:hover:text-teal-300 border border-slate-200 dark:border-slate-700 transition"
            >
              faccse01@vvce.ac.in (CSE)
            </button>
            <button
              type="button"
              onClick={() => fillDemoFaculty('facise01@vvce.ac.in')}
              className="px-2.5 py-1 text-[11px] font-mono rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-teal-50 dark:hover:bg-teal-950/40 hover:text-teal-700 dark:hover:text-teal-300 border border-slate-200 dark:border-slate-700 transition"
            >
              facise01@vvce.ac.in (ISE)
            </button>
          </div>
        </div>

        <div className="text-center text-[11px] text-slate-400 dark:text-slate-500">
          VVCE Autonomous Institution · Mysore, Karnataka
        </div>
      </div>
    </div>
  )
}
