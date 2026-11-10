import React, { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../api'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isAuthorityRedirect, setIsAuthorityRedirect] = useState(false)
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    navigate('/student/login', { replace: true })
  }, [navigate])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setIsAuthorityRedirect(false)

    try {
      const r = await api.login(email.trim(), password)
      if (r.account_type === 'FACULTY') {
        navigate('/faculty/dashboard')
      } else if (r.account_type === 'STUDENT') {
        navigate('/student/dashboard')
      } else {
        // Unexpected account type on campus login
        throw new Error('Unknown account type')
      }
    } catch (err: any) {
      const msg = err.message || 'Login failed. Please verify credentials.'
      setError(msg)
      if (msg.toLowerCase().includes('authority') || msg.toLowerCase().includes('/authority/login')) {
        setIsAuthorityRedirect(true)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-vvce-900 px-4 py-8">
      <div className="card w-full max-w-md shadow-2xl border-slate-700 bg-white">
        <div className="text-center mb-6">
          <div className="inline-block px-3 py-1 mb-2 text-xs font-semibold tracking-wider text-vvce-700 bg-vvce-50 rounded-full uppercase">
            Vidyavardhaka College of Engineering
          </div>
          <h1 className="text-3xl font-extrabold text-vvce-800">EventXTracker</h1>
          <p className="text-xs text-slate-500 mt-1">Campus Portal · Student & Faculty Sign In</p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 mb-5">
          <div className="flex items-center gap-2">
            <span className="text-base">🎓</span>
            <div>
              <h2 className="font-semibold text-slate-800 text-xs sm:text-sm">Institutional Campus Access</h2>
              <p className="text-[11px] text-slate-500">Sign in with your verified VVCE institutional account. Role is determined automatically.</p>
            </div>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Institutional Email</label>
            <input
              className="input text-base sm:text-sm"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="e.g. vvce23cse0001@vvce.ac.in or faccse01@vvce.ac.in"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="label">Password</label>
            <input
              className="input text-base sm:text-sm"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
            />
          </div>

          {error && (
            <div className={`p-3.5 rounded-lg text-xs sm:text-sm border ${
              isAuthorityRedirect
                ? 'bg-amber-50 border-amber-300 text-amber-900'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              <div className="font-semibold mb-1">
                {isAuthorityRedirect ? '⚠️ Authority Account Detected' : 'Authentication Error'}
              </div>
              <p>{error}</p>
              {isAuthorityRedirect && (
                <div className="mt-2.5 pt-2 border-t border-amber-200">
                  <Link
                    to="/authority/login"
                    className="inline-flex items-center gap-1 font-semibold text-vvce-800 hover:text-vvce-900 underline text-xs"
                  >
                    Proceed to Authority Portal Login →
                  </Link>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary w-full py-2.5 text-base font-medium shadow-sm hover:shadow"
            disabled={busy}
          >
            {busy ? 'Signing in…' : 'Sign In to Campus Portal'}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>College Administration?</span>
          <Link to="/authority/login" className="font-semibold text-vvce-700 hover:text-vvce-800 underline">
            Authority Portal Sign In →
          </Link>
        </div>
      </div>
    </div>
  )
}
