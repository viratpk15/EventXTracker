import React, { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { api } from '../api'
import { BackButton } from '../components/ui/BackButton'
import {
  IconBuilding,
  IconGraduationCap,
  IconUsers,
  IconUser,
  IconAward,
  IconFileText,
  IconCheckCircle,
  IconXCircle,
  IconAlertTriangle,
  IconSearch,
  IconDownload,
  IconPlus,
  IconExternalLink,
  IconLock,
  IconShield,
  IconClock,
  IconSparkles,
  IconEdit,
  IconTrash,
  IconCopy,
  IconEye,
  IconBriefcase,
  IconLayers,
  IconActivity,
  IconMapPin,
  IconCreditCard,
  IconMail,
  IconPhone,
  IconHash,
  IconCheck,
  IconPaperclip,
  IconHelpCircle,
  IconStar,
  IconSend,
  IconChevronUp,
  IconChevronDown,
  IconChevronRight,
  IconArchive,
  IconX,
  IconCalendar,
  IconMessageSquare,
  IconQrCode
} from '../components/ui/Icons'
import ImageFileUpload from '../components/ui/ImageFileUpload'

export type StudentTab =
  | 'normal_activities' // 1. Normal View: Student Profile & Registered Participations / Volunteering
  | 'coordination'      // 2. Special Section: Event Leadership & Coordination (President / VP / Shortlisting)
  | 'academics'         // 3. Academic Requests: Internship & External Event verification requests
  | 'security'          // Security & Password Settings

export default function StudentDashboard({ initialTab }: { initialTab?: StudentTab }) {
  const location = useLocation()

  const determineInitialTab = (): StudentTab => {
    if (initialTab) return initialTab
    const path = location.pathname.toLowerCase()
    if (path.includes('coordination') || path.includes('leadership')) return 'coordination'
    if (path.includes('academic') || path.includes('internship') || path.includes('external')) return 'academics'
    if (path.includes('security') || path.includes('profile')) return 'security'
    return 'normal_activities'
  }

  const [activeTab, setActiveTab] = useState<StudentTab>(determineInitialTab)
  const [me, setMe] = useState<any>(null)
  const [dash, setDash] = useState<any>(null)
  const [invitations, setInvitations] = useState<any[]>([])
  const [internships, setInternships] = useState<any[]>([])
  const [externalEvents, setExternalEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // 1. Normal View Filters
  const [activityFilter, setActivityFilter] = useState<'all' | 'participations' | 'volunteering'>('all')
  const [activitySearch, setActivitySearch] = useState('')

  // 2. Academic Requests Sub-Tab & Forms
  const [academicSubTab, setAcademicSubTab] = useState<'internships' | 'external'>('internships')
  const [showInternModal, setShowInternModal] = useState(false)
  const [showExtModal, setShowExtModal] = useState(false)

  // New Internship Submission Form
  const [internForm, setInternForm] = useState({
    company: '',
    role: '',
    start_date: '',
    end_date: '',
    mode: 'Hybrid',
    location: '',
    description: '',
    technologies: '',
    supervisor: '',
    document_path: '',
  })

  // New External Event Submission Form
  const [extForm, setExtForm] = useState({
    event_name: '',
    organization: '',
    category: 'Hackathon',
    event_date: '',
    location: '',
    description: '',
    participation_type: 'Team',
    achievement: '',
    document_path: '',
  })

  // Security / Password & Profile Personalization
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [profileForm, setProfileForm] = useState({
    avatar_url: '',
    quote: '',
  })
  const [savingProfile, setSavingProfile] = useState(false)

  // Shortlisted Team / Individual Fee Payment
  const [teamPayRef, setTeamPayRef] = useState<Record<number, string>>({})
  const [teamPayReceipt, setTeamPayReceipt] = useState<Record<number, string>>({})
  const [payingTeamId, setPayingTeamId] = useState<number | null>(null)

  useEffect(() => {
    setActiveTab(determineInitialTab())
  }, [location.pathname])

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    setError('')
    try {
      const [profile, d, invs, interns, exts] = await Promise.all([
        api.get('/auth/me'),
        api.get('/student/dashboard'),
        api.get('/teams/invitations').catch(() => []),
        api.get('/internships').catch(() => []),
        api.get('/external-events').catch(() => []),
      ])
      setMe(profile)
      setDash(d)
      setInvitations(invs || [])
      setInternships(interns || [])
      setExternalEvents(exts || [])
      if (profile?.profile) {
        setProfileForm({
          avatar_url: profile.profile.avatar_url || '',
          quote: profile.profile.quote || '',
        })
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load student dashboard')
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSavingProfile(true)
    setError(''); setSuccess('')
    try {
      await api.patch('/auth/profile', {
        avatar_url: profileForm.avatar_url,
        quote: profileForm.quote,
      })
      setSuccess('Profile customization saved successfully!')
      const updated = await api.get('/auth/me')
      setMe(updated)
    } catch (err: any) {
      setError(err.message || 'Failed to save profile')
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleRespondInvite(invId: number, accept: boolean) {
    setError(''); setSuccess('')
    try {
      await api.post(`/teams/invitations/${invId}/respond?accept=${accept}`)
      setSuccess(`Team invitation ${accept ? 'accepted' : 'declined'}`)
      loadAll()
    } catch (err: any) {
      setError(err.message || 'Failed to respond to team invitation')
    }
  }

  async function handlePayTeamFee(eventId: number, teamId: number) {
    const ref = (teamPayRef[teamId] || '').trim()
    if (!ref) {
      setError('Please enter your UTR / Transaction Reference number')
      return
    }
    setPayingTeamId(teamId)
    setError(''); setSuccess('')
    try {
      await api.post(`/events/${eventId}/teams/${teamId}/pay`, {
        transaction_ref: ref,
        payment_receipt_url: teamPayReceipt[teamId]?.trim() || null,
      })
      setSuccess('Payment confirmed! Official WhatsApp group link has been unlocked for your team.')
      loadAll()
    } catch (err: any) {
      setError(err.message || 'Payment submission failed')
    } finally {
      setPayingTeamId(null)
    }
  }

  async function handleSubmitInternship(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setSuccess('')
    try {
      await api.post('/internships', internForm)
      setSuccess('Internship verification request submitted to your assigned Class Teacher!')
      setInternForm({
        company: '', role: '', start_date: '', end_date: '', mode: 'Hybrid',
        location: '', description: '', technologies: '', supervisor: '', document_path: '',
      })
      setShowInternModal(false)
      loadAll()
    } catch (err: any) {
      setError(err.message || 'Failed to submit internship')
    }
  }

  async function handleSubmitExternal(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setSuccess('')
    try {
      await api.post('/external-events', extForm)
      setSuccess('External event participation request submitted to your assigned Class Teacher!')
      setExtForm({
        event_name: '', organization: '', category: 'Hackathon',
        event_date: '', location: '', description: '', participation_type: 'Team', achievement: '', document_path: '',
      })
      setShowExtModal(false)
      loadAll()
    } catch (err: any) {
      setError(err.message || 'Failed to submit external event')
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setSuccess('')
    try {
      await api.post('/auth/change-password', {
        old_password: oldPassword,
        new_password: newPassword,
      })
      setSuccess('Password updated successfully')
      setOldPassword(''); setNewPassword('')
      loadAll()
    } catch (err: any) {
      setError(err.message || 'Failed to change password')
    }
  }

  // --- Aggregate Student Activities for Normal View ---
  const allActivities: any[] = [
    ...(dash?.registrations || []).map((r: any) => ({
      id: `reg_${r.registration_id}`,
      kind: 'INDIVIDUAL',
      kindLabel: 'Individual Participant',
      event_id: r.event_id,
      event_name: r.event_name,
      category: r.event_category || 'General',
      venue: r.venue || 'Campus Venue',
      date: r.date || '-',
      titleOrTeam: `Reg ID: #${r.registration_id}`,
      status: r.status,
      payment_status: r.payment_status,
      whatsapp_group_url: r.whatsapp_group_url,
      registration_fee: r.registration_fee,
    })),
    ...(dash?.teams || []).map((t: any) => ({
      id: `team_${t.team_id}`,
      kind: t.is_leader ? 'TEAM_LEADER' : 'TEAM_MEMBER',
      kindLabel: t.is_leader ? 'Team Leader' : 'Team Member',
      event_id: t.event_id,
      event_name: t.event_name,
      category: t.event_category || 'General',
      venue: t.venue || 'Campus Venue',
      date: t.date || '-',
      titleOrTeam: `Team: ${t.team_name} ${t.project_title ? `· ${t.project_title}` : ''}`,
      status: t.status,
      payment_status: t.payment_status,
      whatsapp_group_url: t.whatsapp_group_url,
      registration_fee: t.registration_fee,
      team_id: t.team_id,
      is_leader: t.is_leader,
      invitation_status: t.invitation,
    })),
    ...(dash?.volunteer_applications || []).map((v: any) => ({
      id: `vol_${v.id || v.event_id}`,
      kind: 'VOLUNTEER',
      kindLabel: 'Volunteer Application',
      event_id: v.event_id,
      event_name: v.event_name,
      category: v.event_category || 'General',
      venue: v.venue || 'Campus Venue',
      date: v.date || '-',
      titleOrTeam: `Preferred: ${v.preferred_area || 'General Duties'} ${v.responsibility && v.responsibility !== '-' ? `· Assigned: ${v.responsibility}` : ''}`,
      status: v.status,
      payment_status: 'EXEMPT',
      completion_status: v.completion_status,
      whatsapp_group_url: null,
      registration_fee: 0,
    })),
  ]

  const filteredActivities = allActivities.filter(item => {
    if (activityFilter === 'participations' && item.kind === 'VOLUNTEER') return false
    if (activityFilter === 'volunteering' && item.kind !== 'VOLUNTEER') return false
    if (activitySearch.trim()) {
      const q = activitySearch.toLowerCase()
      const matchEvent = item.event_name?.toLowerCase().includes(q)
      const matchCat = item.category?.toLowerCase().includes(q)
      const matchVenue = item.venue?.toLowerCase().includes(q)
      const matchDetail = item.titleOrTeam?.toLowerCase().includes(q)
      if (!matchEvent && !matchCat && !matchVenue && !matchDetail) return false
    }
    return true
  })

  // Pending academic reviews count
  const pendingInternshipsCount = internships.filter(i => i.status === 'PENDING_REVIEW').length
  const pendingExternalCount = externalEvents.filter(e => e.status === 'PENDING_REVIEW').length

  return (
    <div className="space-y-6">
      {/* Top Left Come Back Navigation when on sub-menus or child pages */}
      {activeTab !== 'normal_activities' && (
        <div className="flex items-center justify-between">
          <BackButton
            to="/student/dashboard"
            label="Come Back to My Activities"
            size="sm"
            variant="outline"
            className="shadow-2xs font-semibold"
          />
        </div>
      )}

      {/* Global Alerts */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IconAlertTriangle className="text-rose-600 dark:text-rose-400" size={18} />
            <span className="font-medium">{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-rose-500 hover:text-rose-700 dark:text-rose-400">
            <IconX size={16} />
          </button>
        </div>
      )}
      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IconCheckCircle className="text-emerald-600 dark:text-emerald-400" size={18} />
            <span className="font-medium">{success}</span>
          </div>
          <button onClick={() => setSuccess('')} className="text-emerald-500 hover:text-emerald-700 dark:text-emerald-400">
            <IconX size={16} />
          </button>
        </div>
      )}

      {/* Mandatory password change prompt */}
      {me?.must_change_password && (
        <div className="card bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <IconAlertTriangle size={24} className="text-amber-600 dark:text-amber-400 shrink-0" />
              <div>
                <h4 className="font-bold text-amber-900 dark:text-amber-200 text-sm">Temporary Password Detected</h4>
                <p className="text-xs text-amber-800 dark:text-amber-300">You are logged in with a temporary password. Please update your permanent password.</p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('security')}
              className="btn-primary text-xs bg-amber-800 hover:bg-amber-900 shrink-0"
            >
              Update Password
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. NORMAL VIEW: MY ACTIVITIES & ROSTER                                   */}
      {/* ========================================================================= */}
      {activeTab === 'normal_activities' && (
        <div className="space-y-6">
          {/* Student Profile Card */}
          <div className="card-antigravity space-y-5 rounded-2xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                    {me?.profile?.full_name || me?.email || 'Student Member'}
                  </h1>
                  <span className="font-mono text-xs px-2.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-bold">
                    {me?.profile?.usn || 'USN'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                  <span>{me?.email}</span>
                  <span className="inline-block w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                  <span>Vidyavardhaka College of Engineering</span>
                </p>
              </div>

              {/* Badges: Department, Semester & Section */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1.5 shadow-2xs">
                  <IconBuilding size={14} />
                  <span>{me?.profile?.department || 'CSE'} Engineering</span>
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5">
                  <IconGraduationCap size={14} />
                  <span>Semester {me?.profile?.semester || me?.profile?.current_semester || 1} · Section {me?.profile?.section || 'A'}</span>
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                  <IconCheck size={14} />
                  <span>Enrolled ({me?.profile?.joining_year || 2023})</span>
                </span>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="stat-card">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Event Registrations
                </span>
                <span className="text-2xl font-extrabold text-slate-900 dark:text-white block mt-0.5">
                  {(dash?.registrations?.length || 0) + (dash?.teams?.length || 0)}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 block">Individual & Teams</span>
              </div>

              <div className="stat-card border-sky-200 dark:border-sky-900/50 bg-sky-50/40 dark:bg-sky-950/10">
                <span className="text-[11px] font-bold text-sky-800 dark:text-sky-400 uppercase tracking-wider block">
                  Volunteering Duties
                </span>
                <span className="text-2xl font-extrabold text-sky-900 dark:text-sky-200 block mt-0.5">
                  {dash?.volunteer_applications?.length || 0}
                </span>
                <span className="text-xs text-sky-700 dark:text-sky-400 block">Active applications</span>
              </div>

              <div className="stat-card border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/40 dark:bg-indigo-950/10">
                <span className="text-[11px] font-bold text-indigo-800 dark:text-indigo-400 uppercase tracking-wider block">
                  Team Invitations
                </span>
                <span className="text-2xl font-extrabold text-indigo-900 dark:text-indigo-200 block mt-0.5">
                  {invitations.length}
                </span>
                <span className="text-xs text-indigo-700 dark:text-indigo-400 block">Awaiting response</span>
              </div>

              <div className="stat-card border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/10">
                <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider block">
                  Shortlisted Events
                </span>
                <span className="text-2xl font-extrabold text-emerald-900 dark:text-emerald-200 block mt-0.5">
                  {allActivities.filter(a => a.status === 'SHORTLISTED' || a.status === 'PAID').length}
                </span>
                <span className="text-xs text-emerald-700 dark:text-emerald-400 block">Selected for competition</span>
              </div>
            </div>
          </div>

          {/* Action Required: Team Invitations */}
          {invitations.length > 0 && (
            <div className="card border-blue-300 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-950/20 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-blue-200 dark:border-blue-800 pb-2">
                <h3 className="font-bold text-blue-900 dark:text-blue-200 text-sm flex items-center gap-2">
                  <IconMail size={16} className="text-blue-600 dark:text-blue-400" />
                  <span>Action Required: Team Invitations ({invitations.length})</span>
                </h3>
                <span className="text-xs text-blue-800 dark:text-blue-300 font-semibold">Respond to join official roster</span>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                {invitations.map(inv => (
                  <div key={inv.id} className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-blue-200 dark:border-blue-800 shadow-sm flex items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white block">Team &ldquo;{inv.team_name}&rdquo;</span>
                      <span className="text-slate-500 dark:text-slate-400 text-[11px] block mt-0.5">Event #{inv.event_id}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleRespondInvite(inv.id, true)}
                        className="px-3.5 py-1.5 rounded-full bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 flex items-center gap-1.5 shadow-2xs transition active:scale-98"
                      >
                        <IconCheck size={14} />
                        <span>Accept</span>
                      </button>
                      <button
                        onClick={() => handleRespondInvite(inv.id, false)}
                        className="px-3.5 py-1.5 rounded-full bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 flex items-center gap-1.5 shadow-2xs transition active:scale-98"
                      >
                        <IconX size={14} />
                        <span>Decline</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Shortlisted Teams Awaiting Payment */}
          {dash?.teams?.some((t: any) => t.status === 'SHORTLISTED' && t.is_leader && t.payment_status !== 'PAID' && t.registration_fee > 0) && (
            <div className="card border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/20 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-emerald-200 dark:border-emerald-800 pb-2">
                <h3 className="font-bold text-emerald-900 dark:text-emerald-200 text-sm flex items-center gap-2">
                  <IconSparkles size={16} className="text-emerald-600 dark:text-emerald-400" />
                  <span>Congratulations! You have shortlisted teams awaiting fee completion</span>
                </h3>
                <span className="text-xs text-emerald-800 dark:text-emerald-300 font-semibold">Leader Payment Action Required</span>
              </div>
              <div className="space-y-3">
                {dash.teams
                  .filter((t: any) => t.status === 'SHORTLISTED' && t.is_leader && t.payment_status !== 'PAID' && t.registration_fee > 0)
                  .map((t: any) => (
                    <div key={t.team_id} className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-emerald-200 dark:border-emerald-800 shadow-sm space-y-3 text-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white text-sm block">Team: {t.team_name}</span>
                          <span className="text-slate-500 dark:text-slate-400">{t.event_name} · Registration Fee: <b>₹{t.registration_fee}</b></span>
                        </div>
                        <span className="badge badge-warning text-xs">Payment Required</span>
                      </div>

                      {t.payment_instructions && (
                        <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300 text-[11px] border border-slate-200 dark:border-slate-700">
                          <b>Instructions:</b> {t.payment_instructions}
                        </div>
                      )}

                      {t.payment_qr_url && (
                        <div className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                          <img src={t.payment_qr_url} alt="QR Code" className="w-16 h-16 object-contain rounded border border-slate-200 dark:border-slate-700" />
                          <div className="text-[11px] text-slate-600 dark:text-slate-300">
                            <span className="font-bold text-slate-800 dark:text-white block">Scan Official Payment QR Code</span>
                            <span>Scan with any UPI app to pay ₹{t.registration_fee}</span>
                          </div>
                        </div>
                      )}

                      <div className="grid sm:grid-cols-3 gap-2 pt-1">
                        <div className="sm:col-span-2">
                          <input
                            className="input py-1.5 text-xs font-mono"
                            placeholder="Enter 12-digit UTR / UPI Transaction Reference *"
                            value={teamPayRef[t.team_id] || ''}
                            onChange={e => setTeamPayRef({ ...teamPayRef, [t.team_id]: e.target.value })}
                          />
                        </div>
                        <button
                          onClick={() => handlePayTeamFee(t.event_id, t.team_id)}
                          disabled={payingTeamId === t.team_id}
                          className="btn-success text-xs font-bold py-1.5 flex items-center justify-center gap-1.5"
                        >
                          <IconCreditCard size={14} />
                          <span>{payingTeamId === t.team_id ? 'Verifying…' : 'Submit Payment & Unlock Group'}</span>
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Registered Activities List */}
          <div className="card space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <IconLayers size={18} className="text-blue-600 dark:text-purple-400" />
                  <span>My Event Participations & Volunteering Duties</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Complete official record of events you are participating in or registered as a volunteer.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  to="/student/events"
                  className="btn btn-primary px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm shadow-blue-500/20 active:scale-98 transition"
                >
                  <IconSearch size={15} />
                  <span>Browse Campus Events</span>
                </Link>
              </div>
            </div>

            {/* Filter Buttons & Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-semibold overflow-x-auto">
                <button
                  onClick={() => setActivityFilter('all')}
                  className={`px-3 py-1.5 rounded-md transition-all ${
                    activityFilter === 'all'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  All Activities ({allActivities.length})
                </button>
                <button
                  onClick={() => setActivityFilter('participations')}
                  className={`px-3 py-1.5 rounded-md transition-all ${
                    activityFilter === 'participations'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Participating ({allActivities.filter(a => a.kind !== 'VOLUNTEER').length})
                </button>
                <button
                  onClick={() => setActivityFilter('volunteering')}
                  className={`px-3 py-1.5 rounded-md transition-all ${
                    activityFilter === 'volunteering'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Volunteering ({allActivities.filter(a => a.kind === 'VOLUNTEER').length})
                </button>
              </div>

              <div className="relative w-full sm:w-64">
                <IconSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  className="input input-icon-left py-1.5 text-xs"
                  style={{ paddingLeft: '2.5rem' }}
                  placeholder="Search event name, venue, category..."
                  value={activitySearch}
                  onChange={e => setActivitySearch(e.target.value)}
                />
              </div>
            </div>

            {/* Table of Activities */}
            {filteredActivities.length === 0 ? (
              <div className="p-10 text-center text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-xs space-y-2">
                <IconCalendar size={36} className="mx-auto text-slate-300 dark:text-slate-600 mb-1" />
                <p className="font-semibold text-slate-700 dark:text-slate-300">No registered activities found.</p>
                <p className="text-slate-400 dark:text-slate-500">Browse campus events to register as an individual participant, team member, or volunteer.</p>
                <Link
                  to="/student/events"
                  className="btn btn-primary px-3.5 py-1.5 rounded-xl text-xs font-semibold mt-3 inline-flex items-center gap-1.5 shadow-2xs active:scale-98 transition"
                >
                  <IconSearch size={15} />
                  <span>Explore Events Now</span>
                </Link>
              </div>
            ) : (
              <div className="table-container max-h-[600px] overflow-y-auto">
                <table className="table-enterprise">
                  <thead>
                    <tr>
                      <th>Activity Mode</th>
                      <th>Event Name</th>
                      <th>Category & Venue</th>
                      <th>Event Date</th>
                      <th>Status</th>
                      <th>Payment / WhatsApp</th>
                      <th className="text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredActivities.map(item => (
                      <tr key={item.id}>
                        <td>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-2xs ${
                            item.kind === 'VOLUNTEER'
                              ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800'
                              : item.kind === 'TEAM_LEADER'
                                ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                                : item.kind === 'TEAM_MEMBER'
                                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                                  : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          }`}>
                            {item.kindLabel}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-1 font-medium truncate max-w-[200px]">
                            {item.titleOrTeam}
                          </span>
                        </td>
                        <td>
                          <span className="font-bold text-slate-900 dark:text-white block text-xs">
                            {item.event_name}
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                            Event #{item.event_id}
                          </span>
                        </td>
                        <td>
                          <span className="font-medium text-slate-700 dark:text-slate-300 block">{item.category}</span>
                          <span className="text-slate-400 dark:text-slate-500 text-[11px] block">{item.venue}</span>
                        </td>
                        <td className="text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                          {item.date}
                        </td>
                        <td>
                          <span className={`badge ${
                            item.status === 'SHORTLISTED' || item.status === 'APPROVED' || item.status === 'PAID'
                              ? 'badge-success'
                              : item.status === 'REJECTED'
                                ? 'badge-danger'
                                : 'badge-neutral'
                          }`}>
                            {item.status}
                          </span>
                          {item.completion_status && item.completion_status !== 'PENDING' && (
                            <span className="badge badge-success text-[9px] block mt-1">
                              {item.completion_status}
                            </span>
                          )}
                        </td>
                        <td>
                          {item.whatsapp_group_url ? (
                            <a
                              href={item.whatsapp_group_url}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3.5 py-1.5 rounded-full bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 inline-flex items-center gap-1.5 shadow-2xs transition active:scale-98"
                            >
                              <IconMessageSquare size={14} />
                              <span>Join WhatsApp</span>
                            </a>
                          ) : item.registration_fee > 0 ? (
                            <span className={`text-[11px] font-semibold ${item.payment_status === 'PAID' ? 'text-emerald-700 dark:text-emerald-400' : 'text-blue-700 dark:text-blue-400'}`}>
                              ₹{item.registration_fee} ({item.payment_status || 'UNPAID'})
                            </span>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500 text-[11px]">Free Event</span>
                          )}
                        </td>
                        <td className="text-right">
                          <Link
                            to={`/student/events/${item.event_id}`}
                            className="px-3.5 py-1.5 rounded-full text-xs font-bold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition shadow-2xs inline-flex items-center gap-1.5 ml-auto active:scale-98"
                          >
                            <span>Details</span>
                            <IconChevronRight size={15} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. SPECIAL SECTION: EVENT LEADERSHIP & COORDINATION                       */}
      {/* ========================================================================= */}
      {activeTab === 'coordination' && (
        <div className="space-y-6">
          <div className="card bg-gradient-to-br from-blue-50/90 via-indigo-50/50 to-white dark:from-[#0E1017] dark:via-purple-950/40 dark:to-black text-slate-900 dark:text-white p-6 space-y-3 border border-blue-200/80 dark:border-purple-800/60 shadow-lg shadow-blue-500/5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="w-10 h-10 rounded-xl bg-blue-500/10 dark:bg-purple-500/20 text-blue-600 dark:text-purple-400 border border-blue-500/20 dark:border-purple-500/30 flex items-center justify-center shadow-xs">
                    <IconAward size={24} />
                  </span>
                  <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                    Student Event Leadership & Coordination
                  </h1>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  Official operational workspace for students appointed by Faculty Coordinators as Presidents, Vice Presidents, or Shortlisting Volunteers.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200 dark:bg-purple-900/60 dark:text-purple-200 dark:border-purple-700 shadow-2xs">
                  {dash?.leadership?.length || 0} Appointed Leadership Roles
                </span>
              </div>
            </div>
          </div>

          {/* Appointed Roles Cards */}
          {(!dash?.leadership || dash.leadership.length === 0) ? (
            <div className="card p-10 text-center space-y-3 bg-white dark:bg-slate-900">
              <IconLock size={36} className="mx-auto text-slate-300 dark:text-slate-600" />
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-base">
                No Active Event Leadership Roles Appointed
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Student Leadership positions (President, Vice President, Shortlisting Volunteer, and Volunteer Coordinator) are appointed by Faculty Coordinators strictly from the verified registered volunteer applicants roster.
              </p>
              <div className="pt-2">
                <Link
                  to="/student/events"
                  className="btn-primary text-xs font-semibold py-2 px-4 inline-flex items-center gap-1.5"
                >
                  <span>Browse Campus Events & Apply as Volunteer</span>
                  <IconExternalLink size={16} />
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Your Appointed Event Leadership Roles</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">You hold operational authority to shortlist submissions and coordinate these events:</p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {dash.leadership.map((lead: any) => (
                  <div key={lead.id} className="card card-hover p-5 space-y-4 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                            lead.role === 'PRESIDENT'
                              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                              : lead.role === 'VICE_PRESIDENT'
                                ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800'
                                : 'bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                          }`}>
                            {lead.role === 'PRESIDENT' ? 'President (Head)' : lead.role === 'VICE_PRESIDENT' ? 'Vice President' : lead.role.replace('_', ' ')}
                          </span>
                          <h3 className="text-base font-bold text-slate-900 dark:text-white mt-2">{lead.event_name}</h3>
                        </div>
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-border-default">
                          {lead.event_status || 'ACTIVE'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {lead.event_category} · {lead.venue}
                      </p>
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1 text-slate-600 dark:text-slate-300">
                        <span className="font-bold text-slate-800 dark:text-white block">Operational Responsibilities:</span>
                        <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                          <li>Inspect team project abstracts and pitch deck presentations</li>
                          <li>Shortlist eligible teams and individual registrants</li>
                          <li>Record podium winners and medal achievements</li>
                        </ul>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
                      <Link
                        to={`/student/events/${lead.event_id}`}
                        className="btn btn-primary px-5 py-2.5 text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm shadow-blue-500/20 active:scale-98 transition"
                      >
                        <span>Open Event Workspace</span>
                        <IconExternalLink size={16} />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. ACADEMIC REQUESTS (INTERNSHIPS & EXTERNAL EVENTS)                       */}
      {/* ========================================================================= */}
      {activeTab === 'academics' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="card bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-transparent border-blue-200 dark:border-blue-900/60 p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <IconFileText size={22} className="text-blue-600 dark:text-blue-400" />
                  <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                    Academic Verification & Approval Requests
                  </h1>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Submit industry internships and external college event achievements for official Class Teacher evaluation and academic credit verification.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setShowInternModal(true)}
                  className="btn btn-primary px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs active:scale-98 transition"
                >
                  <IconPlus size={14} />
                  <span>Submit Internship</span>
                </button>
                <button
                  onClick={() => setShowExtModal(true)}
                  className="btn btn-secondary px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 active:scale-98 transition"
                >
                  <IconPlus size={14} />
                  <span>Submit External Event</span>
                </button>
              </div>
            </div>

            {/* Sub-Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setAcademicSubTab('internships')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
                  academicSubTab === 'internships'
                    ? 'bg-blue-600 text-white shadow-xs font-bold'
                    : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700'
                }`}
              >
                <IconBriefcase size={14} />
                <span>Internship Requests ({internships.length})</span>
                {pendingInternshipsCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 font-extrabold">
                    {pendingInternshipsCount} Pending
                  </span>
                )}
              </button>
              <button
                onClick={() => setAcademicSubTab('external')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
                  academicSubTab === 'external'
                    ? 'bg-blue-600 text-white shadow-xs font-bold'
                    : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700'
                }`}
              >
                <IconAward size={14} />
                <span>External Event Requests ({externalEvents.length})</span>
                {pendingExternalCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 font-extrabold">
                    {pendingExternalCount} Pending
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* SUB-VIEW 3A: INTERNSHIP REQUESTS TABLE */}
          {academicSubTab === 'internships' && (
            <div className="card space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">Submitted Internship Verification Requests</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Track approvals sent to your assigned Class Teacher</p>
                </div>
                <button
                  onClick={() => setShowInternModal(true)}
                  className="btn-primary btn-sm text-xs flex items-center gap-1.5"
                >
                  <IconPlus size={14} />
                  <span>New Internship Request</span>
                </button>
              </div>

              {internships.length === 0 ? (
                <div className="p-8 text-center text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-xs space-y-2">
                  <IconBriefcase size={36} className="mx-auto text-slate-300 dark:text-slate-600" />
                  <p className="font-semibold text-slate-700 dark:text-slate-300">No internship verification requests submitted yet.</p>
                  <p>Click the button above to submit your internship completion certificate or offer letter.</p>
                </div>
              ) : (
                <div className="table-container">
                  <table className="table-enterprise">
                    <thead>
                      <tr>
                        <th>Company & Role</th>
                        <th>Mode & Location</th>
                        <th>Duration Dates</th>
                        <th>Submitted Proof</th>
                        <th>Class Teacher Status</th>
                        <th>Feedback / Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {internships.map(i => (
                        <tr key={i.id}>
                          <td>
                            <span className="font-bold text-slate-900 dark:text-white block">{i.company}</span>
                            <span className="text-slate-500 dark:text-slate-400 text-[11px]">{i.role || 'Intern'}</span>
                          </td>
                          <td className="text-slate-700 dark:text-slate-300 font-medium">
                            {i.mode || 'Hybrid'} {i.location ? `· ${i.location}` : ''}
                          </td>
                          <td className="font-mono text-[11px] text-slate-600 dark:text-slate-400">
                            {i.start_date || '—'} to {i.end_date || '—'}
                          </td>
                          <td>
                            {i.document_path ? (
                              <a
                                href={i.document_path}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 dark:text-blue-400 hover:underline font-semibold text-xs flex items-center gap-1"
                              >
                                <IconPaperclip size={13} />
                                <span>Certificate ↗</span>
                              </a>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-500 text-xs">No link attached</span>
                            )}
                          </td>
                          <td>
                            <span className={`badge ${
                              i.status === 'VERIFIED'
                                ? 'badge-success'
                                : i.status === 'REJECTED'
                                  ? 'badge-danger'
                                  : i.status === 'ON_HOLD'
                                    ? 'badge-neutral'
                                    : 'badge-warning'
                            }`}>
                              {i.status === 'PENDING_REVIEW' ? 'Pending Review' : i.status}
                            </span>
                            {i.evidence_inspected && (
                              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block mt-0.5 font-semibold">
                                ✓ Evidence Inspected
                              </span>
                            )}
                          </td>
                          <td className="text-slate-600 dark:text-slate-300 text-xs max-w-xs">
                            {i.review_notes ? (
                              <span className="p-1.5 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-[11px] block text-slate-700 dark:text-slate-300">
                                {i.review_notes}
                              </span>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-500 text-[11px] italic">Awaiting review</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* SUB-VIEW 3B: EXTERNAL EVENT REQUESTS TABLE */}
          {academicSubTab === 'external' && (
            <div className="card space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">Submitted External Event Verification Requests</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Hackathons, symposia, and inter-college competitions</p>
                </div>
                <button
                  onClick={() => setShowExtModal(true)}
                  className="btn-primary btn-sm text-xs flex items-center gap-1.5"
                >
                  <IconPlus size={14} />
                  <span>New External Event Request</span>
                </button>
              </div>

              {externalEvents.length === 0 ? (
                <div className="p-8 text-center text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-xs space-y-2">
                  <IconAward size={36} className="mx-auto text-slate-300 dark:text-slate-600" />
                  <p className="font-semibold text-slate-700 dark:text-slate-300">No external event records submitted yet.</p>
                  <p>Submit certificates from external hackathons or symposiums for verified recognition.</p>
                </div>
              ) : (
                <div className="table-container">
                  <table className="table-enterprise">
                    <thead>
                      <tr>
                        <th>Event & Host</th>
                        <th>Category & Date</th>
                        <th>Achievement / Medal</th>
                        <th>Certificate Proof</th>
                        <th>Class Teacher Status</th>
                        <th>Feedback / Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {externalEvents.map(e => (
                        <tr key={e.id}>
                          <td>
                            <span className="font-bold text-slate-900 dark:text-white block">{e.event_name}</span>
                            <span className="text-slate-500 dark:text-slate-400 text-[11px]">{e.organization || 'External University'}</span>
                          </td>
                          <td className="text-slate-700 dark:text-slate-300">
                            <span className="font-semibold">{e.category || 'Hackathon'}</span>
                            <span className="text-slate-400 dark:text-slate-500 font-mono text-[11px] block">{e.event_date || '—'}</span>
                          </td>
                          <td>
                            <span className="font-bold text-indigo-700 dark:text-indigo-400">{e.achievement || 'Participant'}</span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 block">{e.participation_type || 'Team'}</span>
                          </td>
                          <td>
                            {e.document_path ? (
                              <a
                                href={e.document_path}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 dark:text-blue-400 hover:underline font-semibold text-xs flex items-center gap-1"
                              >
                                <IconPaperclip size={13} />
                                <span>Certificate ↗</span>
                              </a>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-500 text-xs">No link attached</span>
                            )}
                          </td>
                          <td>
                            <span className={`badge ${
                              e.status === 'VERIFIED'
                                ? 'badge-success'
                                : e.status === 'REJECTED'
                                  ? 'badge-danger'
                                  : e.status === 'ON_HOLD'
                                    ? 'badge-neutral'
                                    : 'badge-warning'
                            }`}>
                              {e.status === 'PENDING_REVIEW' ? 'Pending Review' : e.status}
                            </span>
                            {e.evidence_inspected && (
                              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block mt-0.5 font-semibold">
                                ✓ Evidence Inspected
                              </span>
                            )}
                          </td>
                          <td className="text-slate-600 dark:text-slate-300 text-xs max-w-xs">
                            {e.review_notes ? (
                              <span className="p-1.5 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-[11px] block text-slate-700 dark:text-slate-300">
                                {e.review_notes}
                              </span>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-500 text-[11px] italic">Awaiting review</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Modal: Submit Internship Request */}
          {showInternModal && (
            <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
              <div className="card max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Submit Internship Verification Request</h3>
                  <button onClick={() => setShowInternModal(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-300">
                    <IconX size={18} />
                  </button>
                </div>
                <form onSubmit={handleSubmitInternship} className="space-y-3 text-xs">
                  <div>
                    <label className="label">Company / Organization *</label>
                    <input
                      className="input"
                      placeholder="e.g. Infosys, Bosch, Startup Inc."
                      value={internForm.company}
                      onChange={e => setInternForm({ ...internForm, company: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Role / Domain *</label>
                      <input
                        className="input"
                        placeholder="e.g. AI / Full Stack Intern"
                        value={internForm.role}
                        onChange={e => setInternForm({ ...internForm, role: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="label">Work Mode</label>
                      <select
                        className="input"
                        value={internForm.mode}
                        onChange={e => setInternForm({ ...internForm, mode: e.target.value })}
                      >
                        <option value="Hybrid">Hybrid</option>
                        <option value="Remote">Remote</option>
                        <option value="In-Person">In-Person (On-Site)</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Start Date *</label>
                      <input
                        className="input"
                        type="date"
                        value={internForm.start_date}
                        onChange={e => setInternForm({ ...internForm, start_date: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="label">End Date *</label>
                      <input
                        className="input"
                        type="date"
                        value={internForm.end_date}
                        onChange={e => setInternForm({ ...internForm, end_date: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <ImageFileUpload
                    label="Completion Certificate or Offer Letter (Picture / PDF Upload) *"
                    value={internForm.document_path}
                    onChange={url => setInternForm({ ...internForm, document_path: url })}
                    accept="image/*,.pdf"
                    placeholder="Click or drag certificate or offer letter (PNG / JPG / PDF)"
                    helperText="Upload your official certificate picture or PDF issued by the company."
                    required
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Supervisor / Mentor</label>
                      <input
                        className="input"
                        placeholder="Name, Designation, Email"
                        value={internForm.supervisor}
                        onChange={e => setInternForm({ ...internForm, supervisor: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="label">Technologies Used</label>
                      <input
                        className="input"
                        placeholder="React, Python, AWS, Docker"
                        value={internForm.technologies}
                        onChange={e => setInternForm({ ...internForm, technologies: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="label">Work Description & Key Learnings</label>
                    <textarea
                      className="input"
                      rows={3}
                      placeholder="Describe your project responsibilities and key learnings..."
                      value={internForm.description}
                      onChange={e => setInternForm({ ...internForm, description: e.target.value })}
                    />
                  </div>
                  <div className="pt-3 flex justify-end gap-2.5 border-t border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowInternModal(false)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary px-4 py-2 rounded-xl text-xs font-semibold shadow-2xs active:scale-98"
                    >
                      Submit for Class Teacher Review
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal: Submit External Event Request */}
          {showExtModal && (
            <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
              <div className="card max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Submit External Event Participation Request</h3>
                  <button onClick={() => setShowExtModal(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-300">
                    <IconX size={18} />
                  </button>
                </div>
                <form onSubmit={handleSubmitExternal} className="space-y-3 text-xs">
                  <div>
                    <label className="label">Event Name *</label>
                    <input
                      className="input"
                      placeholder="e.g. Smart India Hackathon, TechFest 2026"
                      value={extForm.event_name}
                      onChange={e => setExtForm({ ...extForm, event_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Organizing College / Institution *</label>
                      <input
                        className="input"
                        placeholder="e.g. IIT Bombay, NITK Surathkal"
                        value={extForm.organization}
                        onChange={e => setExtForm({ ...extForm, organization: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="label">Category</label>
                      <select
                        className="input"
                        value={extForm.category}
                        onChange={e => setExtForm({ ...extForm, category: e.target.value })}
                      >
                        <option value="Hackathon">Hackathon</option>
                        <option value="Technical Paper">Technical Paper</option>
                        <option value="Coding Contest">Coding Contest</option>
                        <option value="Symposium">Technical Symposium</option>
                        <option value="Cultural">Cultural / Sports</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Event Date *</label>
                      <input
                        className="input"
                        type="date"
                        value={extForm.event_date}
                        onChange={e => setExtForm({ ...extForm, event_date: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="label">Award / Position Won</label>
                      <input
                        className="input"
                        placeholder="1st Place, 2nd Place, Finalist, Participant"
                        value={extForm.achievement}
                        onChange={e => setExtForm({ ...extForm, achievement: e.target.value })}
                      />
                    </div>
                  </div>
                  <ImageFileUpload
                    label="Participation Proof / Certificate (Picture / PDF Upload) *"
                    value={extForm.document_path}
                    onChange={url => setExtForm({ ...extForm, document_path: url })}
                    accept="image/*,.pdf"
                    placeholder="Click or drag certificate or award photo (PNG / JPG / PDF)"
                    helperText="Upload your official certificate picture or proof document."
                    required
                  />
                  <div>
                    <label className="label">Project Summary / Event Description</label>
                    <textarea
                      className="input"
                      rows={3}
                      placeholder="Briefly describe your solution, paper title, or performance..."
                      value={extForm.description}
                      onChange={e => setExtForm({ ...extForm, description: e.target.value })}
                    />
                  </div>
                  <div className="pt-3 flex justify-end gap-2.5 border-t border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowExtModal(false)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary px-4 py-2 rounded-xl text-xs font-semibold shadow-2xs active:scale-98"
                    >
                      Submit for Class Teacher Review
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. PROFILE CUSTOMIZATION & SECURITY SETTINGS                              */}
      {/* ========================================================================= */}
      {activeTab === 'security' && (
        <div className="space-y-6 max-w-3xl mx-auto">
          {/* SECTION 1: VERIFIED INSTITUTIONAL CREDENTIALS (NON-EDITABLE) */}
          <div className="card space-y-4 p-6 border-slate-200 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <IconShield size={18} className="text-blue-600 dark:text-blue-400" />
                  <span>Institutional Academic Identity</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Official student academic registry issued and verified by Vidyavardhaka College of Engineering.
                </p>
              </div>
              <span className="badge badge-neutral text-xs flex items-center gap-1.5 self-start sm:self-auto">
                <IconLock size={12} className="text-slate-500" />
                <span>Institutional Record · Read Only</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="label flex items-center justify-between">
                  <span>Student Full Name</span>
                  <IconLock size={11} className="text-slate-400" />
                </label>
                <input
                  className="input bg-slate-100 dark:bg-slate-800/60 font-semibold cursor-not-allowed opacity-85"
                  value={me?.profile?.full_name || '—'}
                  disabled
                  readOnly
                />
              </div>

              <div>
                <label className="label flex items-center justify-between">
                  <span>University Seat Number (USN)</span>
                  <IconLock size={11} className="text-slate-400" />
                </label>
                <input
                  className="input bg-slate-100 dark:bg-slate-800/60 font-mono font-bold cursor-not-allowed opacity-85"
                  value={me?.profile?.usn || '—'}
                  disabled
                  readOnly
                />
              </div>

              <div>
                <label className="label flex items-center justify-between">
                  <span>Department / Branch</span>
                  <IconLock size={11} className="text-slate-400" />
                </label>
                <input
                  className="input bg-slate-100 dark:bg-slate-800/60 font-semibold cursor-not-allowed opacity-85"
                  value={me?.profile?.department || '—'}
                  disabled
                  readOnly
                />
              </div>

              <div>
                <label className="label flex items-center justify-between">
                  <span>Semester & Section</span>
                  <IconLock size={11} className="text-slate-400" />
                </label>
                <input
                  className="input bg-slate-100 dark:bg-slate-800/60 font-semibold cursor-not-allowed opacity-85"
                  value={`Semester ${me?.profile?.semester || me?.profile?.current_semester || 1} · Section ${me?.profile?.section || 'A'}`}
                  disabled
                  readOnly
                />
              </div>

              <div className="sm:col-span-2">
                <label className="label flex items-center justify-between">
                  <span>Official Campus Email</span>
                  <IconLock size={11} className="text-slate-400" />
                </label>
                <input
                  className="input bg-slate-100 dark:bg-slate-800/60 font-mono cursor-not-allowed opacity-85"
                  value={me?.email || '—'}
                  disabled
                  readOnly
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 text-xs text-slate-500 dark:text-slate-400 flex items-start gap-2.5">
              <IconLock size={15} className="text-slate-400 mt-0.5 shrink-0" />
              <span>
                <b>Academic Protection Policy:</b> Student legal name, USN, academic branch, semester, and section cannot be modified locally. Changes require formal approval from the Department HOD and Academic Registrar.
              </span>
            </div>
          </div>

          {/* SECTION 2: PROFILE PICTURE & FAVORITE QUOTE CUSTOMIZATION (ALLOWED) */}
          <div className="card space-y-4 p-6 border-slate-200 dark:border-slate-800">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <IconUser size={18} className="text-purple-600 dark:text-purple-400" />
                <span>Profile Customization</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Personalize your public display avatar and inspirational quote across campus activity rosters.
              </p>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              {/* Avatar Live Preview & Upload */}
              <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60">
                <div className="shrink-0 text-center">
                  <div className="w-20 h-20 rounded-full mx-auto overflow-hidden bg-slate-200 dark:bg-slate-700 border-2 border-blue-500 flex items-center justify-center text-slate-600 dark:text-slate-200 font-extrabold text-2xl shadow-sm">
                    {profileForm.avatar_url ? (
                      <img
                        src={profileForm.avatar_url}
                        alt="Profile Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                      />
                    ) : (
                      <span>{me?.profile?.full_name?.[0] || 'U'}</span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block font-mono">Avatar Preview</span>
                </div>

                <div className="flex-1 w-full">
                  <ImageFileUpload
                    label="Upload Profile Photo / Avatar (PNG, JPG)"
                    value={profileForm.avatar_url}
                    onChange={url => setProfileForm({ ...profileForm, avatar_url: url })}
                    accept="image/*"
                    placeholder="Click or drag to upload your profile photo"
                    helperText="Upload a crisp portrait photo or enter an image URL directly."
                  />
                </div>
              </div>

              {/* Favorite Quote / Bio Input */}
              <div>
                <label className="label">Favorite Quote / Motto / Short Bio</label>
                <textarea
                  className="input"
                  rows={2}
                  maxLength={500}
                  placeholder="e.g. Dream big, build relentlessly, and solve meaningful problems."
                  value={profileForm.quote}
                  onChange={e => setProfileForm({ ...profileForm, quote: e.target.value })}
                />
                <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1">
                  <span>Displayed on your student profile chip and event badges.</span>
                  <span>{profileForm.quote?.length || 0} / 500 characters</span>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="btn btn-primary px-4 py-2 rounded-xl text-xs font-semibold shadow-2xs active:scale-98"
                >
                  {savingProfile ? 'Saving Changes…' : 'Save Profile Customization'}
                </button>
              </div>
            </form>
          </div>

          {/* SECTION 3: ACCOUNT PASSWORD UPDATE */}
          <div className="card space-y-4 p-6 border-slate-200 dark:border-slate-800">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <IconLock size={18} className="text-blue-600 dark:text-purple-400" />
                <span>Change Account Password</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Update your login password to maintain high account security.
              </p>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Current Password *</label>
                  <input
                    type="password"
                    className="input"
                    value={oldPassword}
                    onChange={e => setOldPassword(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="label">New Permanent Password *</label>
                  <input
                    type="password"
                    className="input"
                    placeholder="At least 8 characters"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="btn btn-primary px-4 py-2 rounded-xl text-xs font-semibold shadow-2xs active:scale-98"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
