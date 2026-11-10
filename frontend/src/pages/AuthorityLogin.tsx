import React, { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../api'
import { ThemeToggle } from '../components/ui/ThemeToggle'
import {
  IconShield,
  IconLock,
  IconMail,
  IconAlertTriangle,
  IconExternalLink,
  IconCheckCircle,
  IconBuilding
} from '../components/ui/Icons'

export default function AuthorityLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isCampusRedirect, setIsCampusRedirect] = useState(false)
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // Clear any stale campus session when arriving at authority login
    if (localStorage.getItem('ex_type') !== 'AUTHORITY' && localStorage.getItem('ex_token')) {
      localStorage.removeItem('ex_token')
      localStorage.removeItem('ex_type')
    }
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setIsCampusRedirect(false)

    try {
      await api.authorityLogin(email.trim(), password)
      navigate('/authority/dashboard')
    } catch (err: any) {
      const msg = err.message || 'Authority login failed. Please verify credentials.'
      setError(msg)
      if (msg.toLowerCase().includes('campus') || msg.toLowerCase().includes('/login') || msg.toLowerCase().includes('not an authority')) {
        setIsCampusRedirect(true)
      }
    } finally {
      setBusy(false)
    }
  }

  const fillDemoAuthority = () => {
    setEmail('authority@vvce.ac.in')
    setPassword('authority123')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg-primary)] text-[var(--text-primary)] px-4 py-8 relative overflow-hidden transition-colors duration-180">
      {/* Top right Theme Toggle */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      <div className="card w-full max-w-md shadow-xl border border-border-default bg-[var(--bg-surface)] p-8 relative z-10 space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 mb-2 text-xs font-bold tracking-wider text-blue-700 dark:text-blue-300 bg-blue-500/10 border border-blue-500/20 rounded-full uppercase">
            <IconShield size={14} />
            <span>Privileged Administration</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            EventXTracker
          </h1>
          <div className="mt-1 flex items-center justify-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
            <p className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
              Authority Command Center
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
          <Link
            to="/faculty/login"
            className="flex-1 py-2 text-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-t-lg transition"
          >
            Faculty Portal
          </Link>
          <span className="flex-1 py-2 text-center border-b-2 border-blue-600 text-blue-700 dark:text-blue-300 font-bold bg-blue-500/10 rounded-t-lg">
            Authority
          </span>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex items-center gap-3 text-xs text-blue-900 dark:text-blue-200">
          <IconShield size={20} className="text-blue-600 dark:text-blue-400 shrink-0" />
          <div>
            <h2 className="font-bold text-blue-950 dark:text-blue-100">Institutional Governance & Audit</h2>
            <p className="text-[11px] text-blue-800/80 dark:text-blue-300/80 mt-0.5">
              Access account provisioning, HOD & Class Teacher appointments, academic telemetry, and audit logs.
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Authority Institutional Email
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
                placeholder="authority@vvce.ac.in"
                required
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Master Password
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
              {isCampusRedirect && (
                <div className="pt-2 border-t border-rose-200 dark:border-rose-800/60 flex items-center justify-between">
                  <span>Student or Faculty Account?</span>
                  <Link
                    to="/student/login"
                    className="inline-flex items-center gap-1.5 font-bold text-blue-600 dark:text-blue-400 hover:underline text-xs"
                  >
                    <span>Go to Campus Login</span>
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
            {busy ? 'Authenticating...' : 'Sign In as Authority'}
          </button>
        </form>

        {/* Demo Credentials Quick-Select Pill Helper */}
        <div className="pt-2 border-t border-border-default text-center">
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-2 font-medium">Quick Test Authority Account (Password: authority123)</p>
          <div className="flex justify-center">
            <button
              type="button"
              onClick={fillDemoAuthority}
              className="px-4 py-1.5 text-xs font-mono font-semibold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-700 dark:hover:text-blue-300 border border-slate-200 dark:border-slate-700 transition shadow-2xs"
            >
              authority@vvce.ac.in
            </button>
          </div>
        </div>

        <div className="text-center text-[11px] text-slate-400 dark:text-slate-500">
          Vidyavardhaka College of Engineering · Autonomous Institutional Platform
        </div>
      </div>
    </div>
  )
}
