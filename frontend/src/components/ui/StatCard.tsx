import React from 'react'

export interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  trend?: string
  trendUp?: boolean
  icon?: React.ReactNode
  variant?: 'blue' | 'teal' | 'violet' | 'amber' | 'emerald' | 'slate'
  onClick?: () => void
}

export function StatCard({
  title,
  value,
  subtitle,
  trend,
  trendUp = true,
  icon,
  variant = 'blue',
  onClick,
}: StatCardProps) {
  const iconVariants = {
    blue: 'bg-blue-50/80 text-blue-600 border-blue-200/80 shadow-xs shadow-blue-500/10 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/80 dark:shadow-blue-900/30',
    teal: 'bg-teal-50/80 text-teal-600 border-teal-200/80 shadow-xs shadow-teal-500/10 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800/80 dark:shadow-teal-900/30',
    violet: 'bg-violet-50/80 text-violet-600 border-violet-200/80 shadow-xs shadow-violet-500/10 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-800/80 dark:shadow-violet-900/30',
    amber: 'bg-amber-50/80 text-amber-600 border-amber-200/80 shadow-xs shadow-amber-500/10 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/80 dark:shadow-amber-900/30',
    emerald: 'bg-emerald-50/80 text-emerald-600 border-emerald-200/80 shadow-xs shadow-emerald-500/10 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/80 dark:shadow-emerald-900/30',
    slate: 'bg-slate-100/80 text-slate-700 border-slate-200 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700',
  }

  return (
    <div
      onClick={onClick}
      className={`card card-hover flex items-start justify-between gap-4 transition-all duration-200 p-5 ${
        onClick ? 'cursor-pointer hover:border-blue-500 dark:hover:border-white/40' : ''
      }`}
    >
      <div className="space-y-1.5 min-w-0">
        <p className="text-label text-slate-500 dark:text-slate-400 font-medium tracking-wide truncate">{title}</p>
        <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white tabular-nums">
          {value}
        </p>
        {subtitle && <p className="text-metadata text-slate-500 dark:text-slate-400 truncate">{subtitle}</p>}
        {trend && (
          <div className="pt-1 flex items-center gap-1">
            <span
              className={`text-[11px] font-semibold flex items-center gap-0.5 ${
                trendUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              <span>{trendUp ? '↑' : '↓'}</span>
              <span>{trend}</span>
            </span>
          </div>
        )}
      </div>
      {icon && (
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center border shrink-0 transition-transform duration-200 group-hover:scale-105 ${iconVariants[variant]}`}
        >
          {icon}
        </div>
      )}
    </div>
  )
}
