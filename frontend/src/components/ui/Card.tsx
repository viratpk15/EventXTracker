import React from 'react'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean
  variant?: 'standard' | 'antigravity' | 'glass'
}

export function Card({
  hover = false,
  variant = 'standard',
  className = '',
  children,
  ...props
}: CardProps) {
  const variantClass = variant === 'antigravity'
    ? 'card-antigravity'
    : variant === 'glass'
      ? 'glass-weightless'
      : hover
        ? 'card-hover cursor-pointer'
        : 'card'

  return (
    <div
      className={`${variantClass} ${hover && variant === 'standard' ? 'cursor-pointer' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({
  title,
  subtitle,
  action,
  icon,
  className = '',
}: {
  title: React.ReactNode
  subtitle?: React.ReactNode
  action?: React.ReactNode
  icon?: React.ReactNode
  className?: string
}) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3.5 mb-4 border-b border-[var(--border-color)] ${className}`}>
      <div className="flex items-start sm:items-center gap-2.5">
        {icon && <div className="p-1.5 rounded-lg bg-[var(--action-subtle)] text-[var(--action-primary)] shrink-0">{icon}</div>}
        <div>
          <h3 className="card-title text-slate-900 dark:text-slate-100">{title}</h3>
          {subtitle && <p className="text-metadata text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0 flex items-center gap-2">{action}</div>}
    </div>
  )
}
