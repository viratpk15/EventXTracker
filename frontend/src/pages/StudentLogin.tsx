import React, { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../api'
import { ThemeToggle } from '../components/ui/ThemeToggle'
import {
  IconGraduationCap,
  IconLock,
  IconMail,
  IconAlertTriangle,
  IconExternalLink,
  IconBuilding
} from '../components/ui/Icons'

export default function StudentLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [errorRole, setErrorRole] = useState<'FACULTY' | 'AUTHORITY' | null>(null)
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // Clear any stale session if switching portal
    if (localStorage.getItem('ex_type') !== 'STUDENT') {
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
      const r = await api.studentLogin(email.trim(), password)
      if (r.account_type === 'STUDENT') {
        navigate('/student/dashboard')
      } else {
        throw new Error('Access denied: Only students can log in here.')
      }
    } catch (err: any) {
      const msg = err.message || 'Login failed. Please verify credentials.'
      setError(msg)
      if (msg.toLowerCase().includes('faculty')) {
        setErrorRole('FACULTY')
      } else if (msg.toLowerCase().includes('authority')) {
        setErrorRole('AUTHORITY')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg-primary)] text-[var(--text-primary)] px-4 py-8 relative overflow-hidden transition-colors duration-180">
      {/* Top right Theme Toggle */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      <div className="card w-full max-w-md shadow-xl border border-border-default bg-[var(--bg-surface)] p-8 relative z-10 space-y-6">
        <div className="text-center">
          <div className="inline-block px-3.5 py-1 mb-2 text-xs font-bold tracking-wider text-blue-700 dark:text-blue-300 bg-blue-500/10 border border-blue-500/20 rounded-full uppercase">
            Vidyavardhaka College of Engineering
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            EventXTracker
          </h1>
          <div className="mt-1 flex items-center justify-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
            <p className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
              Student Portal Access
            </p>
          </div>
        </div>

        {/* Portal Switcher Tabs */}
        <div className="flex border-b border-border-default text-xs font-medium">
          <span className="flex-1 py-2 text-center border-b-2 border-blue-600 text-blue-700 dark:text-blue-300 font-bold bg-blue-500/10 rounded-t-lg">
            Student Login
          </span>
          <Link
            to="/faculty/login"
            className="flex-1 py-2 text-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-t-lg transition"
          >
            Faculty Portal
          </Link>
          <Link
            to="/authority/login"
            className="flex-1 py-2 text-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-t-lg transition"
          >
            Authority
          </Link>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex items-center gap-3 text-xs text-blue-950 dark:text-blue-100">
          <IconGraduationCap size={20} className="text-blue-600 dark:text-blue-400 shrink-0" />
          <div>
            <h2 className="font-bold">Enrolled Student Access Only</h2>
            <p className="text-[11px] opacity-80 mt-0.5">
              Sign in with your official VVCE student email ID (e.g. vvce23cse0001@vvce.ac.in).
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Student Institutional Email
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
                placeholder="e.g. vvce23cse0001@vvce.ac.in"
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
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs space-y-2">
              <div className="flex items-center gap-2 font-semibold">
                <IconAlertTriangle size={15} className="text-rose-600 dark:text-rose-400 shrink-0" />
                <span>
                  {errorRole === 'FACULTY' ? 'Faculty Account Detected' : errorRole === 'AUTHORITY' ? 'Authority Account Detected' : 'Authentication Error'}
                </span>
              </div>
              <p className="leading-relaxed">{error}</p>
              {errorRole === 'FACULTY' && (
                <div className="pt-2 border-t border-rose-200 dark:border-rose-800">
                  <Link
                    to="/faculty/login"
                    className="inline-flex items-center gap-1.5 font-semibold text-blue-600 dark:text-blue-400 hover:underline text-xs"
                  >
                    <span>Switch to Faculty Portal Sign In</span>
                    <IconExternalLink size={15} />
                  </Link>
                </div>
              )}
              {errorRole === 'AUTHORITY' && (
                <div className="pt-2 border-t border-rose-200 dark:border-rose-800">
                  <Link
                    to="/authority/login"
                    className="inline-flex items-center gap-1.5 font-semibold text-blue-600 dark:text-blue-400 hover:underline text-xs"
                  >
                    <span>Switch to Authority Command Center</span>
                    <IconExternalLink size={15} />
                  </Link>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="btn-primary w-full py-2.5 flex items-center justify-center gap-2"
          >
            <IconGraduationCap size={16} />
            <span>{busy ? 'Authenticating…' : 'Access Student Hub'}</span>
          </button>
        </form>

        {/* Demo Credentials Quick-Select Pill Helper */}
        <div className="pt-2 border-t border-border-default text-center">
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-2 font-medium">Quick Test Student Accounts (Password: student123)</p>
          <div className="flex flex-wrap gap-2 justify-center">
            <button
              type="button"
              onClick={() => {
                setEmail('vvcecse0001@vvce.ac.in')
                setPassword('student123')
              }}
              className="px-3.5 py-1.5 text-xs font-mono font-semibold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-700 dark:hover:text-blue-300 border border-slate-200 dark:border-slate-700 transition shadow-2xs"
            >
              vvcecse0001@vvce.ac.in
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail('vvcecse0002@vvce.ac.in')
                setPassword('student123')
              }}
              className="px-3.5 py-1.5 text-xs font-mono font-semibold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-700 dark:hover:text-blue-300 border border-slate-200 dark:border-slate-700 transition shadow-2xs"
            >
              vvcecse0002@vvce.ac.in
            </button>
          </div>
        </div>

        <div className="pt-2 text-center">
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            Strict Portal Isolation Enforced · VVCE Student Network
          </p>
        </div>
      </div>
    </div>
  )
}
