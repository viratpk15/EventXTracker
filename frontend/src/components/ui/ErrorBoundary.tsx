import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallbackTitle?: string
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Antigravity ErrorBoundary caught runtime exception:', error, errorInfo)
    this.setState({ error, errorInfo })
  }

  private handleReload = () => {
    window.location.reload()
  }

  private handleGoHome = () => {
    const accountType = localStorage.getItem('ex_type')
    const target =
      accountType === 'AUTHORITY'
        ? '/authority/dashboard'
        : accountType === 'FACULTY'
          ? '/faculty/dashboard'
          : '/student/dashboard'
    window.location.href = target
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#07080B] text-slate-900 dark:text-white flex items-center justify-center p-4">
          <div className="max-w-xl w-full bg-white dark:bg-[#0E1017] border border-rose-200 dark:border-rose-900/60 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center text-2xl shrink-0">
                ⚠️
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                  {this.props.fallbackTitle || 'Component Render Error Intercepted'}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  The application encountered an unexpected runtime state. A fallback recovery view is active.
                </p>
              </div>
            </div>

            {this.state.error && (
              <div className="p-3.5 bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-2xl text-xs font-mono text-rose-800 dark:text-rose-300 overflow-x-auto">
                <p className="font-bold">{this.state.error.name}: {this.state.error.message}</p>
                {this.state.error.stack && (
                  <pre className="text-[10px] mt-2 max-h-36 overflow-y-auto text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                    {this.state.error.stack.split('\n').slice(0, 5).join('\n')}
                  </pre>
                )}
              </div>
            )}

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="btn btn-primary flex-1 py-2.5 text-xs font-bold rounded-xl shadow-sm active:scale-98 transition"
              >
                Reload Page
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="btn btn-secondary flex-1 py-2.5 text-xs font-bold rounded-xl active:scale-98 transition"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary

