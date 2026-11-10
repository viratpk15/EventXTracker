import React from 'react'

export type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'purple'
  | 'outline'
  | 'authority'
  | 'faculty'
  | 'student'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  size?: 'sm' | 'md'
  icon?: React.ReactNode
  children: React.ReactNode
}

export function Badge({
  variant = 'default',
  size = 'md',
  icon,
  className = '',
  children,
  ...props
}: BadgeProps) {
  const variantStyles: Record<BadgeVariant, string> = {
    default: 'badge-neutral',
    success: 'badge-success',
    warning: 'badge-warning',
    danger: 'badge-danger',
    info: 'badge-info',
    purple: 'badge-vvce',
    outline: 'border border-[var(--border-color)] bg-transparent text-[var(--text-secondary)]',
    authority: 'badge-authority',
    faculty: 'badge-faculty',
    student: 'badge-student',
  }

  const sizeStyles = {
    sm: 'text-[10px] px-2 py-0.5 font-semibold',
    md: 'text-xs px-2.5 py-0.5 font-medium',
  }

  return (
    <span
      className={`badge ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  )
}
