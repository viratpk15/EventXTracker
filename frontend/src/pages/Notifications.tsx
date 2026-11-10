import React, { useEffect, useState } from 'react'
import { api } from '../api'
import { BackButton } from '../components/ui/BackButton'

interface NotificationItem {
  id: number
  title: string
  body: string
  read: boolean
  created_at?: string
  link?: string
}

export default function Notifications() {
  const [items, setItems] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  async function load() {
    setLoading(true)
    try {
      const data = await api.get('/notifications')
      setItems(data || [])
    } catch (e: any) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function markRead(id: number) {
    try {
      await api.post(`/notifications/${id}/read`)
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    } catch (e: any) {
      alert(e.message)
    }
  }

  async function markAllRead() {
    try {
      await api.post('/notifications/mark-all-read')
      setItems((prev) => prev.map((n) => ({ ...n, read: true })))
    } catch (e: any) {
      alert(e.message)
    }
  }

  const unreadCount = items.filter((n) => !n.read).length
  const displayed = filter === 'unread' ? items.filter((n) => !n.read) : items

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top Left Come Back Navigation */}
      <div className="flex items-center justify-between">
        <BackButton label="Come Back to Dashboard" size="sm" variant="outline" className="shadow-2xs font-semibold" />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-vvce-900 tracking-tight">System & Activity Notifications</h1>
          <p className="text-sm text-slate-500">
            Real-time updates regarding registrations, academic approvals, and team invites
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="btn-secondary !text-xs !py-1.5 !px-3 font-medium flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5 text-vvce-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Mark all as read
            </button>
          )}
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-md font-medium transition ${
                filter === 'all' ? 'bg-vvce-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({items.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1 rounded-md font-medium transition ${
                filter === 'unread' ? 'bg-vvce-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading notifications...</div>
      ) : displayed.length === 0 ? (
        <div className="card text-center py-16">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-slate-800">No notifications</h3>
          <p className="text-sm text-slate-500 mt-1">
            {filter === 'unread' ? 'You have no unread notifications.' : 'Your inbox is completely clear.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map((n) => (
            <div
              key={n.id}
              className={`card transition border ${
                n.read ? 'bg-white/80 border-slate-200' : 'bg-amber-50/20 border-amber-200/80 shadow-xs ring-1 ring-amber-100'
              } p-4`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      n.read ? 'bg-slate-100 text-slate-500' : 'bg-vvce-100 text-vvce-800 font-bold'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className={`text-sm font-semibold ${n.read ? 'text-slate-800' : 'text-vvce-950 font-bold'}`}>
                        {n.title}
                      </h4>
                      {!n.read && (
                        <span className="inline-block w-2 h-2 rounded-full bg-amber-500 ring-2 ring-amber-200"></span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed whitespace-pre-line">{n.body}</p>
                    {n.created_at && (
                      <span className="text-[10px] text-slate-400 mt-2 block">
                        {new Date(n.created_at).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    )}
                  </div>
                </div>
                {!n.read && (
                  <button
                    onClick={() => markRead(n.id)}
                    className="shrink-0 text-xs text-vvce-700 hover:text-vvce-900 font-medium px-2 py-1 rounded hover:bg-vvce-50 transition"
                  >
                    Dismiss
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
