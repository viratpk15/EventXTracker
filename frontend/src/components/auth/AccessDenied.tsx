import React from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api'
import { BackButton } from '../ui/BackButton'

interface AccessDeniedProps {
  requiredRole?: string
  currentRole?: string | null
}

export default function AccessDenied({ requiredRole, currentRole }: AccessDeniedProps) {
  const navigate = useNavigate()

  const userDashboard =
    currentRole === 'AUTHORITY'
      ? '/authority/dashboard'
      : currentRole === 'FACULTY'
        ? '/faculty/dashboard'
        : '/student/dashboard'

  const requiredLabel =
    requiredRole === 'AUTHORITY'
      ? 'Authority Administration'
      : requiredRole === 'FACULTY'
        ? 'Faculty'
        : requiredRole === 'STUDENT'
          ? 'Student'
          : 'Campus Student / Faculty'

  const currentLabel =
    currentRole === 'AUTHORITY'
      ? 'Authority Administrator'
      : currentRole === 'FACULTY'
        ? 'Faculty Member'
        : currentRole === 'STUDENT'
          ? 'Student'
          : 'Unknown Account'

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white border border-rose-200 rounded-2xl shadow-xl p-6 sm:p-8 text-center">
        <div className="flex justify-start mb-3">
          <BackButton label="Come Back" size="xs" variant="outline" className="shadow-2xs font-semibold" />
        </div>

        <div className="w-16 h-16 mx-auto mb-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-center text-3xl text-rose-600 shadow-inner">
          🚫
        </div>

        <div className="inline-block px-3 py-1 mb-2 text-xs font-bold uppercase tracking-wider text-rose-700 bg-rose-100 rounded-full">
          HTTP 403 · Access Denied
        </div>

        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-2">
          Portal Isolation Boundary
        </h1>

        <p className="text-sm text-slate-600 mt-2 leading-relaxed">
          You are signed in as <strong className="text-slate-900 font-semibold">{currentLabel}</strong>, but this page requires <strong className="text-slate-900 font-semibold">{requiredLabel}</strong> credentials.
        </p>

        <div className="my-5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-left text-xs text-slate-600 space-y-1.5">
          <div className="flex justify-between">
            <span className="text-slate-500">Your Current Role:</span>
            <span className="font-semibold text-slate-800">{currentLabel}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Required Authorization:</span>
            <span className="font-semibold text-rose-700">{requiredLabel}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Security Rule:</span>
            <span className="font-mono text-[11px] text-slate-700">Strict Portal Isolation</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <button
            onClick={() => navigate(userDashboard)}
            className="flex-1 py-2.5 px-4 rounded-lg bg-vvce-700 hover:bg-vvce-800 text-white text-sm font-semibold shadow-sm transition-all"
          >
            Go to Your Dashboard
          </button>
          <button
            onClick={() => api.logout(navigate)}
            className="py-2.5 px-4 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 text-sm font-semibold transition-all"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}

