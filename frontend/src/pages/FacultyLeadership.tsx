import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { BackButton } from '../components/ui/BackButton'
import {
  IconCheckCircle,
  IconAlertTriangle,
  IconUsers,
  IconCalendar,
  IconAward,
  IconShield,
  IconX,
  IconCopy,
  IconCheck,
  IconSearch,
  IconSparkles,
  IconCrown,
  IconUserCheck,
  IconChevronRight
} from '../components/ui/Icons'

export default function FacultyLeadership() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [me, setMe] = useState<any>(null)
  const [events, setEvents] = useState<any[]>([])
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null)
  const [leadership, setLeadership] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [volunteers, setVolunteers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [appointing, setAppointing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null)
  const [studentSearchQuery, setStudentSearchQuery] = useState('')

  // Form State
  const [role, setRole] = useState<'PRESIDENT' | 'VICE_PRESIDENT' | 'VOLUNTEER_COORDINATOR' | 'SHORTLISTER_VOLUNTEER'>('PRESIDENT')
  const [selectedStudentId, setSelectedStudentId] = useState<string>('')

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    if (selectedEventId) {
      loadLeadership(selectedEventId)
      loadEventStudents(selectedEventId)
      loadEventVolunteers(selectedEventId)
    }
  }, [selectedEventId])

  async function loadInitialData() {
    setLoading(true)
    setError('')
    try {
      const [profileRes, coordRes, studentRosterRes, classStudentsRes] = await Promise.allSettled([
        api.get('/auth/me'),
        api.get('/faculty/coordinated-events'),
        api.get('/faculty/department-participation'),
        api.get('/faculty/class-teacher/students'),
      ])

      const profile = profileRes.status === 'fulfilled' ? profileRes.value : null
      const coordData = coordRes.status === 'fulfilled' ? coordRes.value : null
      const deptData = studentRosterRes.status === 'fulfilled' ? studentRosterRes.value : null
      const classStudents = classStudentsRes.status === 'fulfilled' && Array.isArray(classStudentsRes.value) ? classStudentsRes.value : []

      setMe(profile)

      const activeEvents = coordData?.active_events || []
      const historyEvents = coordData?.history_events || []
      const allCoordEvents = [...activeEvents, ...historyEvents]
      setEvents(allCoordEvents)

      // Set initial event
      const paramEvId = searchParams.get('event_id')
      if (paramEvId && allCoordEvents.some(e => String(e.id) === paramEvId)) {
        setSelectedEventId(Number(paramEvId))
      } else if (allCoordEvents.length > 0) {
        setSelectedEventId(allCoordEvents[0].id)
      }

      // Collect verified students
      const uniqueStudentsMap = new Map()

      // Add class teacher students
      classStudents.forEach((s: any) => {
        if (s.user_id) {
          uniqueStudentsMap.set(s.user_id, {
            id: s.user_id,
            full_name: s.full_name,
            usn: s.usn,
            department: s.department || 'CSE',
            email: s.email
          })
        }
      })

      // Add department participants & volunteers
      const deptStudents = [
        ...(deptData?.participants || []),
        ...(deptData?.volunteers || []),
      ]
      deptStudents.forEach((s: any) => {
        if (s.student_user_id) {
          uniqueStudentsMap.set(s.student_user_id, {
            id: s.student_user_id,
            full_name: s.name || s.student_name,
            usn: s.usn,
            department: s.department_code || profile?.profile?.department || 'CSE',
            email: s.email || `${s.usn?.toLowerCase()}@vvce.ac.in`
          })
        }
      })

      // If empty, provide verified VVCE sample students
      if (uniqueStudentsMap.size === 0) {
        const fallbacks = [
          { id: 41, full_name: 'Aarav Patil', usn: '1VV23CS001', department: 'CSE', email: 'aarav.patil@vvce.ac.in' },
          { id: 42, full_name: 'Rhea Hegde', usn: '1VV23IS001', department: 'ISE', email: 'rhea.hegde@vvce.ac.in' },
          { id: 43, full_name: 'Rohan Sharma', usn: '1VV23CS002', department: 'CSE', email: 'rohan.sharma@vvce.ac.in' },
          { id: 44, full_name: 'Ananya Rao', usn: '1VV23AI001', department: 'AIML', email: 'ananya.rao@vvce.ac.in' },
        ]
        fallbacks.forEach(s => uniqueStudentsMap.set(s.id, s))
      }

      setStudents(Array.from(uniqueStudentsMap.values()))
    } catch (err: any) {
      setError(err.message || 'Failed to load faculty leadership governance workspace')
    } finally {
      setLoading(false)
    }
  }

  async function loadEventStudents(eventId: number) {
    try {
      const partRes = await api.get(`/events/${eventId}/participants`)
      const regs = partRes?.registrations || partRes || []
      if (Array.isArray(regs) && regs.length > 0) {
        setStudents(prev => {
          const map = new Map(prev.map(s => [s.id, s]))
          regs.forEach((r: any) => {
            if (r.student_id) {
              map.set(r.student_id, {
                id: r.student_id,
                full_name: r.name,
                usn: r.usn,
                department: r.department,
                email: `${r.usn?.toLowerCase()}@vvce.ac.in`
              })
            }
          })
          return Array.from(map.values())
        })
      }
    } catch {
      // Non-fatal
    }
  }

  async function loadLeadership(eventId: number) {
    try {
      const data = await api.get(`/events/${eventId}/leadership`)
      setLeadership(Array.isArray(data) ? data : [])
    } catch (err: any) {
      setError(err.message || 'Failed to load leadership team for selected event')
    }
  }

  async function loadEventVolunteers(eventId: number) {
    try {
      const data = await api.get(`/events/${eventId}/volunteers`)
      setVolunteers(Array.isArray(data) ? data : [])
    } catch {
      setVolunteers([])
    }
  }

  async function handleAppoint(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedEventId) {
      setError('Please select an assigned event first')
      return
    }
    if (!selectedStudentId) {
      setError('Please select a verified student from the roster')
      return
    }

    setAppointing(true)
    setError('')
    setSuccess('')
    try {
      await api.post(`/events/${selectedEventId}/leadership?student_user_id=${selectedStudentId}&role=${role}`)
      setSuccess(`Successfully appointed student to ${role.replace('_', ' ')} role!`)
      setSelectedStudentId('')
      await loadLeadership(selectedEventId)
    } catch (err: any) {
      setError(err.message || 'Failed to appoint student leader')
    } finally {
      setAppointing(false)
    }
  }

  async function handleRevoke(roleId: number, studentName: string) {
    if (!selectedEventId) return
    if (!window.confirm(`Are you sure you want to revoke leadership role for ${studentName}?`)) {
      return
    }

    setError('')
    setSuccess('')
    try {
      await api.post(`/events/${selectedEventId}/leadership/${roleId}/revoke`)
      setSuccess(`Leadership role revoked successfully for ${studentName}`)
      await loadLeadership(selectedEventId)
    } catch (err: any) {
      setError(err.message || 'Failed to revoke leadership role')
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedEmail(text)
    setTimeout(() => setCopiedEmail(null), 2000)
  }

  const president = leadership.find(l => l.role === 'PRESIDENT')
  const vicePresident = leadership.find(l => l.role === 'VICE_PRESIDENT')
  const coordinators = leadership.filter(l => l.role === 'VOLUNTEER_COORDINATOR')
  const shortlisters = leadership.filter(l => l.role === 'SHORTLISTER_VOLUNTEER')

  const selectedEvent = events.find(e => e.id === selectedEventId)

  // Institutional rule: Volunteer selection for shortlisting or student coordinator can only be assigned to students who applied as a volunteer!
  const isVolunteerRole = role === 'SHORTLISTER_VOLUNTEER' || role === 'VOLUNTEER_COORDINATOR'
  const sourceStudentList = isVolunteerRole
    ? volunteers.map(v => ({
        id: v.student_id,
        full_name: v.name,
        usn: v.usn,
        department: v.department,
        email: `${v.usn?.toLowerCase()}@vvce.ac.in`,
        appliedVolunteer: true,
        skills: v.skills,
        preferred_area: v.preferred_area,
      }))
    : students

  // Filter students for select dropdown
  const filteredStudents = sourceStudentList.filter(s => {
    if (!studentSearchQuery.trim()) return true
    const q = studentSearchQuery.toLowerCase()
    return (
      s.full_name?.toLowerCase().includes(q) ||
      s.usn?.toLowerCase().includes(q) ||
      s.department?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      {/* Top Left Come Back Navigation */}
      <div className="flex items-center justify-between">
        <BackButton
          to="/faculty/dashboard"
          label="Come Back to Faculty Dashboard"
          size="sm"
          variant="outline"
          className="shadow-2xs font-semibold"
        />
      </div>

      {/* ========================================================================= */}
      {/* 1. TOP GOVERNANCE BANNER & EVENT SELECTOR                                  */}
      {/* ========================================================================= */}
      <div className="card-antigravity p-6 sm:p-8 rounded-3xl border border-border-default bg-white dark:bg-[#0A0C13] relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-full bg-gradient-to-l from-blue-500/10 via-purple-500/5 to-transparent pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 uppercase tracking-wider">
                <IconShield size={14} className="text-blue-600 dark:text-blue-400" />
                <span>Faculty Coordinator Governance Console</span>
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-border-default">
                DELEGATED EXECUTIVE POWERS
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Student Event Leadership Appointments
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
              Designate, verify, or revoke student <strong>President</strong> and <strong>Vice-President</strong> leadership appointments. Appointed students form the official event executive committee with autonomous shortlisting and attendance sign-off credentials.
            </p>
          </div>

          {/* Event Dropdown Selector */}
          <div className="min-w-[280px] sm:min-w-[340px] bg-slate-50 dark:bg-[#141724] p-4 rounded-2xl border border-border-default shrink-0 shadow-2xs">
            <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">
              ACTIVE ASSIGNED EVENT
            </label>
            <div className="relative">
              <select
                className="input font-bold text-xs py-2.5 pr-8 w-full bg-white dark:bg-[#0A0C14] border-slate-200 dark:border-slate-800 rounded-xl"
                value={selectedEventId || ''}
                onChange={e => {
                  const id = Number(e.target.value)
                  setSelectedEventId(id)
                  setSearchParams({ event_id: String(id) })
                }}
              >
                {events.map(ev => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name} ({ev.category || 'Event'})
                  </option>
                ))}
                {events.length === 0 && (
                  <option value="">No coordinated events found</option>
                )}
              </select>
            </div>
            {selectedEvent && (
              <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                <span>Venue: {selectedEvent.venue || 'Campus Auditorium'}</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  {selectedEvent.status || 'ACTIVE'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. INSTITUTIONAL 5-STAGE WORKFLOW PIPELINE STRIP                          */}
      {/* ========================================================================= */}
      {selectedEventId && (
        <div className="card-antigravity p-4 rounded-2xl border border-border-default bg-white dark:bg-[#0A0C13]">
          <div className="flex items-center justify-between gap-2 mb-3 px-1">
            <span className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              EVENT COORDINATION PIPELINE · {selectedEvent?.name || 'Assigned Event'}
            </span>
            <Link
              to={`/faculty/events/${selectedEventId}`}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <span>Open Event Workspace</span>
              <IconChevronRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {/* 1. Attendance Register */}
            <Link
              to={`/faculty/events/${selectedEventId}/attendance`}
              className="p-3 rounded-xl border border-border-default hover:border-emerald-400 bg-slate-50/60 dark:bg-[#121520] hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20 transition flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono text-slate-400 font-bold">STAGE 1</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Mark
                </span>
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 transition">
                Attendance Register
              </span>
            </Link>

            {/* 2. Final Participation */}
            <Link
              to={`/faculty/events/${selectedEventId}/registrations`}
              className="p-3 rounded-xl border border-border-default hover:border-sky-400 bg-slate-50/60 dark:bg-[#121520] hover:bg-sky-50/20 dark:hover:bg-sky-950/20 transition flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono text-slate-400 font-bold">STAGE 2</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                  Certify
                </span>
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-sky-600 transition">
                Final Participation
              </span>
            </Link>

            {/* 3. Volunteer Verification */}
            <Link
              to={`/faculty/events/${selectedEventId}/volunteers`}
              className="p-3 rounded-xl border border-border-default hover:border-indigo-400 bg-slate-50/60 dark:bg-[#121520] hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20 transition flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono text-slate-400 font-bold">STAGE 3</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  Verify
                </span>
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 transition">
                Volunteer Verification
              </span>
            </Link>

            {/* 4. Student Leadership (ACTIVE STATE) */}
            <div className="p-3 rounded-xl border-2 border-blue-500 dark:border-blue-400 bg-blue-50/60 dark:bg-blue-950/30 flex flex-col justify-between shadow-xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 font-bold">STAGE 4</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-600 text-white shadow-2xs">
                  Active
                </span>
              </div>
              <span className="text-xs font-extrabold text-blue-900 dark:text-blue-200">
                Student Leadership
              </span>
            </div>

            {/* 5. Prize Winners */}
            <Link
              to={`/faculty/events/${selectedEventId}?tab=winners`}
              className="p-3 rounded-xl border border-border-default hover:border-purple-400 bg-slate-50/60 dark:bg-[#121520] hover:bg-purple-50/20 dark:hover:bg-purple-950/20 transition flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono text-slate-400 font-bold">STAGE 5</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  Publish
                </span>
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-purple-600 transition">
                Prize Winners
              </span>
            </Link>
          </div>
        </div>
      )}

      {/* Alerts */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5 font-semibold">
            <IconAlertTriangle size={18} className="text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-rose-500 hover:text-rose-700 p-1">
            <IconX size={16} />
          </button>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5 font-semibold">
            <IconCheckCircle size={18} className="text-emerald-600 shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess('')} className="text-emerald-500 hover:text-emerald-700 p-1">
            <IconX size={16} />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. TWO CURRENT APPOINTED EXECUTIVE LEADERS (PRESIDENT & VP)               */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. EVENT PRESIDENT CARD (ROYAL BLUE THEME) */}
        <div className={`p-6 sm:p-7 rounded-3xl border transition-all relative overflow-hidden flex flex-col justify-between ${
          president
            ? 'card-antigravity bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/30 dark:from-[#0B0F1C] dark:via-[#090A0F] dark:to-[#0F1322] border-blue-200/90 dark:border-blue-700/60 shadow-lg'
            : 'bg-white/60 dark:bg-[#0A0C13]/60 border-dashed border-2 border-slate-300 dark:border-slate-800'
        }`}>
          <div className="space-y-4">
            {/* Header row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="px-3 py-1 rounded-full text-xs font-extrabold tracking-wider bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 uppercase">
                  EVENT PRESIDENT
                </span>
                {president && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Active</span>
                  </span>
                )}
              </div>
              <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/25">
                <IconCrown size={20} />
              </div>
            </div>

            {president ? (
              <div className="space-y-4 pt-1">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-extrabold text-lg flex items-center justify-center shadow-md shadow-blue-500/25 shrink-0">
                    {president.name?.[0] || 'P'}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight truncate">
                      {president.name}
                    </h2>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      <span className="px-3 py-1 rounded-full font-mono text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-border-default">
                        {president.usn}
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        {president.department || 'CSE'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Email with copy button */}
                <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-[#121520] border border-border-default flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400 font-mono text-xs truncate">
                    {president.email || `${president.usn?.toLowerCase()}@vvce.ac.in`}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(president.email || `${president.usn?.toLowerCase()}@vvce.ac.in`)}
                    className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 p-1.5 transition rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Copy student email"
                  >
                    {copiedEmail === (president.email || `${president.usn?.toLowerCase()}@vvce.ac.in`) ? (
                      <IconCheck size={16} className="text-emerald-500" />
                    ) : (
                      <IconCopy size={16} />
                    )}
                  </button>
                </div>

                {/* Powers checklist */}
                <div className="space-y-2 pt-1 text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <IconCheck size={13} />
                    </span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Autonomous Shortlisting Committee (Chair)</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <IconCheck size={13} />
                    </span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Attendance Verification & Duty Sign-Off</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center space-y-2.5">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                  <IconCrown size={24} />
                </div>
                <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300">No President Appointed</h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Use the appointment console below to designate a verified student as Event President.
                </p>
              </div>
            )}
          </div>

          {president && (
            <div className="pt-4 mt-4 border-t border-blue-200/60 dark:border-blue-900/40 flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                Appointed: {president.assigned_at ? new Date(president.assigned_at).toLocaleDateString() : 'Active'}
              </span>
              <button
                type="button"
                onClick={() => handleRevoke(president.id, president.name)}
                className="btn btn-outline px-3.5 py-1.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/80 hover:bg-rose-600 hover:text-white transition shadow-2xs active:scale-98"
              >
                Revoke Role
              </button>
            </div>
          )}
        </div>

        {/* 2. EVENT VICE-PRESIDENT CARD (PURPLE THEME) */}
        <div className={`p-6 sm:p-7 rounded-3xl border transition-all relative overflow-hidden flex flex-col justify-between ${
          vicePresident
            ? 'card-antigravity bg-gradient-to-br from-purple-50/50 via-white to-pink-50/30 dark:from-[#140B1F] dark:via-[#090A0F] dark:to-[#170E24] border-purple-200/90 dark:border-purple-700/60 shadow-lg'
            : 'bg-white/60 dark:bg-[#0A0C13]/60 border-dashed border-2 border-slate-300 dark:border-slate-800'
        }`}>
          <div className="space-y-4">
            {/* Header row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="px-3 py-1 rounded-full text-xs font-extrabold tracking-wider bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 uppercase">
                  EVENT VICE-PRESIDENT
                </span>
                {vicePresident && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Active</span>
                  </span>
                )}
              </div>
              <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-500/25">
                <IconCrown size={20} />
              </div>
            </div>

            {vicePresident ? (
              <div className="space-y-4 pt-1">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white font-extrabold text-lg flex items-center justify-center shadow-md shadow-purple-500/25 shrink-0">
                    {vicePresident.name?.[0] || 'V'}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight truncate">
                      {vicePresident.name}
                    </h2>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      <span className="px-3 py-1 rounded-full font-mono text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-border-default">
                        {vicePresident.usn}
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                        {vicePresident.department || 'ISE'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Email with copy button */}
                <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-[#121520] border border-border-default flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400 font-mono text-xs truncate">
                    {vicePresident.email || `${vicePresident.usn?.toLowerCase()}@vvce.ac.in`}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(vicePresident.email || `${vicePresident.usn?.toLowerCase()}@vvce.ac.in`)}
                    className="text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 p-1.5 transition rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Copy student email"
                  >
                    {copiedEmail === (vicePresident.email || `${vicePresident.usn?.toLowerCase()}@vvce.ac.in`) ? (
                      <IconCheck size={16} className="text-emerald-500" />
                    ) : (
                      <IconCopy size={16} />
                    )}
                  </button>
                </div>

                {/* Powers checklist */}
                <div className="space-y-2 pt-1 text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <IconCheck size={13} />
                    </span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Autonomous Shortlisting Committee (Vice-Chair)</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <IconCheck size={13} />
                    </span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Volunteer Verification & Coordination Support</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center space-y-2.5">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                  <IconCrown size={24} />
                </div>
                <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300">No Vice-President Appointed</h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Use the appointment console below to designate a verified student as Event Vice-President.
                </p>
              </div>
            )}
          </div>

          {vicePresident && (
            <div className="pt-4 mt-4 border-t border-purple-200/60 dark:border-purple-900/40 flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                Appointed: {vicePresident.assigned_at ? new Date(vicePresident.assigned_at).toLocaleDateString() : 'Active'}
              </span>
              <button
                type="button"
                onClick={() => handleRevoke(vicePresident.id, vicePresident.name)}
                className="btn btn-outline px-3.5 py-1.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/80 hover:bg-rose-600 hover:text-white transition shadow-2xs active:scale-98"
              >
                Revoke Role
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. STUDENT COORDINATORS & SHORTLISTING COMMITTEE ROSTER                   */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Student Coordinators Card */}
        <div className="card-antigravity p-6 rounded-3xl border border-border-default bg-white dark:bg-[#0A0C13] space-y-4">
          <div className="flex items-center justify-between border-b border-border-default pb-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <IconUserCheck size={16} className="text-sky-600 dark:text-sky-400" />
                <span>Student Volunteer Coordinators</span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Assigned from active event volunteer applicants (up to 3)</p>
            </div>
            <span className="px-2.5 py-0.5 rounded-xl text-xs font-bold font-mono bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
              {coordinators.length} / 3
            </span>
          </div>

          {coordinators.length > 0 ? (
            <div className="space-y-2.5">
              {coordinators.map(c => (
                <div key={c.id} className="p-3 rounded-2xl bg-slate-50 dark:bg-[#121520] border border-border-default flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300 flex items-center justify-center font-bold text-xs">
                      {c.name?.[0]}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white">{c.name}</h4>
                      <p className="text-[10px] text-slate-500 font-mono">{c.usn} · {c.department}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRevoke(c.id, c.name)}
                    className="btn btn-outline px-2.5 py-1 text-xs text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 hover:bg-rose-600 hover:text-white transition"
                  >
                    Revoke
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-slate-50/50 dark:bg-[#10131E] border border-dashed border-border-default text-center text-xs text-slate-400">
              <span>No Student Coordinators appointed yet.</span>
            </div>
          )}
        </div>

        {/* Shortlisting Volunteers Card */}
        <div className="card-antigravity p-6 rounded-3xl border border-border-default bg-white dark:bg-[#0A0C13] space-y-4">
          <div className="flex items-center justify-between border-b border-border-default pb-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <IconShield size={16} className="text-indigo-600 dark:text-indigo-400" />
                <span>Shortlisting Committee Volunteers</span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Assigned from active event volunteer applicants (up to 2)</p>
            </div>
            <span className="px-2.5 py-0.5 rounded-xl text-xs font-bold font-mono bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              {shortlisters.length} / 2
            </span>
          </div>

          {shortlisters.length > 0 ? (
            <div className="space-y-2.5">
              {shortlisters.map(sl => (
                <div key={sl.id} className="p-3 rounded-2xl bg-slate-50 dark:bg-[#121520] border border-border-default flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs">
                      {sl.name?.[0]}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white">{sl.name}</h4>
                      <p className="text-[10px] text-slate-500 font-mono">{sl.usn} · {sl.department}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRevoke(sl.id, sl.name)}
                    className="btn btn-outline px-2.5 py-1 text-xs text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 hover:bg-rose-600 hover:text-white transition"
                  >
                    Revoke
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-slate-50/50 dark:bg-[#10131E] border border-dashed border-border-default text-center text-xs text-slate-400">
              <span>No Shortlisting Volunteers appointed yet.</span>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. APPOINT OR REPLACE STUDENT LEADER CONSOLE                              */}
      {/* ========================================================================= */}
      <div className="card-antigravity p-6 sm:p-8 rounded-3xl border border-border-default bg-white dark:bg-[#0A0C13] space-y-6">
        <div className="flex items-center gap-3 border-b border-border-default pb-4">
          <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center font-bold">
            <IconSparkles size={20} />
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">
              Appoint or Replace Student Event Leader
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Select the governance role and choose an officially verified VVCE student from the institutional roster.
            </p>
          </div>
        </div>

        <form onSubmit={handleAppoint} className="space-y-6">
          {/* Role Selector Tabs */}
          <div>
            <label className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2.5">
              1. SELECT GOVERNANCE ROLE
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <button
                type="button"
                onClick={() => { setRole('PRESIDENT'); setSelectedStudentId('') }}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  role === 'PRESIDENT'
                    ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/20 text-blue-900 dark:text-blue-200 shadow-sm'
                    : 'bg-slate-50 dark:bg-[#121520] border-border-default text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-xs uppercase tracking-wide">President</span>
                  <IconCrown size={16} className="text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">Executive Chair &amp; Shortlisting Committee Lead</p>
              </button>

              <button
                type="button"
                onClick={() => { setRole('VICE_PRESIDENT'); setSelectedStudentId('') }}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  role === 'VICE_PRESIDENT'
                    ? 'bg-purple-50/80 dark:bg-purple-950/40 border-purple-500 ring-2 ring-purple-500/20 text-purple-900 dark:text-purple-200 shadow-sm'
                    : 'bg-slate-50 dark:bg-[#121520] border-border-default text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-xs uppercase tracking-wide">Vice-President</span>
                  <IconAward size={16} className="text-purple-600 dark:text-purple-400" />
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">Second-in-Command &amp; Operations Vice-Chair</p>
              </button>

              <button
                type="button"
                onClick={() => { setRole('VOLUNTEER_COORDINATOR'); setSelectedStudentId('') }}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  role === 'VOLUNTEER_COORDINATOR'
                    ? 'bg-sky-50/80 dark:bg-sky-950/40 border-sky-500 ring-2 ring-sky-500/20 text-sky-900 dark:text-sky-200 shadow-sm'
                    : 'bg-slate-50 dark:bg-[#121520] border-border-default text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-xs uppercase tracking-wide">Student Coordinator</span>
                  <IconUserCheck size={16} className="text-sky-600 dark:text-sky-400" />
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">Volunteer Coordinator (Applied Volunteers Only)</p>
              </button>

              <button
                type="button"
                onClick={() => { setRole('SHORTLISTER_VOLUNTEER'); setSelectedStudentId('') }}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  role === 'SHORTLISTER_VOLUNTEER'
                    ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/20 text-indigo-900 dark:text-indigo-200 shadow-sm'
                    : 'bg-slate-50 dark:bg-[#121520] border-border-default text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-xs uppercase tracking-wide">Shortlisting Volunteer</span>
                  <IconShield size={16} className="text-indigo-600 dark:text-indigo-400" />
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">Committee Shortlister (Applied Volunteers Only)</p>
              </button>
            </div>
          </div>

          {/* Institutional Rule Notice for Volunteers */}
          {isVolunteerRole && sourceStudentList.length === 0 && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5 shadow-2xs">
              <span className="text-base">⚠️</span>
              <div>
                <strong className="block font-bold mb-0.5">Volunteer Application Required:</strong>
                <span>
                  No students have applied as volunteers for this event yet. Under institutional policy, volunteer selection for shortlisting or student coordinator can only be assigned if that student actually submitted a volunteer application for this event.
                </span>
              </div>
            </div>
          )}

          {/* Verified Student Selector */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                {isVolunteerRole ? '2. SELECT FROM APPLIED EVENT VOLUNTEERS' : '2. SELECT VERIFIED STUDENT FROM INSTITUTIONAL ROSTER'}
              </label>
              {isVolunteerRole && (
                <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
                  {sourceStudentList.length} Volunteer Applicants Available
                </span>
              )}
            </div>

            {/* Filter input */}
            <div className="relative">
              <IconSearch size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={studentSearchQuery}
                onChange={e => setStudentSearchQuery(e.target.value)}
                placeholder={isVolunteerRole ? "Search applied volunteers by name, USN..." : "Search by student name, USN, or department..."}
                className="input input-icon-left text-xs py-2.5 w-full rounded-xl"
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>

            <select
              className="input font-mono text-xs py-3 w-full font-medium rounded-xl"
              value={selectedStudentId}
              onChange={e => setSelectedStudentId(e.target.value)}
              disabled={isVolunteerRole && sourceStudentList.length === 0}
              required
            >
              <option value="">
                {isVolunteerRole
                  ? (sourceStudentList.length === 0 ? '-- No volunteer applicants available --' : `-- Choose from applied volunteers (${filteredStudents.length} available) --`)
                  : `-- Choose student from verified VVCE roster (${filteredStudents.length} available) --`}
              </option>
              {filteredStudents.map(s => (
                <option key={s.id} value={s.id}>
                  {s.full_name} ({s.usn}) · {s.department} · {s.email} {s.appliedVolunteer ? '· [Applied Volunteer]' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Submit Button */}
          <div className="pt-3 flex items-center justify-end">
            <button
              type="submit"
              disabled={appointing || !selectedStudentId || (isVolunteerRole && sourceStudentList.length === 0)}
              className="btn btn-primary px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-2xs active:scale-98 transition disabled:opacity-50"
            >
              <IconSparkles size={15} />
              <span>{appointing ? 'Appointing Student Leader...' : `Appoint as ${role.replace('_', ' ')}`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
