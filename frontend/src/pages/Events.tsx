import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, getAccountType } from '../api'
import { BackButton } from '../components/ui/BackButton'
import {
  IconSearch,
  IconPlus,
  IconMapPin,
  IconCalendar,
  IconUsers,
  IconAward,
  IconSparkles,
  IconCheckCircle,
  IconExternalLink,
  IconFilter,
  IconChevronDown
} from '../components/ui/Icons'

export default function Events() {
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const accountType = getAccountType()

  useEffect(() => {
    loadEvents()
  }, [])

  async function loadEvents() {
    setLoading(true)
    setError('')
    try {
      const data = await api.get('/events')
      setEvents(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load events')
    } finally {
      setLoading(false)
    }
  }

  const categories = ['Technical', 'Cultural', 'Sports', 'Workshop', 'Conference', 'Hackathon']

  const filteredEvents = events.filter(e => {
    const matchesSearch = !search ||
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      (e.venue && e.venue.toLowerCase().includes(search.toLowerCase())) ||
      (e.description && e.description.toLowerCase().includes(search.toLowerCase()))
    const matchesCat = !categoryFilter || e.category === categoryFilter
    const matchesStatus = !statusFilter || e.status === statusFilter
    return matchesSearch && matchesCat && matchesStatus
  })

  return (
    <div className="space-y-6">
      {/* Top Left Come Back Navigation */}
      <div className="flex items-center justify-between">
        <BackButton
          to={accountType === 'FACULTY' ? '/faculty/dashboard' : accountType === 'AUTHORITY' ? '/authority/dashboard' : '/student/dashboard'}
          label="Come Back to Dashboard"
          size="sm"
          variant="outline"
          className="shadow-2xs font-semibold"
        />
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Campus Events Explorer
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Discover college-wide hackathons, workshops, technical symposiums, and cultural festivals
          </p>
        </div>
        {accountType === 'FACULTY' && (
          <Link
            to="/faculty/events/create"
            className="btn btn-primary px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs active:scale-98 self-start sm:self-auto"
          >
            <IconPlus size={15} />
            <span>Create College Event</span>
          </Link>
        )}
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-sm">
          {error}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="card-antigravity p-4 sm:p-5 space-y-4 rounded-2xl">
        <div className="flex flex-col md:flex-row gap-3.5 items-stretch md:items-center justify-between">
          <div className="relative w-full md:w-80">
            <IconSearch size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              className="input input-icon-left text-xs py-2.5 rounded-xl"
              style={{ paddingLeft: '2.5rem' }}
              placeholder="Search by event title, venue, keywords..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 w-full md:w-auto">
            <div className="relative w-full sm:w-48">
              <select
                className="w-full text-xs py-2 px-3 pr-8 rounded-xl font-medium bg-white dark:bg-[#0C0D14] border border-slate-200 dark:border-white/15 text-slate-800 dark:text-white shadow-2xs focus:border-blue-500 focus:outline-hidden transition-all cursor-pointer appearance-none"
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
              >
                <option value="">All Categories ({categories.length})</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
                <IconChevronDown size={14} />
              </div>
            </div>
            <div className="relative w-full sm:w-40">
              <select
                className="w-full text-xs py-2 px-3 pr-8 rounded-xl font-medium bg-white dark:bg-[#0C0D14] border border-slate-200 dark:border-white/15 text-slate-800 dark:text-white shadow-2xs focus:border-blue-500 focus:outline-hidden transition-all cursor-pointer appearance-none"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="LIVE">Live Now</option>
                <option value="UPCOMING">Upcoming</option>
                <option value="ENDED">Ended</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
                <IconChevronDown size={14} />
              </div>
            </div>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border-default">
          <button
            onClick={() => setCategoryFilter('')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-2xs ${
              categoryFilter === ''
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25 dark:bg-purple-600 dark:text-white dark:shadow-purple-900/40'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            All
          </button>
          {categories.map(c => (
            <button
              key={c}
              onClick={() => setCategoryFilter(categoryFilter === c ? '' : c)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-2xs ${
                categoryFilter === c
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25 dark:bg-purple-600 dark:text-white dark:shadow-purple-900/40'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Events Grid */}
      {loading ? (
        <div className="card text-center py-16 text-slate-400 dark:text-slate-500">Loading events directory…</div>
      ) : filteredEvents.length === 0 ? (
        <div className="card text-center py-16 text-slate-400 dark:text-slate-500 space-y-2">
          <IconCalendar size={36} className="mx-auto text-slate-300 dark:text-slate-600" />
          <p className="font-semibold text-slate-700 dark:text-slate-300">No events found matching your search criteria.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredEvents.map(e => (
            <Link
              key={e.id}
              to={`/events/${e.id}`}
              className="card-antigravity card-hover flex flex-col justify-between group rounded-2xl overflow-hidden"
            >
              <div>
                {e.poster_url ? (
                  <div className="relative w-full h-44 -mt-6 -mx-6 mb-4 overflow-hidden bg-slate-900 flex items-center justify-center border-b border-border-default/50" style={{ width: 'calc(100% + 3rem)' }}>
                    <img
                      src={e.poster_url}
                      alt={e.name}
                      className="w-full h-44 object-cover object-center group-hover:scale-105 transition-transform duration-500"
                      onError={ev => { (ev.currentTarget.style.display = 'none') }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
                    <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-black/60 backdrop-blur-md text-white border border-white/20">
                      {e.category || 'General'}
                    </span>
                    <span className={`absolute top-3 right-3 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md border ${
                      e.status === 'LIVE'
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40 animate-pulse'
                        : e.status === 'UPCOMING'
                          ? 'bg-blue-950/80 text-blue-300 border-blue-500/40'
                          : e.status === 'ENDED' || e.status === 'COMPLETED'
                            ? 'bg-rose-950/80 text-rose-300 border-rose-500/40'
                            : 'bg-black/60 text-slate-300 border-white/20'
                    }`}>
                      {e.status === 'COMPLETED' ? 'ENDED' : e.status}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <span className="badge badge-neutral text-[10px] font-semibold uppercase tracking-wider">
                      {e.category || 'General'}
                    </span>
                    <span className={`badge ${
                      e.status === 'LIVE'
                        ? 'badge-success animate-pulse'
                        : e.status === 'UPCOMING'
                          ? 'badge-info'
                          : e.status === 'ENDED' || e.status === 'COMPLETED'
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                            : 'badge-neutral'
                    }`}>
                      {e.status === 'COMPLETED' ? 'ENDED' : e.status}
                    </span>
                  </div>
                )}

                <h3 className="font-bold text-slate-900 dark:text-white text-base group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug">
                  {e.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                  {e.description || 'No description provided.'}
                </p>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/10 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <IconMapPin size={15} className="text-blue-500 dark:text-blue-400 shrink-0" />
                    <span className="truncate">{e.venue || 'Campus Venue (TBA)'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <IconCalendar size={15} className="text-blue-500 dark:text-blue-400 shrink-0" />
                    <span>{new Date(e.start_at).toLocaleDateString()} at {new Date(e.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>

                {/* Badges for volunteers & registration status */}
                <div className="flex flex-wrap gap-2 mt-3.5">
                  {e.volunteer_enabled && (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 flex items-center gap-1.5 shadow-2xs">
                      <IconAward size={14} />
                      <span>Volunteers Needed</span>
                    </span>
                  )}
                  {e.reg_open && (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5 shadow-2xs">
                      <IconCheckCircle size={14} />
                      <span>Registration Open</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-white/10 flex items-center justify-between text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-all">
                <span className="flex items-center gap-1.5">
                  <IconExternalLink size={15} />
                  <span>View Event Workspace</span>
                </span>
                <span className="text-sm font-extrabold">→</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
