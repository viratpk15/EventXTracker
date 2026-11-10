import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { IconArrowLeft } from './Icons'
import { getAccountType } from '../../api'

export interface BackButtonProps {
  to?: string
  fallback?: string
  label?: string
  className?: string
  size?: 'xs' | 'sm' | 'md'
  variant?: 'subtle' | 'outline' | 'ghost' | 'primary'
}

export const BackButton: React.FC<BackButtonProps> = ({
  to,
  fallback,
  label = 'Back',
  className = '',
  size = 'sm',
  variant = 'outline'
}) => {
  const navigate = useNavigate()
  const location = useLocation()
  const accountType = getAccountType()

  const defaultDashboard =
    accountType === 'AUTHORITY'
      ? '/authority/dashboard'
      : accountType === 'FACULTY'
        ? '/faculty/dashboard'
        : '/student/dashboard'

  const handleBack = () => {
    if (to) {
      navigate(to)
      return
    }

    // If browser has history within the same site, go back
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1)
    } else if (fallback) {
      navigate(fallback)
    } else {
      navigate(defaultDashboard)
    }
  }

  const sizeClasses = {
    xs: 'px-2.5 py-1 text-[11px] gap-1 rounded-lg',
    sm: 'px-3 py-1.5 text-xs gap-1.5 rounded-xl',
    md: 'px-4 py-2 text-sm gap-2 rounded-xl'
  }[size]

  const variantClasses = {
    outline: 'border border-border-default hover:border-slate-400 dark:hover:border-slate-600 bg-white dark:bg-[#0E1017] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 shadow-2xs',
    subtle: 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-transparent',
    ghost: 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50',
    primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
  }[variant]

  return (
    <button
      type="button"
      onClick={handleBack}
      className={`inline-flex items-center font-semibold transition active:scale-98 select-none shrink-0 ${sizeClasses} ${variantClasses} ${className}`}
      title={`Go back (${label})`}
      aria-label={`Go back - ${label}`}
    >
      <IconArrowLeft size={size === 'xs' ? 12 : size === 'md' ? 16 : 14} className="shrink-0" />
      <span>{label}</span>
    </button>
  )
}

export default BackButton

