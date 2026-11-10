import React, { useEffect, useState } from 'react'
import { useParams, Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { api, getAccountType } from '../api'
import { DynamicFormBuilder } from '../components/forms/DynamicFormBuilder'
import { DynamicFormRenderer } from '../components/forms/DynamicFormRenderer'
import { MultiFormPreviewModal } from '../components/forms/MultiFormPreviewModal'
import { BackButton } from '../components/ui/BackButton'
import {
  IconMapPin,
  IconCalendar,
  IconUsers,
  IconUser,
  IconAward,
  IconFileText,
  IconCheckCircle,
  IconXCircle,
  IconAlertTriangle,
  IconDownload,
  IconSparkles,
  IconEdit,
  IconCheck,
  IconX,
  IconExternalLink,
  IconClock,
  IconMessageSquare,
  IconCreditCard,
  IconQrCode,
  IconLayers,
  IconPaperclip,
  IconUserCheck,
  IconHeartHandshake,
  IconShield,
  IconTrash,
  IconEye
} from '../components/ui/Icons'
import ImageFileUpload from '../components/ui/ImageFileUpload'

type Tab =
  | 'details'
  | 'register'
  | 'teams'
  | 'volunteers'
  | 'form_builder'
  | 'participants'
  | 'attendance'
  | 'winners'
  | 'leadership'
  | 'reports'

export default function EventDetail({ initialTab }: { initialTab?: string }) {
  const mapTab = (t?: string): Tab => {
    if (t === 'builder' || t === 'form_builder') return 'form_builder'
    if (t === 'participants') return 'participants'
    if (t === 'team' || t === 'teams') return 'teams'
    if (t === 'volunteer' || t === 'volunteers') return 'volunteers'
    if (t === 'attendance') return 'attendance'
    if (t === 'winners') return 'winners'
    if (t === 'leadership') return 'leadership'
    if (t === 'reports') return 'reports'
    if (t === 'register') return 'register'
    return 'details'
  }

  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { id } = useParams()
  const eventId = Number(id)
  const accountType = getAccountType()

  const queryTab = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    if (location.pathname.endsWith('/form-builder')) return 'form_builder'
    return mapTab(queryTab || initialTab)
  })

  useEffect(() => {
    if (location.pathname.endsWith('/form-builder')) {
      setActiveTab('form_builder')
    } else {
      const target = queryTab || initialTab
      if (target) {
        setActiveTab(mapTab(target))
      }
    }
  }, [location.pathname, initialTab, queryTab])

  const [ev, setEv] = useState<any>(null)
  const [form, setForm] = useState<any>(null)
  const [status, setStatus] = useState<any>(null)
  const [me, setMe] = useState<any>(null)
  const [leadership, setLeadership] = useState<any[]>([])
  const [volunteers, setVolunteers] = useState<any[]>([])
  const [participants, setParticipants] = useState<any>({ individuals: [], teams: [] })
  const [shortlistedTeams, setShortlistedTeams] = useState<any[]>([])
  const [attendance, setAttendance] = useState<any[]>([])
  const [winners, setWinners] = useState<any[]>([])
  const [submissions, setSubmissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingEvent, setDeletingEvent] = useState(false)

  const handleDeleteEvent = async () => {
    setDeletingEvent(true)
    try {
      await api.delete(`/events/${eventId}`)
      navigate('/faculty/dashboard')
    } catch (err: any) {
      alert(err.message || 'Failed to delete event')
      setDeletingEvent(false)
    }
  }

  // Student Form Registration
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [submittingReg, setSubmittingReg] = useState(false)

  // Unified Registration Purpose & Entry Choice
  const [applyPurpose, setApplyPurpose] = useState<'participate' | 'volunteer'>('participate')
  const [entryMode, setEntryMode] = useState<'team' | 'individual'>('team')

  // Individual Registration Form State (Default Option 2)
  const [indivForm, setIndivForm] = useState({
    phone: '',
    project_title: '',
    abstract: '',
    pitch_deck_url: '',
    id_proof_url: '',
  })

  // Shortlisted Payment State
  const [payRef, setPayRef] = useState('')
  const [payReceipt, setPayReceipt] = useState('')
  const [submittingPayment, setSubmittingPayment] = useState(false)

  // Team Creation Form
  const [teamForm, setTeamForm] = useState({
    team_name: '', project_title: '', problem_statement: '',
    proposed_solution: '', tech_stack: '', member_usns: '',
    pitch_deck_url: '', id_proof_url: '',
  })

  // Volunteer Application Form
  const [volForm, setVolForm] = useState({
    phone: '', skills: 'Event Coordination', preferred_area: 'Logistics & Stage', experience: '', availability: 'Full Day'
  })

  // Form Builder State (Faculty Coordinator)
  const [builderQuestions, setBuilderQuestions] = useState<any[]>([])
  const [newQuestionType, setNewQuestionType] = useState('short_text')
  const [publishingForm, setPublishingForm] = useState(false)

  // Leadership appointment modal
  const [leadStudentId, setLeadStudentId] = useState('')
  const [leadRole, setLeadRole] = useState<'PRESIDENT' | 'VICE_PRESIDENT' | 'SHORTLISTER_VOLUNTEER' | 'VOLUNTEER_COORDINATOR'>('PRESIDENT')
  const [inspectingSub, setInspectingSub] = useState<any>(null)

  // Winners Form
  const [winnerForm, setWinnerForm] = useState({
    position: 1, recipient_type: 'team', student_user_id: '', team_id: '', achievement: 'Gold Medal / 1st Place'
  })

  // PDF Dossier Export Modal
  const [showPdfDossier, setShowPdfDossier] = useState(false)
  const [showMultiFormPreview, setShowMultiFormPreview] = useState(false)

  // Volunteer allocation modal
  const [allocatingApp, setAllocatingApp] = useState<any>(null)
  const [allocResp, setAllocResp] = useState('')
  const [allocArea, setAllocArea] = useState('')
  const [copiedUpi, setCopiedUpi] = useState(false)

  useEffect(() => {
    loadAll()
  }, [eventId])

  async function loadAll() {
    setLoading(true)
    setError('')
    try {
      const [eventData, formData, leadData, winData, meData] = await Promise.all([
        api.get(`/events/${eventId}`),
        api.get(`/events/${eventId}/form`).catch(() => null),
        api.get(`/events/${eventId}/leadership`).catch(() => []),
        api.get(`/events/${eventId}/winners`).catch(() => []),
        api.get('/auth/me'),
      ])
      setEv(eventData)
      setForm(formData)
      setBuilderQuestions(formData?.questions || [])
      setLeadership(leadData || [])
      setWinners(winData || [])
      setMe(meData)
      if (meData?.profile?.phone) {
        setVolForm(prev => ({ ...prev, phone: meData.profile.phone }))
        setIndivForm(prev => ({ ...prev, phone: meData.profile.phone }))
      }
      if (eventData.individual_enabled && !eventData.team_enabled) {
        setEntryMode('individual')
      } else {
        setEntryMode('team')
      }

      if (accountType === 'STUDENT') {
        const myStat = await api.get(`/events/${eventId}/my-status`)
        setStatus(myStat)
      }

      // Appointed Student Leadership detection and auto tab redirection
      const myLead = (leadData || []).find((l: any) => l.student_id === meData?.id || l.student_user_id === meData?.id)
      if (accountType === 'STUDENT' && Boolean(myLead) && (activeTab === 'register' || activeTab === 'attendance')) {
        setActiveTab('teams')
      }
      if (accountType === 'STUDENT' && !Boolean(myLead) && activeTab === 'attendance') {
        setActiveTab('details')
      }

      // Try fetching coordinator/leader data (Faculty & Appointed Student Leaders)
      try {
        const canAccessCoordData = accountType === 'FACULTY' || Boolean(myLead)
        const [parts, atts, vols, subs, slTeams] = await Promise.all([
          api.get(`/events/${eventId}/participants`).catch(() => ({ individuals: [], teams: [] })),
          api.get(`/events/${eventId}/attendance`).catch(() => []),
          api.get(`/events/${eventId}/volunteers`).catch(() => []),
          canAccessCoordData ? api.get(`/events/${eventId}/submissions`).catch(() => []) : Promise.resolve([]),
          api.get(`/events/${eventId}/shortlisted-teams`).catch(() => []),
        ])
        setParticipants(parts)
        setAttendance(atts)
        setVolunteers(vols)
        setSubmissions(subs)
        setShortlistedTeams(slTeams || [])
      } catch {
        /* Not coordinator or student without permission */
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load event details')
    } finally {
      setLoading(false)
    }
  }

  // Appointed Student Leadership & Volunteer detection
  const myLeadershipRecord = status?.leadership || leadership.find(
    (l: any) => (me?.id && (Number(l.student_user_id || l.student_id) === Number(me?.id)))
  )
  const isPresidentOrVp = Boolean(myLeadershipRecord)
  const isFaculty = accountType === 'FACULTY'
  const isCoordinator = Boolean(ev?.is_coordinator || (isFaculty && ev?.created_by === me?.id))
  const isEnded = ev?.status === 'ENDED' || ev?.status === 'COMPLETED'

  const myVolunteerApp = status?.volunteer || volunteers.find(
    (v: any) => (me?.id && (Number(v.student_id || v.student_user_id) === Number(me?.id)))
  )
  const isVolRejected = myVolunteerApp?.status === 'REJECTED'
  const hasActiveVolunteer = Boolean(myVolunteerApp && myVolunteerApp.status !== 'REJECTED')
  const isParticipantRegistered = Boolean(status?.registration || status?.team)

  const canCreateTeam = Boolean(
    accountType === 'STUDENT' &&
    !loading &&
    !isEnded &&
    !isPresidentOrVp &&
    !hasActiveVolunteer &&
    !isParticipantRegistered &&
    ev?.team_enabled &&
    ev?.reg_open
  )

  // Individual Registration Submit
  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setSubmittingReg(true)
    setError(''); setSuccess('')
    try {
      const r = await api.post(`/events/${eventId}/register`, { answers })
      setSuccess(`Registration successful! ID: ${r.registration_id}`)
      loadAll()
    } catch (err: any) {
      setError(err.message || 'Failed to submit registration')
    } finally {
      setSubmittingReg(false)
    }
  }

  // Individual Default Registration Submit (Option 2)
  async function handleIndividualDefaultRegister(e: React.FormEvent) {
    e.preventDefault()
    setSubmittingReg(true)
    setError(''); setSuccess('')
    try {
      const payloadAnswers: Record<string, any> = {
        phone: indivForm.phone || me?.profile?.phone || '',
      }
      if (indivForm.project_title) payloadAnswers.project_title = indivForm.project_title
      if (indivForm.abstract) payloadAnswers.abstract = indivForm.abstract
      if (indivForm.pitch_deck_url) payloadAnswers.pitch_deck_url = indivForm.pitch_deck_url
      if (indivForm.id_proof_url) payloadAnswers.id_proof_url = indivForm.id_proof_url

      const r = await api.post(`/events/${eventId}/register`, { answers: payloadAnswers })
      setSuccess(`Registration successful! ID: ${r.registration_id}`)
      loadAll()
    } catch (err: any) {
      setError(err.message || 'Failed to submit registration')
    } finally {
      setSubmittingReg(false)
    }
  }

  // Shortlisted Team Payment
  async function handleTeamPayment(teamId: number) {
    if (!payRef.trim()) {
      setError('Please provide the transaction reference / UTR')
      return
    }
    setSubmittingPayment(true)
    setError(''); setSuccess('')
    try {
      await api.post(`/events/${eventId}/teams/${teamId}/pay`, {
        transaction_ref: payRef.trim(),
        payment_receipt_url: payReceipt.trim() || null,
      })
      setSuccess('Payment submitted successfully! WhatsApp group unlocked.')
      setPayRef('')
      setPayReceipt('')
      loadAll()
    } catch (err: any) {
      setError(err.message || 'Payment submission failed')
    } finally {
      setSubmittingPayment(false)
    }
  }

  // Shortlisted Individual Payment
  async function handleIndividualPayment(regId: number | string) {
    if (!payRef.trim()) {
      setError('Please provide the transaction reference / UTR')
      return
    }
    setSubmittingPayment(true)
    setError(''); setSuccess('')
    try {
      await api.post(`/events/${eventId}/registrations/${regId}/pay`, {
        transaction_ref: payRef.trim(),
        payment_receipt_url: payReceipt.trim() || null,
      })
      setSuccess('Payment submitted successfully! WhatsApp group unlocked.')
      setPayRef('')
      setPayReceipt('')
      loadAll()
    } catch (err: any) {
      setError(err.message || 'Payment submission failed')
    } finally {
      setSubmittingPayment(false)
    }
  }

  // Create Team Submit
  async function handleCreateTeam(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setSuccess('')
    try {
      const memberList = teamForm.member_usns
        .split(',')
        .map(u => u.trim())
        .filter(Boolean)
      const res = await api.post(`/events/${eventId}/teams`, {
        team_name: teamForm.team_name.trim(),
        project_title: teamForm.project_title.trim() || null,
        problem_statement: teamForm.problem_statement.trim() || null,
        proposed_solution: teamForm.proposed_solution.trim() || null,
        tech_stack: teamForm.tech_stack.trim() || null,
        pitch_deck_url: teamForm.pitch_deck_url.trim() || null,
        id_proof_url: teamForm.id_proof_url.trim() || null,
        member_usns: memberList,
      })
      setSuccess(`Team "${teamForm.team_name}" created! Status: ${res.status}. Invitations dispatched.`)
      setTeamForm({ team_name: '', project_title: '', problem_statement: '', proposed_solution: '', tech_stack: '', member_usns: '', pitch_deck_url: '', id_proof_url: '' })
      loadAll()
    } catch (err: any) {
      setError(err.message || 'Failed to create team')
    }
  }

  // Volunteer Apply Submit
  async function handleVolunteerApply(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setSuccess('')
    if (!volForm.phone.trim()) {
      setError('Please provide a contact phone number')
      return
    }
    try {
      await api.post(`/events/${eventId}/volunteer-apply`, volForm)
      setSuccess('Volunteer application submitted with verified student identity!')
      loadAll()
    } catch (err: any) {
      setError(err.message || 'Failed to apply as volunteer')
    }
  }

  // Form Builder Methods (Phase 8)
  function handleAddQuestion() {
    const newQ = {
      id: `q_${Date.now()}`,
      title: 'Untitled Question',
      type: newQuestionType,
      required: false,
      description: '',
      options: ['Option 1', 'Option 2'],
      min: undefined,
      max: undefined,
      min_length: undefined,
      max_length: undefined,
    }
    setBuilderQuestions([...builderQuestions, newQ])
  }

  function handleUpdateQuestion(index: number, updates: any) {
    const updated = [...builderQuestions]
    updated[index] = { ...updated[index], ...updates }
    setBuilderQuestions(updated)
  }

  function handleDeleteQuestion(index: number) {
    setBuilderQuestions(builderQuestions.filter((_, i) => i !== index))
  }

  function handleDuplicateQuestion(index: number) {
    const q = { ...builderQuestions[index], id: `q_${Date.now()}`, title: `${builderQuestions[index].title} (Copy)` }
    const updated = [...builderQuestions]
    updated.splice(index + 1, 0, q)
    setBuilderQuestions(updated)
  }

  async function handlePublishForm() {
    setPublishingForm(true)
    setError(''); setSuccess('')
    try {
      const res = await api.put(`/events/${eventId}/form`, {
        questions: builderQuestions,
      })
      setSuccess(`Form published successfully! Now active as version v${res.version}.`)
      loadAll()
    } catch (err: any) {
      setError(err.message || 'Failed to publish form')
    } finally {
      setPublishingForm(false)
    }
  }

  // Shortlisting (President / VP)
  async function handleShortlistReg(regId: number) {
    try {
      await api.post(`/events/${eventId}/shortlist/${regId}`)
      setSuccess(`Registration #${regId} shortlisted & added to Attendance register`)
      loadAll()
    } catch (err: any) { setError(err.message) }
  }

  async function handleShortlistTeam(teamId: number) {
    try {
      await api.post(`/events/${eventId}/shortlist-team/${teamId}`)
      setSuccess(`Team #${teamId} shortlisted & members added to Attendance register`)
      loadAll()
    } catch (err: any) { setError(err.message) }
  }

  async function handleAutoSelect() {
    if (!confirm('Auto-select all eligible registrations into shortlisted status?')) return
    try {
      await api.post(`/events/${eventId}/auto-select`)
      setSuccess('Auto-selection completed for all eligible participants')
      loadAll()
    } catch (err: any) { setError(err.message) }
  }

  // Attendance Marking
  async function handleMarkAttendance(studentId: number, newStatus: string) {
    try {
      await api.post(`/events/${eventId}/attendance/${studentId}?status=${newStatus}`)
      setSuccess(`Attendance updated to ${newStatus}`)
      loadAll()
    } catch (err: any) { setError(err.message) }
  }

  // Volunteer Decisions (Faculty Coordinator)
  async function handleApproveVolunteer(appId: number, approve: boolean) {
    try {
      await api.post(`/volunteer-applications/${appId}/approve?approve=${approve}`)
      setSuccess(`Volunteer application ${approve ? 'approved' : 'rejected'}`)
      loadAll()
    } catch (err: any) { setError(err.message) }
  }

  async function handleRecommendVolunteer(appId: number) {
    try {
      await api.post(`/volunteer-applications/${appId}/recommend`)
      setSuccess('Volunteer recommended for faculty approval')
      loadAll()
    } catch (err: any) { setError(err.message) }
  }

  async function handleAllocateVolunteer(e: React.FormEvent) {
    e.preventDefault()
    if (!allocatingApp) return
    try {
      await api.post(`/volunteer-applications/${allocatingApp.id}/allocate?responsibility=${encodeURIComponent(allocResp)}&allocation=${encodeURIComponent(allocArea)}`)
      setSuccess('Volunteer allocation saved')
      setAllocatingApp(null)
      loadAll()
    } catch (err: any) { setError(err.message) }
  }

  async function handleCompleteVolunteer(appId: number, completed: boolean) {
    try {
      await api.post(`/volunteer-applications/${appId}/complete?completed=${completed}`)
      setSuccess(`Volunteer marked as ${completed ? 'COMPLETED' : 'NOT_COMPLETED'}`)
      loadAll()
    } catch (err: any) { setError(err.message) }
  }

  // Leadership Appointment (Faculty)
  async function handleAppointLeadership(e: React.FormEvent) {
    e.preventDefault()
    try {
      await api.post(`/events/${eventId}/leadership?student_user_id=${leadStudentId}&role=${leadRole}`)
      setSuccess(`${leadRole} appointed successfully`)
      setLeadStudentId('')
      loadAll()
    } catch (err: any) { setError(err.message) }
  }

  // Winners Form Submit (Faculty & Leadership)
  async function handleAddWinner(e: React.FormEvent) {
    e.preventDefault()
    try {
      await api.post(`/events/${eventId}/winners`, {
        position: winnerForm.position,
        student_user_id: winnerForm.recipient_type === 'individual' && winnerForm.student_user_id ? Number(winnerForm.student_user_id) : null,
        team_id: winnerForm.recipient_type === 'team' && winnerForm.team_id ? Number(winnerForm.team_id) : null,
        achievement: winnerForm.achievement,
      })
      setSuccess(`Podium winner announced for position #${winnerForm.position}!`)
      setWinnerForm({ position: 1, recipient_type: 'team', student_user_id: '', team_id: '', achievement: 'Gold Medal / 1st Place' })
      loadAll()
    } catch (err: any) { setError(err.message) }
  }

  async function handleDeleteWinner(winnerId: number) {
    if (!window.confirm('Are you sure you want to remove this winner honor record?')) return
    try {
      await api.delete(`/events/${eventId}/winners/${winnerId}`)
      setSuccess('Winner honor removed successfully')
      loadAll()
    } catch (err: any) { setError(err.message) }
  }

  if (loading && !ev) {
    return <div className="card text-center py-16 text-slate-400">Loading event workspace…</div>
  }

  if (!ev) {
    return <div className="card text-center py-16 text-rose-500">Event not found.</div>
  }

  const reportsList = [
    { type: 'event_executive', name: '1. Event Executive Report' },
    { type: 'participants', name: '2. Approved Individual Participant List' },
    { type: 'teams', name: '3. Complete Team Registration Details' },
    { type: 'dept_participants', name: '4. Department-wise Participant List' },
    { type: 'attendance', name: '5. Participant Attendance Register' },
    { type: 'volunteer_applications', name: '6. Volunteer Applications' },
    { type: 'volunteer_allocations', name: '7. Volunteer Allocations & Responsibilities' },
    { type: 'volunteer_completion', name: '8. Volunteer Completion & Recognition' },
    { type: 'event_summary', name: '9. Final Event Summary' },
    { type: 'winners', name: '10. Winners and Medal Summary' },
  ]

  return (
    <div className="space-y-6">
      {/* Top Left Come Back Navigation */}
      <div className="flex items-center justify-between">
        <BackButton
          to={accountType === 'FACULTY' ? '/faculty/dashboard' : '/student/dashboard'}
          fallback="/events"
          label={accountType === 'FACULTY' ? 'Come Back to Faculty Dashboard' : 'Come Back to Dashboard'}
          size="sm"
          variant="outline"
          className="shadow-2xs font-semibold"
        />
      </div>

      {/* Event Header Banner */}
      <div className="card-antigravity bg-gradient-to-br from-white via-slate-50/50 to-blue-50/20 dark:from-[#0B0D14] dark:via-[#090A0F] dark:to-black border border-border-default p-6 sm:p-8 rounded-3xl relative overflow-hidden space-y-5">
        {/* Event Poster Showcase */}
        {ev.poster_url && (
          <div className="relative w-full rounded-2xl overflow-hidden max-h-80 border border-border-default/60 shadow-md bg-slate-950 flex items-center justify-center group mb-2">
            <img
              src={ev.poster_url}
              alt={ev.name}
              className="w-full h-full max-h-80 object-cover object-center group-hover:scale-[1.01] transition-transform duration-500"
              onError={e => { (e.currentTarget.style.display = 'none') }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
            <div className="absolute bottom-3 right-3">
              <a
                href={ev.poster_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/85 dark:bg-black/70 backdrop-blur-md flex items-center gap-1.5 shadow-sm active:scale-98 transition"
              >
                <IconExternalLink size={13} />
                <span>View Full Poster</span>
              </a>
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-border-default shadow-2xs">
                {ev.category || 'General'}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-2xs ${
                ev.status === 'LIVE'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : ev.status === 'ENDED' || ev.status === 'COMPLETED'
                  ? 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300'
                  : ev.status === 'CANCELLED'
                  ? 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-400'
                  : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300'
              }`}>
                {ev.status === 'COMPLETED' ? 'ENDED' : ev.status}
              </span>
              {ev.selection_mode === 'ALLOW_ALL_ELIGIBLE_REGISTRATIONS' && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shadow-2xs">
                  Auto-Select Mode
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{ev.name}</h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-3xl leading-relaxed">{ev.description || 'No description provided.'}</p>
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPdfDossier(true)}
                className="btn btn-secondary px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs active:scale-98"
                title="Extract complete printable event dossier with teams, volunteers, leaders, and winners"
              >
                <IconFileText size={14} className="text-blue-600 dark:text-blue-400" />
                <span>Export Event Dossier (PDF)</span>
              </button>
              <button
                type="button"
                onClick={() => setShowMultiFormPreview(true)}
                className="btn btn-secondary px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs active:scale-98 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 border-purple-200 dark:border-purple-800"
                title="Preview all 3 forms: Default Individual, Default Team, and Custom Dynamic Form"
              >
                <IconEye size={14} className="text-purple-600 dark:text-purple-400" />
                <span>Preview All 3 Forms</span>
              </button>
              {isFaculty && (
                <Link
                  to={`/faculty/events/${eventId}/form-builder`}
                  className="btn btn-secondary px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs active:scale-98 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 border-purple-200 dark:border-purple-800 transition"
                  title="Open Dedicated Form Studio to customize registration questions"
                >
                  <IconEdit size={14} />
                  <span>Edit Form Builder</span>
                  {form?.published_version ? (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">
                      v{form.published_version}
                    </span>
                  ) : null}
                </Link>
              )}
              {isFaculty && isCoordinator && (
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  className="btn btn-secondary px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 shadow-2xs active:scale-98"
                  title="Permanently delete event and cascade child data"
                >
                  <IconTrash size={14} />
                  <span>Delete Event</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Registration Status for Student */}
          {accountType === 'STUDENT' && (
            <div className="shrink-0">
              {isPresidentOrVp ? (
                <div className="bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-2xl p-3 text-right shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-purple-600 dark:text-purple-400 block">Student Leader</span>
                  <span className="font-bold text-purple-900 dark:text-purple-200 text-xs">{myLeadershipRecord?.role?.replace('_', ' ')}</span>
                  <span className="block text-[10px] text-purple-600 dark:text-purple-400 font-medium mt-0.5">Contestant Entry Prohibited</span>
                </div>
              ) : hasActiveVolunteer && !isParticipantRegistered ? (
                <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl p-3 text-right shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 block">Event Volunteer</span>
                  <span className="font-bold text-blue-900 dark:text-blue-200 text-xs">{myVolunteerApp?.status}</span>
                  <span className="block text-[10px] text-blue-600 dark:text-blue-400 font-medium mt-0.5">Contestant Entry Prohibited</span>
                </div>
              ) : isParticipantRegistered ? (
                <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-3.5 text-right shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block">Registered Participant</span>
                  <span className="font-mono font-extrabold text-emerald-800 dark:text-emerald-200 text-sm">
                    {status?.team ? `Team Entry: ${status.team.status}` : `ID: #${status?.registration?.id || 'OK'}`}
                  </span>
                  <span className="block text-xs text-emerald-700 dark:text-emerald-300 mt-0.5 font-medium">Single-Purpose Entry Locked</span>
                </div>
              ) : ev.reg_open ? (
                <button
                  onClick={() => setActiveTab('register')}
                  className="btn btn-primary px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs active:scale-98 transition"
                >
                  <IconUserCheck size={15} />
                  <span>Register Now</span>
                  <span>→</span>
                </button>
              ) : (
                <span className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 border border-border-default shadow-2xs">Registration Closed</span>
              )}
            </div>
          )}
        </div>

        {/* Metadata Details Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-300">
          <div>
            <span className="text-slate-400 dark:text-slate-500 block font-bold uppercase text-[10px] tracking-wider">Venue</span>
            <span className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2 mt-1">
              <span className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 flex items-center justify-center shrink-0">
                <IconMapPin size={14} />
              </span>
              <span className="truncate">{ev.venue || 'Campus Venue'}</span>
            </span>
          </div>
          <div>
            <span className="text-slate-400 dark:text-slate-500 block font-bold uppercase text-[10px] tracking-wider">Schedule</span>
            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-2 mt-1">
              <span className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center shrink-0">
                <IconCalendar size={14} />
              </span>
              <span>{new Date(ev.start_at).toLocaleDateString()} · {new Date(ev.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </span>
          </div>
          <div>
            <span className="text-slate-400 dark:text-slate-500 block font-bold uppercase text-[10px] tracking-wider">Team Size</span>
            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-2 mt-1">
              <span className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 flex items-center justify-center shrink-0">
                <IconUsers size={14} />
              </span>
              <span>{ev.team_enabled ? `${ev.min_team_size} – ${ev.max_team_size} members` : 'Individual only'}</span>
            </span>
          </div>
          <div>
            <span className="text-slate-400 dark:text-slate-500 block font-bold uppercase text-[10px] tracking-wider">Eligibility</span>
            <span className="font-bold text-slate-900 dark:text-white truncate block mt-1">
              {ev.eligible_departments?.length ? ev.eligible_departments.join(', ') : 'All VVCE Branches'}
            </span>
          </div>
        </div>
      </div>

      {/* Faculty Coordinator PPT Template Reference Banner */}
      {ev.ppt_template_url && !isFaculty && !isPresidentOrVp && !hasActiveVolunteer && (
        <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div>
            <span className="font-bold block flex items-center gap-1.5 text-blue-800 dark:text-blue-300">
              <IconDownload size={16} />
              <span>Reference Presentation Deck (PPT Template) Provided by Faculty Coordinator</span>
            </span>
            <p className="text-blue-700 dark:text-blue-400 mt-0.5">
              The faculty coordinator has attached an official format PPT slide deck. Download and use this template for your team proposal presentation.
            </p>
          </div>
          <a
            href={ev.ppt_template_url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary btn-sm shrink-0 flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-3.5 py-2 rounded-lg shadow-sm"
          >
            <IconDownload size={14} />
            <span>Download PPT Template (.pptx)</span>
          </a>
        </div>
      )}

      {/* Global Alerts */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IconAlertTriangle size={16} className="text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-rose-500 hover:text-rose-700 dark:text-rose-400">
            <IconX size={16} />
          </button>
        </div>
      )}
      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IconCheckCircle size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess('')} className="text-emerald-500 hover:text-emerald-700 dark:text-emerald-400">
            <IconX size={16} />
          </button>
        </div>
      )}

      {/* Workspace Tabs Navigation */}
      <div className="flex overflow-x-auto border border-border-default bg-[var(--bg-surface)] rounded-2xl p-1.5 shadow-xs gap-1.5 scrollbar-none">
        <button
          onClick={() => setActiveTab('details')}
          className={`px-4 py-2 text-xs sm:text-sm rounded-xl shrink-0 transition-all font-bold ${
            activeTab === 'details'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20 dark:bg-purple-600 dark:text-white dark:shadow-purple-900/40'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          Overview & Rules
        </button>

        {accountType === 'STUDENT' && !isPresidentOrVp && (
          <button
            onClick={() => setActiveTab('register')}
            className={`px-4 py-2 text-xs sm:text-sm rounded-xl shrink-0 transition-all flex items-center gap-2 font-bold ${
              activeTab === 'register'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20 dark:bg-purple-600 dark:text-white dark:shadow-purple-900/40'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <IconUserCheck size={16} />
            <span>Apply & Register</span>
            {Boolean(status?.registration || status?.team) && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 flex items-center gap-1 shadow-2xs">
                <IconCheck size={12} />
                <span>Participant</span>
              </span>
            )}
            {Boolean(hasActiveVolunteer) && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-700 flex items-center gap-1 shadow-2xs">
                <IconCheck size={12} />
                <span>Volunteer</span>
              </span>
            )}
          </button>
        )}

        {(isFaculty || isPresidentOrVp) && (
          <>
            <button
              onClick={() => setActiveTab('participants')}
              className={`px-4 py-2 text-xs sm:text-sm rounded-xl shrink-0 transition-all flex items-center gap-2 font-bold ${
                activeTab === 'participants'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20 dark:bg-purple-600 dark:text-white dark:shadow-purple-900/40'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <span>Participants</span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold ${
                activeTab === 'participants'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}>
                {participants.individuals?.length || 0}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('teams')}
              className={`px-4 py-2 text-xs sm:text-sm rounded-xl shrink-0 transition-all flex items-center gap-2 font-bold ${
                activeTab === 'teams'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20 dark:bg-purple-600 dark:text-white dark:shadow-purple-900/40'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <span>Teams</span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold ${
                activeTab === 'teams'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}>
                {participants.teams?.length || 0}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('volunteers')}
              className={`px-4 py-2 text-xs sm:text-sm rounded-xl shrink-0 transition-all flex items-center gap-2 font-bold ${
                activeTab === 'volunteers'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20 dark:bg-purple-600 dark:text-white dark:shadow-purple-900/40'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <span>Volunteers</span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold ${
                activeTab === 'volunteers'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}>
                {volunteers.length}
              </span>
            </button>
            {isFaculty && (
              <button
                onClick={() => setActiveTab('attendance')}
                className={`px-4 py-2 text-xs sm:text-sm rounded-xl shrink-0 transition-all flex items-center gap-2 font-bold ${
                  activeTab === 'attendance'
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20 dark:bg-purple-600 dark:text-white dark:shadow-purple-900/40'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <span>Attendance Register</span>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold ${
                  activeTab === 'attendance'
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}>
                  {attendance.length}
                </span>
              </button>
            )}
            <button
              onClick={() => setActiveTab('winners')}
              className={`px-4 py-2 text-xs sm:text-sm rounded-xl shrink-0 transition-all flex items-center gap-2 font-bold ${
                activeTab === 'winners'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20 dark:bg-purple-600 dark:text-white dark:shadow-purple-900/40'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <span>Winners</span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold ${
                activeTab === 'winners'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}>
                {winners.length}
              </span>
            </button>
          </>
        )}

        {isFaculty && (
          <>
            <button
              onClick={() => setActiveTab('leadership')}
              className={`px-4 py-2 text-xs sm:text-sm rounded-xl shrink-0 transition-all flex items-center gap-2 font-bold ${
                activeTab === 'leadership'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20 dark:bg-purple-600 dark:text-white dark:shadow-purple-900/40'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <span>Leadership</span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold ${
                activeTab === 'leadership'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}>
                {leadership.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-4 py-2 text-xs sm:text-sm rounded-xl shrink-0 transition-all flex items-center gap-2 font-bold ${
                activeTab === 'reports'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20 dark:bg-purple-600 dark:text-white dark:shadow-purple-900/40'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <IconFileText size={15} />
              <span>A4 PDF Reports</span>
            </button>
            <button
              onClick={() => setActiveTab('form_builder')}
              className={`px-4 py-2 text-xs sm:text-sm rounded-xl shrink-0 transition-all flex items-center gap-2 font-bold ${
                activeTab === 'form_builder'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20 dark:bg-purple-600 dark:text-white dark:shadow-purple-900/40'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <IconLayers size={15} />
              <span>Form Builder</span>
              {form?.published_version ? (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-blue-100 dark:bg-purple-900/50 text-blue-700 dark:text-purple-300">
                  v{form.published_version}
                </span>
              ) : null}
            </button>
          </>
        )}
      </div>

      {/* TAB: DETAILS */}
      {activeTab === 'details' && (
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 card space-y-4">
            <h2 className="font-bold text-slate-900 text-base">About This Event</h2>
            <div className="prose prose-slate text-sm">
              <p>{ev.description || 'No detailed instructions provided.'}</p>
            </div>
            <div className="pt-4 border-t space-y-2 text-xs">
              <h3 className="font-bold text-slate-800">Event Rules & Guidelines</h3>
              <ul className="list-disc pl-4 text-slate-600 space-y-1">
                <li>Eligible departments: {ev.eligible_departments?.join(', ') || 'All Departments'}</li>
                <li>Eligible semesters: {ev.eligible_semesters?.join(', ') || 'All Semesters'}</li>
                <li>Registration deadline: {ev.reg_close_at ? new Date(ev.reg_close_at).toLocaleString() : 'Before event start'}</li>
                <li>Selection mode: <b>{ev.selection_mode}</b></li>
              </ul>
            </div>
          </div>

          <div className="card space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">Appointed Student Leaders</h3>
            {leadership.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No student leaders appointed yet.</p>
            ) : (
              <div className="space-y-2 text-xs">
                {leadership.map(l => (
                  <div key={l.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="badge badge-vvce text-[10px] block w-fit mb-1">{l.role}</span>
                    <span className="font-bold text-slate-800 block">{l.name}</span>
                    <span className="text-slate-400 font-mono">{l.usn} · {l.department}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: REGISTER (UNIFIED SINGLE-PURPOSE APPLY & REGISTER CARD) */}
      {activeTab === 'register' && (
        <div className="space-y-6 max-w-3xl mx-auto">
          {/* CASE 0A: APPOINTED STUDENT LEADER CANNOT PARTICIPATE */}
          {isPresidentOrVp && (
            <div className="card space-y-4 border-2 border-purple-500 bg-purple-50/20 dark:bg-purple-950/20 p-6 shadow-sm">
              <div className="flex items-center gap-3 border-b border-purple-200 dark:border-purple-800 pb-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold text-lg shrink-0">
                  🏛️
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Student Leadership Committee Appointment Active
                  </h3>
                  <p className="text-xs text-purple-700 dark:text-purple-300 font-semibold">
                    Appointed Role: {myLeadershipRecord?.role?.replace('_', ' ')}
                  </p>
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-200 text-xs">
                Under VVCE Institutional Event Governance Regulations, appointed student leaders (President, Vice-President, Coordinators, and Committee Shortlisters) serve as official event organizers with executive authority. <strong>Student leaders cannot participate or register as contestants in this event.</strong>
              </div>
            </div>
          )}

          {/* CASE 0B: ACTIVE VOLUNTEER APPLICANT CANNOT PARTICIPATE */}
          {!isPresidentOrVp && hasActiveVolunteer && !isParticipantRegistered && (
            <div className="card space-y-4 border-2 border-blue-500 bg-blue-50/20 dark:bg-blue-950/20 p-6 shadow-sm">
              <div className="flex items-center gap-3 border-b border-blue-200 dark:border-blue-800 pb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-lg shrink-0">
                  🤝
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Active Event Volunteer Status
                  </h3>
                  <p className="text-xs text-blue-700 dark:text-blue-300 font-semibold">
                    Application Status: {myVolunteerApp?.status}
                  </p>
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 text-xs">
                You have submitted an active Volunteer Application for this event ({myVolunteerApp?.status}). Under VVCE Single-Purpose Guidelines, students cannot participate as contestants while an official volunteer application is active or pending.
              </div>
            </div>
          )}

          {/* Prominent Reference PPT Deck Download on Registration */}
          {!isPresidentOrVp && !hasActiveVolunteer && !isParticipantRegistered && ev?.ppt_template_url && (
            <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
              <div className="flex items-start sm:items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-base shrink-0">
                  📥
                </div>
                <div>
                  <span className="font-bold block text-blue-900 dark:text-white text-xs">
                    Official Presentation Pitch Deck Template (.pptx) Available
                  </span>
                  <p className="text-blue-700 dark:text-blue-300 text-[11px] mt-0.5">
                    Download and use this official faculty template to prepare your proposal slide deck before submitting registration.
                  </p>
                </div>
              </div>
              <a
                href={ev.ppt_template_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 shadow-2xs active:scale-98"
              >
                <IconDownload size={14} />
                <span>Download Template PPT</span>
              </a>
            </div>
          )}

          {/* CASE 1: ALREADY REGISTERED AS PARTICIPANT */}
          {Boolean(status?.registration || status?.team) && (
            <div className="card space-y-5 border-2 border-emerald-500 bg-emerald-50/20 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-200 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg shrink-0">
                    ✓
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      You are Officially Registered as a Participant
                    </h3>
                    <p className="text-xs text-slate-500">
                      VVCE Verified Single-Purpose Registration Confirmed
                    </p>
                  </div>
                </div>
                <span className="badge badge-success text-xs font-bold uppercase tracking-wider shrink-0">
                  {status?.team ? `Team Entry: ${status.team.status}` : `Individual Entry: ${status.registration.status}`}
                </span>
              </div>

              {/* Strict Institutional Single-Purpose Rule Banner */}
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-2.5">
                <span className="text-base">🔒</span>
                <div>
                  <strong className="block font-bold">Single-Purpose Registration Locked:</strong>
                  <span>
                    You are registered as a Participant for this event. Under VVCE Institutional Guidelines, each student can register for <strong>only one purpose</strong> per event (either Participant or Volunteer). Dual registration is strictly prohibited.
                  </span>
                </div>
              </div>

              {/* Team Details (If registered in team) */}
              {status?.team && (
                <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                      <span>👥</span> Team: {status.team.name}
                    </span>
                    <span className="badge badge-vvce text-[11px]">
                      {status.team.is_leader ? 'Team Leader' : 'Team Member'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-slate-600">
                    <div>Team Status: <b className="text-slate-800">{status.team.status}</b></div>
                    <div>Your Invite: <b className="text-emerald-700">{status.team.invitation}</b></div>
                    <div>Fee Status: <b className={status.team.payment_status === 'PAID' ? 'text-emerald-700' : 'text-amber-700'}>{status.team.payment_status}</b></div>
                  </div>

                  {/* Shortlisted Team Actions & Autonomous Workflow */}
                  {status.team.status === 'SHORTLISTED' && (
                    <div className="pt-3 border-t space-y-3">
                      <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-1">
                        <span className="font-bold flex items-center gap-1.5 text-emerald-800">
                          <span>🎉</span> Congratulations! Your team has been shortlisted!
                        </span>
                        <p className="text-emerald-700">
                          The Student Leadership Committee (President & VP) has shortlisted your team for the final rounds.
                        </p>
                      </div>

                      {/* Fee Payment Section */}
                      {status.team.payment_status !== 'PAID' ? (
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">Registration Fee Payment</span>
                            <span className="font-mono font-bold text-sm text-vvce-800">₹{status.team.registration_fee || 0}</span>
                          </div>

                          {status.team.is_leader ? (
                            <div className="space-y-3">
                              <p className="text-slate-600">
                                As Team Leader, please complete the fee payment to confirm final participation and unlock the official WhatsApp group for all team members.
                              </p>

                              {/* Official Coordinator UPI ID & Copy Button */}
                              {(ev?.upi_id || status.team.upi_id) && (
                                <div className="p-3 bg-white dark:bg-midnight-900 rounded-xl border border-border-default flex items-center justify-between gap-3 shadow-xs">
                                  <div>
                                    <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-semibold block">Official College / Coordinator UPI ID</span>
                                    <span className="font-mono font-bold text-sm text-slate-900 dark:text-white select-all">
                                      {ev?.upi_id || status.team.upi_id}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(ev?.upi_id || status.team.upi_id)
                                      setCopiedUpi(true)
                                      setTimeout(() => setCopiedUpi(false), 2000)
                                    }}
                                    className="btn-secondary btn-sm text-[11px] font-semibold"
                                  >
                                    {copiedUpi ? '✓ Copied!' : 'Copy UPI ID'}
                                  </button>
                                </div>
                              )}

                              {status.team.payment_qr_url && (
                                <div className="text-center p-4 bg-white dark:bg-midnight-900 rounded-2xl border border-border-default max-w-xs mx-auto shadow-sm">
                                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">Scan Official Payment QR Code:</span>
                                  <img src={status.team.payment_qr_url} alt="Payment QR" className="w-44 h-44 mx-auto object-contain rounded-xl border border-slate-100 dark:border-slate-800" />
                                  <span className="text-[10px] text-slate-400 mt-1.5 block">Accepts GPay, PhonePe, Paytm, BHIM & All UPI Apps</span>
                                </div>
                              )}

                              {status.team.payment_instructions && (
                                <div className="p-3 rounded-xl bg-coral-50/60 dark:bg-coral-950/20 border border-coral-200 dark:border-coral-800 text-coral-900 dark:text-coral-200 text-xs">
                                  <strong>Payment Instructions:</strong> {status.team.payment_instructions}
                                </div>
                              )}

                              <div className="space-y-3 pt-2">
                                <div>
                                  <label className="label">12-Digit Transaction Reference / UTR Number *</label>
                                  <input
                                    className="input font-mono font-bold tracking-wider"
                                    placeholder="e.g. 431289045129 or UPI/20261106/89410"
                                    value={payRef}
                                    onChange={e => setPayRef(e.target.value)}
                                    required
                                  />
                                </div>
                                <ImageFileUpload
                                  label="Payment Receipt Screenshot (Picture Upload) *"
                                  value={payReceipt}
                                  onChange={url => setPayReceipt(url)}
                                  accept="image/*"
                                  placeholder="Click or drag payment screenshot (PNG/JPG)"
                                  helperText="Attach the screenshot of your UPI payment receipt showing transaction ID, amount, and timestamp."
                                />
                              </div>

                              <button
                                type="button"
                                disabled={submittingPayment}
                                onClick={() => handleTeamPayment(status.team.id)}
                                className="btn-primary w-full text-xs font-semibold py-2"
                              >
                                {submittingPayment ? 'Submitting Payment Proof...' : 'Confirm Payment & Unlock WhatsApp Group'}
                              </button>
                            </div>
                          ) : (
                            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                              ℹ️ <strong>Waiting for Team Leader Payment:</strong> Your team is shortlisted. Your Team Leader must submit the registration fee payment. Once paid, the official WhatsApp group link will unlock automatically for all team members.
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 space-y-3">
                          <div className="flex items-center gap-2 font-bold text-emerald-900">
                            <span>✓</span>
                            <span>Registration Fee Paid & Confirmed!</span>
                          </div>
                          <p className="text-xs text-emerald-800">
                            Payment Reference: <code className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-emerald-300">{status.team.payment_reference || 'VERIFIED'}</code>
                          </p>
                          {status.team.whatsapp_group_url ? (
                            <a
                              href={status.team.whatsapp_group_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-success flex items-center justify-center gap-2 text-xs font-bold w-full py-2.5 rounded-lg shadow"
                            >
                              <span>💬</span> Join Official Event WhatsApp Group →
                            </a>
                          ) : (
                            <p className="text-xs text-emerald-700 italic">WhatsApp group link will be published by faculty coordinators shortly.</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Individual Details (If registered individually) */}
              {status?.registration && (
                <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                      <span>👤</span> Registration ID: <code className="font-mono text-vvce-800">{status.registration.id || status.registration.registration_id}</code>
                    </span>
                    <span className="badge badge-success text-[11px]">{status.registration.status}</span>
                  </div>

                  {status.registration.status === 'SHORTLISTED' && (
                    <div className="pt-2 space-y-3">
                      {status.registration.payment_status !== 'PAID' && (status.registration.registration_fee || 0) > 0 ? (
                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">Registration Fee Payment</span>
                            <span className="font-mono font-bold text-sm text-vvce-800">₹{status.registration.registration_fee}</span>
                          </div>

                          {/* Official Coordinator UPI ID & Copy Button */}
                          {(ev?.upi_id || status.registration.upi_id) && (
                            <div className="p-3 bg-white dark:bg-midnight-900 rounded-xl border border-border-default flex items-center justify-between gap-3 shadow-xs">
                              <div>
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-semibold block">Official College / Coordinator UPI ID</span>
                                <span className="font-mono font-bold text-sm text-slate-900 dark:text-white select-all">
                                  {ev?.upi_id || status.registration.upi_id}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(ev?.upi_id || status.registration.upi_id)
                                  setCopiedUpi(true)
                                  setTimeout(() => setCopiedUpi(false), 2000)
                                }}
                                className="btn-secondary btn-sm text-[11px] font-semibold"
                              >
                                {copiedUpi ? '✓ Copied!' : 'Copy UPI ID'}
                              </button>
                            </div>
                          )}

                          {status.registration.payment_qr_url && (
                            <div className="text-center p-4 bg-white dark:bg-midnight-900 rounded-2xl border border-border-default max-w-xs mx-auto shadow-sm">
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">Scan Official Payment QR Code:</span>
                              <img src={status.registration.payment_qr_url} alt="Payment QR" className="w-44 h-44 mx-auto object-contain rounded-xl border border-slate-100 dark:border-slate-800" />
                              <span className="text-[10px] text-slate-400 mt-1.5 block">Accepts GPay, PhonePe, Paytm, BHIM & All UPI Apps</span>
                            </div>
                          )}

                          <div className="space-y-3 pt-2">
                            <div>
                              <label className="label">12-Digit Transaction Reference / UTR Number *</label>
                              <input
                                className="input font-mono font-bold tracking-wider"
                                placeholder="e.g. 431289045129 or UPI/20261106/89410"
                                value={payRef}
                                onChange={e => setPayRef(e.target.value)}
                                required
                              />
                            </div>
                            <ImageFileUpload
                              label="Payment Receipt Screenshot (Picture Upload) *"
                              value={payReceipt}
                              onChange={url => setPayReceipt(url)}
                              accept="image/*"
                              placeholder="Click or drag payment screenshot (PNG/JPG)"
                              helperText="Attach the screenshot of your UPI payment receipt showing transaction ID, amount, and timestamp."
                            />
                          </div>

                          <button
                            type="button"
                            disabled={submittingPayment}
                            onClick={() => handleIndividualPayment(status.registration.id)}
                            className="btn-primary w-full text-xs font-semibold py-2"
                          >
                            {submittingPayment ? 'Submitting...' : 'Confirm Payment & Unlock WhatsApp Group'}
                          </button>
                        </div>
                      ) : (
                        status.registration.whatsapp_group_url ? (
                          <a
                            href={status.registration.whatsapp_group_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-success flex items-center justify-center gap-2 text-xs font-bold w-full py-2.5 rounded-lg shadow"
                          >
                            <span>💬</span> Join Official Event WhatsApp Group →
                          </a>
                        ) : (
                          <p className="text-xs text-slate-500 italic">Shortlisted! WhatsApp group link will be published by faculty coordinators shortly.</p>
                        )
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* CASE 2: ALREADY REGISTERED AS VOLUNTEER */}
          {Boolean(status?.volunteer) && !Boolean(status?.registration || status?.team) && (
            <div className="card space-y-5 border-2 border-blue-500 bg-blue-50/20 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-blue-200 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-lg shrink-0">
                    🙋
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Official Volunteer Application on File
                    </h3>
                    <p className="text-xs text-slate-500">
                      Application #{status.volunteer.id} · Verified Student Identity
                    </p>
                  </div>
                </div>
                <span className={`badge text-xs font-bold uppercase tracking-wider shrink-0 ${
                  status.volunteer.status === 'APPROVED' ? 'badge-success' : 'badge-warning'
                }`}>
                  Status: {status.volunteer.status}
                </span>
              </div>

              {/* Strict Institutional Single-Purpose Rule Banner */}
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-2.5">
                <span className="text-base">🔒</span>
                <div>
                  <strong className="block font-bold">Single-Purpose Registration Locked:</strong>
                  <span>
                    You have submitted an official application as a Volunteer for this event. Under VVCE Institutional Guidelines, each student can register for <strong>only one purpose</strong> per event (either Participant or Volunteer). Dual registration is strictly prohibited.
                  </span>
                </div>
              </div>

              {/* Volunteer Application Details */}
              <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-600">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Preferred Area</span>
                    <span className="font-bold text-slate-800">{status.volunteer.preferred_area}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Duty Allocation</span>
                    <span className="font-bold text-slate-800">{status.volunteer.allocation || 'Pending Coordinator Assignment'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Responsibility</span>
                    <span className="font-bold text-slate-800">{status.volunteer.responsibility || 'Pending Assignment'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Duty Completion</span>
                    <span className={`badge text-[11px] ${status.volunteer.completion_status === 'COMPLETED' ? 'badge-success' : 'badge-neutral'}`}>
                      {status.volunteer.completion_status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CASE 3: NOT REGISTERED YET AND EVENT CONCLUDED OR REGISTRATION CLOSED */}
          {!isParticipantRegistered && !hasActiveVolunteer && !isPresidentOrVp && (isEnded || !ev?.reg_open) && (
            <div className={`card max-w-xl mx-auto p-6 text-center space-y-2 ${isEnded ? 'border-rose-300 bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-200' : 'border-amber-300 bg-amber-50 text-amber-800'}`}>
              <h3 className="font-bold text-sm">{isEnded ? 'Event Concluded' : 'Registration Closed'}</h3>
              <p className="text-xs">{isEnded ? 'This event has concluded. Registrations are permanently closed.' : 'Registration for this event is currently closed as per the scheduled registration window.'}</p>
            </div>
          )}

          {/* CASE 4: NOT REGISTERED YET AND REGISTRATION OPEN AND NOT ENDED -> THE ONE UNIFIED APPLICATION CARD */}
          {!isParticipantRegistered && !hasActiveVolunteer && !isPresidentOrVp && !isEnded && ev?.reg_open && (
            <div className="card space-y-6 p-6 border-slate-200 shadow-sm">
              {isVolRejected && (
                <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5 shadow-2xs">
                  <IconAlertTriangle size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold">Volunteer Application Rejected · Participant Registration Permitted:</strong>
                    <span>
                      Your previous volunteer application for this event was not selected. As registration remains open, you are eligible to register and participate as a contestant (Team or Individual). Volunteering cannot be re-applied for under the single-application policy.
                    </span>
                  </div>
                </div>
              )}
              <div className="border-b pb-4">
                <h2 className="text-lg font-bold text-slate-900">Event Application & Registration</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Institutional Rule: Students may register for <strong>only one purpose</strong> for this event (either Participant or Volunteer).
                </p>

                {/* Direct Purpose Selector: Participating vs Volunteering */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-4">
                  <button
                    type="button"
                    onClick={() => setApplyPurpose('participate')}
                    className={`p-4 rounded-2xl border-2 text-left transition-all flex items-center justify-between ${
                      applyPurpose === 'participate'
                        ? 'border-blue-600 bg-blue-50/70 dark:border-purple-500 dark:bg-purple-950/40 text-blue-950 dark:text-purple-200 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
                        applyPurpose === 'participate'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/30'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-border-default'
                      }`}>
                        <IconUserCheck size={20} />
                      </span>
                      <div>
                        <div className="font-bold text-sm">Participate in this Event</div>
                        <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">
                          Compete or present project submission
                        </span>
                      </div>
                    </div>
                    {applyPurpose === 'participate' && (
                      <span className="w-6 h-6 rounded-full bg-blue-600 dark:bg-purple-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                        ✓
                      </span>
                    )}
                  </button>

                  {isVolRejected ? (
                    <div className="p-4 rounded-2xl border border-dashed border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 text-xs flex flex-col justify-center space-y-1">
                      <div className="font-bold flex items-center gap-1.5 text-rose-800 dark:text-rose-300">
                        <IconXCircle size={15} />
                        <span>Volunteering Ineligible</span>
                      </div>
                      <span className="text-[11px] text-rose-600 dark:text-rose-400">
                        Previous volunteer application was rejected. Re-application for volunteering is restricted under single-application policy. You may participate as a contestant.
                      </span>
                    </div>
                  ) : ev.volunteer_enabled ? (
                    <button
                      type="button"
                      onClick={() => setApplyPurpose('volunteer')}
                      className={`p-4 rounded-2xl border-2 text-left transition-all flex items-center justify-between ${
                        applyPurpose === 'volunteer'
                          ? 'border-blue-600 bg-blue-50/70 dark:border-purple-500 dark:bg-purple-950/40 text-blue-950 dark:text-purple-200 shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
                          applyPurpose === 'volunteer'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/30'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-border-default'
                        }`}>
                          <IconHeartHandshake size={20} />
                        </span>
                        <div>
                          <div className="font-bold text-sm">Volunteer for this Event</div>
                          <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">
                            Support logistics, stage, technical or media
                          </span>
                        </div>
                      </div>
                      {applyPurpose === 'volunteer' && (
                        <span className="w-6 h-6 rounded-full bg-blue-600 dark:bg-purple-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                          ✓
                        </span>
                      )}
                    </button>
                  ) : (
                    <div className="p-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 text-xs flex items-center">
                      Volunteering not enabled for this event
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION A: IF VOLUNTEER PURPOSE SELECTED -> CIRCULATE VOLUNTEER FORM */}
              {applyPurpose === 'volunteer' && !isVolRejected && ev.volunteer_enabled && (
                <div className="space-y-4 pt-2">
                  <div className="border-b pb-2">
                    <h3 className="font-bold text-sm text-slate-900">Volunteer Application Form</h3>
                    <p className="text-xs text-slate-500">Student identity is automatically verified and locked from your institutional account.</p>
                  </div>

                  {/* Auto-filled Student Identity Card */}
                  {me?.profile && (
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 text-sm">{me.profile.full_name}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          🔒 Verified Identity Locked
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-600 font-mono">
                        <div>USN: <span className="font-bold text-slate-800">{me.profile.usn}</span></div>
                        <div>Branch: <span className="font-bold text-slate-800">{me.profile.department}</span></div>
                        <div>Semester: <span className="font-bold text-slate-800">{me.profile.semester}</span></div>
                        <div>Section: <span className="font-bold text-slate-800">{me.profile.section}</span></div>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleVolunteerApply} className="space-y-4 text-xs">
                    <div>
                      <label className="label">Contact Mobile / WhatsApp Number *</label>
                      <input
                        className="input font-mono"
                        type="tel"
                        placeholder="e.g. 9876543210"
                        value={volForm.phone}
                        onChange={e => setVolForm({ ...volForm, phone: e.target.value })}
                        required
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        This is the only field you can update. Used by faculty coordinators for duty allocations.
                      </span>
                    </div>

                    <div>
                      <label className="label">Preferred Responsibility Area *</label>
                      <select
                        className="input"
                        value={volForm.preferred_area}
                        onChange={e => setVolForm({ ...volForm, preferred_area: e.target.value })}
                      >
                        {['Logistics & Stage', 'Registration Desk', 'Hospitality & Food', 'Technical Support', 'Media & Press'].map(a => (
                          <option key={a} value={a}>{a}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="label">Skills / Strengths *</label>
                      <input
                        className="input"
                        placeholder="e.g. Stage Management, Anchoring, Registration, Audio/Visual"
                        value={volForm.skills}
                        onChange={e => setVolForm({ ...volForm, skills: e.target.value })}
                        required
                      />
                    </div>

                    <div>
                      <label className="label">Previous Event Experience (Optional)</label>
                      <input
                        className="input"
                        placeholder="Previous campus events coordinated..."
                        value={volForm.experience}
                        onChange={e => setVolForm({ ...volForm, experience: e.target.value })}
                      />
                    </div>

                    <button
                      type="submit"
                      className="btn btn-primary w-full py-3 text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 active:scale-98 transition"
                    >
                      <IconHeartHandshake size={18} />
                      <span>Submit Official Volunteer Application</span>
                    </button>
                  </form>
                </div>
              )}

              {/* SECTION B: IF PARTICIPATE PURPOSE SELECTED -> CIRCULATE ONLY THE FORM GIVEN BY FACULTY */}
              {applyPurpose === 'participate' && (
                <div className="space-y-4 pt-2">
                  {/* OPTION B1: CUSTOM DYNAMIC FORM (IF BUILT/PUBLISHED BY FACULTY) */}
                  {Boolean(form?.questions && form.questions.length > 0) ? (
                    <div className="space-y-3">
                      <div className="border-b pb-2">
                        <h3 className="font-bold text-sm text-slate-900">Official Event Registration Form</h3>
                        <p className="text-xs text-slate-500">
                          Please complete all custom questions configured specifically for this event by the faculty coordinator.
                        </p>
                      </div>
                      <DynamicFormRenderer
                        eventId={eventId}
                        form={form}
                        onSubmitSuccess={async () => {
                          await loadAll()
                        }}
                      />
                    </div>
                  ) : ev.team_enabled && !ev.individual_enabled ? (
                    /* OPTION B2: DEFAULT TEAM REGISTRATION FORM ONLY */
                    <div className="space-y-4">
                      <div className="border-b pb-2">
                        <h3 className="font-bold text-sm text-slate-900">Team Registration Form</h3>
                        <p className="text-xs text-slate-500">
                          Team size limit: {ev.min_team_size} – {ev.max_team_size} members. Leader: <b>{me?.profile?.full_name}</b> ({me?.profile?.usn})
                        </p>
                      </div>

                      {ev?.require_same_department && (
                        <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center gap-2">
                          <span>🔒</span>
                          <div>
                            <strong>Single-Department Restriction Active:</strong> All invited team members must belong to your department ({me?.profile?.department || 'same department'}).
                          </div>
                        </div>
                      )}

                      <form onSubmit={handleCreateTeam} className="space-y-3.5 text-xs">
                        <div>
                          <label className="label">Team Name *</label>
                          <input
                            className="input font-semibold"
                            placeholder="e.g. CyberKnights"
                            value={teamForm.team_name}
                            onChange={e => setTeamForm({ ...teamForm, team_name: e.target.value })}
                            required
                          />
                        </div>

                        <div>
                          <label className="label">Project / Idea Title *</label>
                          <input
                            className="input"
                            placeholder="e.g. Smart Campus Energy Monitoring AI"
                            value={teamForm.project_title}
                            onChange={e => setTeamForm({ ...teamForm, project_title: e.target.value })}
                            required
                          />
                        </div>

                        <div>
                          <label className="label">Problem Statement *</label>
                          <textarea
                            className="input"
                            rows={2}
                            placeholder="What problem does this project solve?"
                            value={teamForm.problem_statement}
                            onChange={e => setTeamForm({ ...teamForm, problem_statement: e.target.value })}
                            required
                          />
                        </div>

                        <div>
                          <label className="label">Proposed Solution *</label>
                          <textarea
                            className="input"
                            rows={2}
                            placeholder="Technical approach, architecture, or workflow..."
                            value={teamForm.proposed_solution}
                            onChange={e => setTeamForm({ ...teamForm, proposed_solution: e.target.value })}
                            required
                          />
                        </div>

                        <div>
                          <label className="label">Technology Stack / Tools</label>
                          <input
                            className="input"
                            placeholder="e.g. React, FastAPI, PyTorch, ESP32"
                            value={teamForm.tech_stack}
                            onChange={e => setTeamForm({ ...teamForm, tech_stack: e.target.value })}
                          />
                        </div>

                        {ev?.idea_ppt_required && (
                          <div className="space-y-2">
                            <label className="label">Presentation Slide Deck (PPT / PDF Upload) *</label>
                            <ImageFileUpload
                              value={teamForm.pitch_deck_url}
                              onChange={url => setTeamForm({ ...teamForm, pitch_deck_url: url })}
                              accept=".ppt,.pptx,.pdf"
                              placeholder="Click or drag to upload Pitch Deck (.pptx / .pdf)"
                              helperText="Upload your team's idea presentation deck detailing problem statement and architecture."
                              required
                            />
                            {ev?.ppt_template_url && (
                              <div className="p-2.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 flex items-center justify-between text-xs mt-2">
                                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                                  <span className="w-5 h-5 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">📥</span>
                                  <span>Official Coordinator PPT Template Available</span>
                                </div>
                                <a
                                  href={ev.ppt_template_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btn-primary px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
                                >
                                  <IconDownload size={13} />
                                  <span>Download Template PPT</span>
                                </a>
                              </div>
                            )}
                          </div>
                        )}

                        {ev?.require_id_proof && (
                          <ImageFileUpload
                            label="Team Leader College ID Card Photo (Picture Upload)"
                            value={teamForm.id_proof_url}
                            onChange={url => setTeamForm({ ...teamForm, id_proof_url: url })}
                            accept="image/*"
                            placeholder="Click or drag College ID card photo"
                            helperText="Upload a clear picture of your college student ID card."
                            required
                          />
                        )}

                        <div>
                          <label className="label">Invite Member USNs (Comma separated)</label>
                          <input
                            className="input font-mono"
                            placeholder="1VV23CSE002, 1VV23CSE003"
                            value={teamForm.member_usns}
                            onChange={e => setTeamForm({ ...teamForm, member_usns: e.target.value })}
                          />
                          <span className="text-[10px] text-slate-400 mt-0.5 block">
                            Team size limit: {ev?.min_team_size || 2} to {ev?.max_team_size || 4} members including leader.
                          </span>
                        </div>

                        <button
                          type="submit"
                          className="btn btn-primary w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-2xs active:scale-98 transition"
                        >
                          <IconUsers size={16} />
                          <span>Submit Team Registration & Dispatch Invitations</span>
                        </button>
                      </form>
                    </div>
                  ) : !ev.team_enabled && ev.individual_enabled ? (
                    /* OPTION B3: DEFAULT INDIVIDUAL REGISTRATION FORM ONLY */
                    <div className="space-y-4">
                      <div className="border-b pb-2">
                        <h3 className="font-bold text-sm text-slate-900">Individual Registration Form</h3>
                        <p className="text-xs text-slate-500">
                          Participant: <b>{me?.profile?.full_name}</b> ({me?.profile?.usn}) · {me?.profile?.department}
                        </p>
                      </div>

                      <form onSubmit={handleIndividualDefaultRegister} className="space-y-3.5 text-xs">
                        {me?.profile && (
                          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                            <div>USN: <b className="text-slate-800">{me.profile.usn}</b></div>
                            <div>Dept: <b className="text-slate-800">{me.profile.department}</b></div>
                            <div>Sem: <b className="text-slate-800">{me.profile.semester}</b></div>
                            <div>Sec: <b className="text-slate-800">{me.profile.section}</b></div>
                          </div>
                        )}

                        <div>
                          <label className="label">Contact Mobile / WhatsApp Number *</label>
                          <input
                            className="input font-mono"
                            type="tel"
                            placeholder="e.g. 9876543210"
                            value={indivForm.phone}
                            onChange={e => setIndivForm({ ...indivForm, phone: e.target.value })}
                            required
                          />
                        </div>

                        {ev?.idea_ppt_required && (
                          <>
                            <div>
                              <label className="label">Project / Idea Title *</label>
                              <input
                                className="input"
                                placeholder="Title of your project or presentation"
                                value={indivForm.project_title}
                                onChange={e => setIndivForm({ ...indivForm, project_title: e.target.value })}
                                required
                              />
                            </div>
                            <div>
                              <label className="label">Problem Statement / Abstract *</label>
                              <textarea
                                className="input"
                                rows={2}
                                placeholder="Summary of your solution..."
                                value={indivForm.abstract}
                                onChange={e => setIndivForm({ ...indivForm, abstract: e.target.value })}
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="label">Presentation Slide Deck / Proposal (Upload) *</label>
                              <ImageFileUpload
                                value={indivForm.pitch_deck_url}
                                onChange={url => setIndivForm({ ...indivForm, pitch_deck_url: url })}
                                accept=".ppt,.pptx,.pdf"
                                placeholder="Click or drag to upload Slide Deck / Proposal (.pptx / .pdf)"
                                helperText="Upload your pitch deck or project proposal."
                                required
                              />
                              {ev?.ppt_template_url && (
                                <div className="p-2.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 flex items-center justify-between text-xs mt-2">
                                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                                    <span className="w-5 h-5 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">📥</span>
                                    <span>Official Coordinator PPT Template Available</span>
                                  </div>
                                  <a
                                    href={ev.ppt_template_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-primary px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
                                  >
                                    <IconDownload size={13} />
                                    <span>Download Template PPT</span>
                                  </a>
                                </div>
                              )}
                            </div>
                          </>
                        )}

                        {ev?.require_id_proof && (
                          <ImageFileUpload
                            label="Student College ID Card Photo (Picture Upload)"
                            value={indivForm.id_proof_url}
                            onChange={url => setIndivForm({ ...indivForm, id_proof_url: url })}
                            accept="image/*"
                            placeholder="Click or drag College ID card photo"
                            helperText="Upload a clear picture of your college student ID card."
                            required
                          />
                        )}

                        <button
                          type="submit"
                          disabled={submittingReg}
                          className="btn-primary w-full text-xs font-semibold py-2.5"
                        >
                          {submittingReg ? 'Submitting Registration...' : 'Submit Individual Registration'}
                        </button>
                      </form>
                    </div>
                  ) : (
                    /* OPTION B4: BOTH ENABLED -> CLEAN TOGGLE BETWEEN TEAM AND INDIVIDUAL */
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 border-b pb-2">
                        <button
                          type="button"
                          onClick={() => setEntryMode('team')}
                          className={`btn-sm text-xs font-bold ${entryMode === 'team' ? 'btn-primary' : 'btn-outline'}`}
                        >
                          👥 Team Registration Form
                        </button>
                        <button
                          type="button"
                          onClick={() => setEntryMode('individual')}
                          className={`btn-sm text-xs font-bold ${entryMode === 'individual' ? 'btn-primary' : 'btn-outline'}`}
                        >
                          👤 Individual Registration Form
                        </button>
                      </div>

                      {entryMode === 'team' ? (
                        /* Render Team Form */
                        <form onSubmit={handleCreateTeam} className="space-y-3.5 text-xs">
                          <div>
                            <label className="label">Team Name *</label>
                            <input
                              className="input font-semibold"
                              placeholder="e.g. CyberKnights"
                              value={teamForm.team_name}
                              onChange={e => setTeamForm({ ...teamForm, team_name: e.target.value })}
                              required
                            />
                          </div>
                          <div>
                            <label className="label">Project / Idea Title *</label>
                            <input
                              className="input"
                              placeholder="e.g. Smart Campus Energy Monitoring AI"
                              value={teamForm.project_title}
                              onChange={e => setTeamForm({ ...teamForm, project_title: e.target.value })}
                              required
                            />
                          </div>
                          <div>
                            <label className="label">Problem Statement *</label>
                            <textarea
                              className="input"
                              rows={2}
                              placeholder="What problem does this project solve?"
                              value={teamForm.problem_statement}
                              onChange={e => setTeamForm({ ...teamForm, problem_statement: e.target.value })}
                              required
                            />
                          </div>
                          <div>
                            <label className="label">Proposed Solution *</label>
                            <textarea
                              className="input"
                              rows={2}
                              placeholder="Technical approach, architecture, or workflow..."
                              value={teamForm.proposed_solution}
                              onChange={e => setTeamForm({ ...teamForm, proposed_solution: e.target.value })}
                              required
                            />
                          </div>
                          <div>
                            <label className="label">Technology Stack / Tools</label>
                            <input
                              className="input"
                              placeholder="e.g. React, FastAPI, PyTorch, ESP32"
                              value={teamForm.tech_stack}
                              onChange={e => setTeamForm({ ...teamForm, tech_stack: e.target.value })}
                            />
                          </div>
                          {ev?.idea_ppt_required && (
                            <div className="space-y-1.5">
                              <label className="label">Presentation Slide Deck (PPT / PDF URL) *</label>
                              <input
                                className="input font-mono"
                                placeholder="https://storage.vvce.ac.in/decks/team-pitch.pdf"
                                value={teamForm.pitch_deck_url}
                                onChange={e => setTeamForm({ ...teamForm, pitch_deck_url: e.target.value })}
                                required
                              />
                              {ev?.ppt_template_url && (
                                <div className="p-2.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 flex items-center justify-between text-xs mt-2">
                                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                                    <span className="w-5 h-5 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">📥</span>
                                    <span>Official Coordinator PPT Template Available</span>
                                  </div>
                                  <a
                                    href={ev.ppt_template_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-primary px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
                                  >
                                    <IconDownload size={13} />
                                    <span>Download Template PPT</span>
                                  </a>
                                </div>
                              )}
                            </div>
                          )}
                          {ev?.require_id_proof && (
                            <div>
                              <label className="label">Team Leader College ID Proof URL *</label>
                              <input
                                className="input font-mono"
                                placeholder="https://storage.vvce.ac.in/proofs/id.jpg"
                                value={teamForm.id_proof_url}
                                onChange={e => setTeamForm({ ...teamForm, id_proof_url: e.target.value })}
                                required
                              />
                            </div>
                          )}
                          <div>
                            <label className="label">Invite Member USNs (Comma separated)</label>
                            <input
                              className="input font-mono"
                              placeholder="1VV23CSE002, 1VV23CSE003"
                              value={teamForm.member_usns}
                              onChange={e => setTeamForm({ ...teamForm, member_usns: e.target.value })}
                            />
                          </div>
                          <button type="submit" className="btn-primary w-full text-xs font-semibold py-2.5">
                            Submit Team Registration & Dispatch Invitations
                          </button>
                        </form>
                      ) : (
                        /* Render Individual Form */
                        <form onSubmit={handleIndividualDefaultRegister} className="space-y-3.5 text-xs">
                          <div>
                            <label className="label">Contact Mobile / WhatsApp Number *</label>
                            <input
                              className="input font-mono"
                              type="tel"
                              placeholder="e.g. 9876543210"
                              value={indivForm.phone}
                              onChange={e => setIndivForm({ ...indivForm, phone: e.target.value })}
                              required
                            />
                          </div>
                          {ev?.idea_ppt_required && (
                            <>
                              <div>
                                <label className="label">Project / Idea Title *</label>
                                <input
                                  className="input"
                                  placeholder="Title of your project or presentation"
                                  value={indivForm.project_title}
                                  onChange={e => setIndivForm({ ...indivForm, project_title: e.target.value })}
                                  required
                                />
                              </div>
                              <div>
                                <label className="label">Problem Statement / Abstract *</label>
                                <textarea
                                  className="input"
                                  rows={2}
                                  placeholder="Summary of your solution..."
                                  value={indivForm.abstract}
                                  onChange={e => setIndivForm({ ...indivForm, abstract: e.target.value })}
                                  required
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="label">Presentation Slide Deck / Proposal URL *</label>
                                <input
                                  className="input font-mono"
                                  placeholder="https://storage.vvce.ac.in/decks/individual-pitch.pdf"
                                  value={indivForm.pitch_deck_url}
                                  onChange={e => setIndivForm({ ...indivForm, pitch_deck_url: e.target.value })}
                                  required
                                />
                                {ev?.ppt_template_url && (
                                  <div className="p-2.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                                      <span className="w-5 h-5 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">📥</span>
                                      <span>Official Coordinator PPT Template Available</span>
                                    </div>
                                    <a
                                      href={ev.ppt_template_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-3 py-1 rounded-full text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition flex items-center gap-1 shadow-2xs"
                                    >
                                      <IconDownload size={13} />
                                      <span>Download Template PPT</span>
                                    </a>
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                          {ev?.require_id_proof && (
                            <ImageFileUpload
                              label="Student College ID Card Photo (Picture Upload) *"
                              value={indivForm.id_proof_url}
                              onChange={url => setIndivForm({ ...indivForm, id_proof_url: url })}
                              accept="image/*"
                              placeholder="Click or drag college ID card picture (PNG/JPG)"
                              helperText="Upload a clear picture of your college student ID card."
                              required
                            />
                          )}
                          <button
                            type="submit"
                            disabled={submittingReg}
                            className="btn btn-primary w-full py-3 text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 active:scale-98 transition disabled:opacity-50"
                          >
                            <IconUserCheck size={18} />
                            <span>{submittingReg ? 'Submitting Registration...' : 'Submit Individual Registration'}</span>
                          </button>
                        </form>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB: TEAMS */}
      {activeTab === 'teams' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-default pb-4">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <IconUsers size={20} className="text-blue-600 dark:text-blue-400" />
                <span>Team Registration Workspace</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Team size: {ev.min_team_size} – {ev.max_team_size} members. Every member must accept their invite before shortlisting.
              </p>
            </div>
            <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-mono self-start sm:self-auto">
              {participants.teams?.length || 0} Registered Teams
            </span>
          </div>

          {/* Leadership Committee Status Banner */}
          {isPresidentOrVp && (
            <div className="card space-y-2 border-2 border-purple-500 bg-purple-50/20 dark:bg-purple-950/20 p-5 shadow-xs">
              <div className="flex items-center gap-3">
                <span className="text-xl">🏛️</span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Student Leadership Committee ({myLeadershipRecord?.role?.replace('_', ' ')}) · Team Shortlisting Workspace
                  </h3>
                  <p className="text-xs text-purple-700 dark:text-purple-300">
                    As an appointed event leader, you evaluate team proposals, inspect pitch decks, and shortlist teams for the competition rounds. Under VVCE governance regulations, student leaders cannot form teams or participate as contestants.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Volunteer Status Banner */}
          {hasActiveVolunteer && !isPresidentOrVp && (
            <div className="card space-y-2 border-2 border-blue-500 bg-blue-50/20 dark:bg-blue-950/20 p-5 shadow-xs">
              <div className="flex items-center gap-3">
                <span className="text-xl">🤝</span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Active Event Volunteer Status ({myVolunteerApp?.status})
                  </h3>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    You have submitted an official volunteer application for this event. Team formation and contestant participation are prohibited under institutional single-purpose guidelines.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Already in a Team Status */}
          {status?.team && (
            <div className="card p-5 border border-emerald-300 dark:border-emerald-800 bg-emerald-50/20 dark:bg-emerald-950/20 space-y-2">
              <div className="flex items-center justify-between border-b border-emerald-200 dark:border-emerald-800 pb-2">
                <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <span>👥</span> Your Registered Team: {status.team.name}
                </span>
                <span className="badge badge-success text-[11px] font-bold">
                  {status.team.is_leader ? 'Team Leader' : 'Team Member'} · {status.team.status}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                You are registered in team <strong>{status.team.name}</strong>. Single-purpose registration is confirmed and locked.
              </p>
            </div>
          )}

          {/* Registered Individually Status */}
          {status?.registration && !status?.team && (
            <div className="card p-5 border border-emerald-300 dark:border-emerald-800 bg-emerald-50/20 dark:bg-emerald-950/20 space-y-2">
              <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <span>👤</span> Registered as Individual Contestant
              </span>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Registration ID: #{status.registration.id || status.registration.registration_id}. Dual participation in teams is prohibited under single-purpose regulations.
              </p>
            </div>
          )}

          {/* Ended Status Banner */}
          {isEnded && (
            <div className="card space-y-2 border-2 border-rose-500 bg-rose-50/20 dark:bg-rose-950/20 p-5 shadow-xs">
              <div className="flex items-center gap-3">
                <IconClock size={22} className="text-rose-600 dark:text-rose-400 shrink-0" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Event Concluded · Team Registration Closed
                  </h3>
                  <p className="text-xs text-rose-700 dark:text-rose-300">
                    This event has concluded. No new teams can be formed or invitations dispatched.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className={`grid ${canCreateTeam ? 'md:grid-cols-2' : 'grid-cols-1'} gap-6`}>
            {/* Create Team Form (ONLY for eligible Contestant Students) */}
            {canCreateTeam && (
              <div className="glass-card p-6 sm:p-7 rounded-3xl border border-border-default bg-white dark:bg-[#0E1017] shadow-sm space-y-5">
                <div className="border-b border-border-default pb-3">
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">Form a New Team</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Leader: <strong className="text-slate-800 dark:text-slate-200">{me?.profile?.full_name || 'You'}</strong> ({me?.profile?.usn || ''}) · {me?.profile?.department || ''}
                  </p>
                </div>

                {ev?.require_same_department && (
                  <div className="p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 text-xs flex items-center gap-2.5">
                    <IconShield size={16} className="text-blue-600 shrink-0" />
                    <div>
                      <strong>Single-Department Restriction Active:</strong> All invited team members must belong to your department ({me?.profile?.department || 'same department'}).
                    </div>
                  </div>
                )}

                <form onSubmit={handleCreateTeam} className="space-y-4 text-xs">
                  <div>
                    <label className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">Team Name *</label>
                    <input
                      className="input font-bold text-xs py-2.5 w-full rounded-xl"
                      placeholder="e.g. CyberKnights"
                      value={teamForm.team_name}
                      onChange={e => setTeamForm({ ...teamForm, team_name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">Project / Idea Title</label>
                    <input
                      className="input text-xs py-2.5 w-full rounded-xl"
                      placeholder="e.g. Smart Campus Traffic AI"
                      value={teamForm.project_title}
                      onChange={e => setTeamForm({ ...teamForm, project_title: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">Problem Statement</label>
                    <textarea
                      className="input text-xs py-2 w-full rounded-xl"
                      rows={2}
                      placeholder="What problem does this project solve?"
                      value={teamForm.problem_statement}
                      onChange={e => setTeamForm({ ...teamForm, problem_statement: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">Proposed Solution</label>
                    <textarea
                      className="input text-xs py-2 w-full rounded-xl"
                      rows={2}
                      placeholder="Technical approach, architecture, or workflow..."
                      value={teamForm.proposed_solution}
                      onChange={e => setTeamForm({ ...teamForm, proposed_solution: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">Technology Stack / Tools</label>
                    <input
                      className="input text-xs py-2.5 w-full rounded-xl"
                      placeholder="e.g. React, FastAPI, PyTorch, ESP32"
                      value={teamForm.tech_stack}
                      onChange={e => setTeamForm({ ...teamForm, tech_stack: e.target.value })}
                    />
                  </div>

                  {ev?.idea_ppt_required && (
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Pitch Deck (PPT/PDF URL or Upload Link) *</label>
                      <input
                        className="input font-mono text-xs py-2.5 w-full rounded-xl"
                        placeholder="https://storage.vvce.ac.in/decks/team-pitch.pdf"
                        value={teamForm.pitch_deck_url}
                        onChange={e => setTeamForm({ ...teamForm, pitch_deck_url: e.target.value })}
                        required
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Presentation slide deck detailing your team architecture & roadmap.
                      </span>
                      {ev?.ppt_template_url && (
                        <div className="p-2.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 flex items-center justify-between text-xs mt-2">
                          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                            <span className="w-5 h-5 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">📥</span>
                            <span>Official Coordinator PPT Template Available</span>
                          </div>
                          <a
                            href={ev.ppt_template_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1 rounded-full text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition flex items-center gap-1 shadow-2xs"
                          >
                            <IconDownload size={13} />
                            <span>Download Template PPT</span>
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  {ev?.require_id_proof && (
                    <div>
                      <label className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">Team Leader College ID Proof URL *</label>
                      <input
                        className="input font-mono text-xs py-2.5 w-full rounded-xl"
                        placeholder="https://storage.vvce.ac.in/proofs/id.jpg"
                        value={teamForm.id_proof_url}
                        onChange={e => setTeamForm({ ...teamForm, id_proof_url: e.target.value })}
                        required
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">Invite Member USNs (Comma separated)</label>
                    <input
                      className="input font-mono text-xs py-2.5 w-full rounded-xl"
                      placeholder="1VV23CSE002, 1VV23CSE003"
                      value={teamForm.member_usns}
                      onChange={e => setTeamForm({ ...teamForm, member_usns: e.target.value })}
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Team size limit: {ev?.min_team_size || 2} to {ev?.max_team_size || 4} members including leader.
                    </span>
                  </div>
                  <button type="submit" className="btn btn-primary w-full py-3 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider shadow-md shadow-blue-500/20 active:scale-98">
                    Create Team & Dispatch Invitations
                  </button>
                </form>
              </div>
            )}

            {/* Existing Teams List */}
            <div className={`glass-card p-6 sm:p-7 rounded-3xl border border-border-default bg-white dark:bg-[#0E1017] shadow-sm space-y-4 ${canCreateTeam ? '' : 'col-span-full'}`}>
              <div className="flex items-center justify-between border-b border-border-default pb-3">
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Registered Teams</h3>
                <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                  {participants.teams?.length || 0}
                </span>
              </div>
              <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
                {(participants.teams || []).length === 0 ? (
                  <div className="py-12 text-center space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto text-xl">
                      👥
                    </div>
                    <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">No teams registered yet</p>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      {isPresidentOrVp
                        ? 'Contestant teams formed by students will appear here for leadership evaluation and shortlisting.'
                        : 'Teams formed by students will appear here.'}
                    </p>
                  </div>
                ) : (
                  (participants.teams || []).map((t: any) => (
                  <div key={t.id} className="p-4 bg-slate-50 dark:bg-[#121520] rounded-2xl border border-border-default text-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-white text-sm">{t.team_name}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        t.status === 'SHORTLISTED'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : t.status === 'COMPLETE'
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-border-default'
                      }`}>
                        {t.status}
                      </span>
                    </div>
                    {t.project_title && <p className="text-slate-700 dark:text-slate-300 font-medium">Project: {t.project_title}</p>}
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider mb-1">Members:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {t.members?.map((m: any) => (
                          <span key={m.student_id} className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#0E1017] border border-border-default text-[11px] font-medium text-slate-800 dark:text-slate-200">
                            {m.name} ({m.usn}) · {m.status}
                          </span>
                        ))}
                      </div>
                    </div>
                    {isPresidentOrVp && !isEnded && t.status === 'COMPLETE' && (
                      <button
                        onClick={() => handleShortlistTeam(t.id)}
                        className="btn btn-success px-4 py-2 rounded-xl text-xs font-semibold w-full flex items-center justify-center gap-1.5 shadow-2xs active:scale-98"
                      >
                        ✓ Shortlist Complete Team
                      </button>
                    )}
                    {isFaculty && t.status === 'COMPLETE' && (
                      <div className="text-[11px] text-blue-700 dark:text-blue-300 bg-blue-50/60 dark:bg-blue-950/40 p-2.5 rounded-xl border border-blue-200 dark:border-blue-800 text-center font-medium">
                        Autonomous shortlisting delegated to Student Leadership (President / VP)
                      </div>
                    )}
                  </div>
                )))}
              </div>
            </div>
          </div>

          {/* Shortlisted Teams & Fee Status Monitoring Table */}
          {(isFaculty || isPresidentOrVp) && (
            <div className="glass-card p-6 sm:p-7 rounded-3xl border border-border-default bg-white dark:bg-[#0E1017] shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-border-default pb-3">
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <IconAward size={18} className="text-blue-600 dark:text-blue-400" />
                    <span>Shortlisted Teams & Fee Status ({shortlistedTeams.length})</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Teams shortlisted by the Student Leadership Committee. Fee payment confirms official WhatsApp group access.
                  </p>
                </div>
                {isFaculty && (
                  <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-3 py-1 rounded-full border border-blue-200 dark:border-blue-800">
                    Delegated to Student Committee
                  </span>
                )}
              </div>

              {shortlistedTeams.length > 0 ? (
                <div className="table-container rounded-2xl border border-border-default overflow-x-auto">
                  <table className="table-enterprise w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border-default bg-slate-50/50 dark:bg-[#121520] text-slate-500 uppercase font-mono text-[10px] tracking-wider">
                        <th className="p-3">Team Name</th>
                        <th className="p-3">Team Leader</th>
                        <th className="p-3">Leader Phone</th>
                        <th className="p-3">Pitch Deck</th>
                        <th className="p-3">Shortlisted By</th>
                        <th className="p-3">Payment Status</th>
                        <th className="p-3">Transaction Ref</th>
                        <th className="p-3">Payment Receipt</th>
                        <th className="p-3">WhatsApp Access</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-default font-sans">
                      {shortlistedTeams.map((st: any) => (
                        <tr key={st.team_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                          <td className="p-3 font-bold text-slate-900 dark:text-white">{st.team_name}</td>
                          <td className="p-3">
                            <span className="font-semibold text-slate-800 dark:text-slate-200 block">{st.leader_name}</span>
                            <span className="text-[11px] text-slate-400 font-mono">{st.leader_usn}</span>
                          </td>
                          <td className="p-3 font-mono text-slate-600 dark:text-slate-400">{st.leader_phone || '—'}</td>
                          <td className="p-3">
                            {st.pitch_deck_url ? (
                              <a href={st.pitch_deck_url} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline font-bold">
                                View Deck ↗
                              </a>
                            ) : '—'}
                          </td>
                          <td className="p-3">
                            <span className="font-semibold text-slate-800 dark:text-slate-200 block">{st.shortlisted_by_name}</span>
                            <span className="text-[11px] text-slate-400">{st.shortlisted_by_role}</span>
                          </td>
                          <td className="p-3">
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              st.payment_status === 'PAID'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                            }`}>
                              {st.payment_status}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-xs text-slate-700 dark:text-slate-300">{st.payment_reference || 'Pending'}</td>
                          <td className="p-3">
                            {st.payment_receipt_url ? (
                              <a
                                href={st.payment_receipt_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 dark:text-blue-400 hover:underline font-bold text-xs inline-flex items-center gap-1"
                              >
                                <span>🧾</span> View Receipt ↗
                              </a>
                            ) : (
                              <span className="text-slate-400 text-xs">—</span>
                            )}
                          </td>
                          <td className="p-3">
                            {st.group_joined ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                ✓ Group Released
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                Pending Payment
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-6 text-center">No teams shortlisted yet.</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB: VOLUNTEERS */}
      {activeTab === 'volunteers' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-default pb-4">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <IconHeartHandshake size={20} className="text-blue-600 dark:text-blue-400" />
                <span>Volunteer Operations Hub</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Student volunteer applications, faculty coordinator approval, duty allocation, and completion verification.
              </p>
            </div>
            <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-mono self-start sm:self-auto">
              {volunteers.length} Active Volunteers
            </span>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Ended Banner for Student */}
            {accountType === 'STUDENT' && isEnded && (
              <div className="glass-card p-6 rounded-3xl border border-rose-200 dark:border-rose-800 bg-rose-50/20 dark:bg-rose-950/20 text-center space-y-2">
                <IconClock size={24} className="text-rose-600 dark:text-rose-400 mx-auto" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Volunteer Applications Closed</h3>
                <p className="text-xs text-rose-700 dark:text-rose-300">This event has concluded. Volunteer recruitment is permanently closed.</p>
              </div>
            )}

            {/* Apply Form for Student */}
            {accountType === 'STUDENT' && !isEnded && !isPresidentOrVp && !hasActiveVolunteer && !isParticipantRegistered && !isVolRejected && (
              <div className="glass-card p-6 sm:p-7 rounded-3xl border border-border-default bg-white dark:bg-[#0E1017] shadow-sm space-y-5">
                <div className="border-b border-border-default pb-3">
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">Volunteer Application</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Student identity is strictly verified from institutional records.
                  </p>
                </div>

                {/* Auto-filled Student Identity Card */}
                {me?.profile && (
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#121520] border border-border-default space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-white">{me.profile.full_name}</span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        🔒 Verified Identity
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-400 font-mono">
                      <div>USN: <span className="font-bold text-slate-800 dark:text-slate-200">{me.profile.usn}</span></div>
                      <div>Branch: <span className="font-bold text-slate-800 dark:text-slate-200">{me.profile.department}</span></div>
                      <div>Semester: <span className="font-bold text-slate-800 dark:text-slate-200">{me.profile.semester}</span></div>
                      <div>Section: <span className="font-bold text-slate-800 dark:text-slate-200">{me.profile.section}</span></div>
                    </div>
                  </div>
                )}

                <form onSubmit={handleVolunteerApply} className="space-y-4 text-xs">
                  <div>
                    <label className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">Contact Mobile / WhatsApp Number *</label>
                    <input
                      className="input font-mono text-xs py-2.5 w-full rounded-xl"
                      type="tel"
                      placeholder="e.g. 9876543210"
                      value={volForm.phone}
                      onChange={e => setVolForm({ ...volForm, phone: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">Preferred Responsibility Area</label>
                    <select
                      className="input text-xs py-2.5 w-full rounded-xl font-medium"
                      value={volForm.preferred_area}
                      onChange={e => setVolForm({ ...volForm, preferred_area: e.target.value })}
                    >
                      {['Logistics & Stage', 'Registration Desk', 'Hospitality & Food', 'Technical Support', 'Media & Press'].map(a => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">Skills / Strengths</label>
                    <input
                      className="input text-xs py-2.5 w-full rounded-xl"
                      placeholder="e.g. Photography, Anchoring, Registration"
                      value={volForm.skills}
                      onChange={e => setVolForm({ ...volForm, skills: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">Previous Experience (Optional)</label>
                    <input
                      className="input text-xs py-2.5 w-full rounded-xl"
                      placeholder="Previous events coordinated..."
                      value={volForm.experience}
                      onChange={e => setVolForm({ ...volForm, experience: e.target.value })}
                    />
                  </div>

                  <button type="submit" className="btn btn-primary w-full py-3 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider shadow-md shadow-blue-500/20 active:scale-98">
                    Submit Volunteer Application
                  </button>
                </form>
              </div>
            )}

            {/* Volunteers Roster Table */}
            <div className={`glass-card p-6 sm:p-7 rounded-3xl border border-border-default bg-white dark:bg-[#0E1017] shadow-sm space-y-4 ${accountType !== 'STUDENT' || isPresidentOrVp || hasActiveVolunteer || isParticipantRegistered || isVolRejected ? 'col-span-full' : 'md:col-span-2'}`}>
              <div className="flex items-center justify-between border-b border-border-default pb-3">
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Volunteer Roster</h3>
                <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                  {volunteers.length}
                </span>
              </div>
              <div className="table-container rounded-2xl border border-border-default overflow-x-auto max-h-[550px]">
                <table className="table-enterprise w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border-default bg-slate-50/50 dark:bg-[#121520] text-slate-500 uppercase font-mono text-[10px] tracking-wider">
                      <th className="p-3">Volunteer</th>
                      <th className="p-3">Skills / Area</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Allocation</th>
                      <th className="p-3">Completion</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-default">
                    {volunteers.map(v => (
                      <tr key={v.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                        <td className="p-3 font-semibold text-slate-900 dark:text-white">
                          {v.name}
                          <span className="block text-[11px] text-slate-400 font-mono">{v.usn} · {v.department}</span>
                        </td>
                        <td className="p-3">
                          <span className="font-medium text-slate-800 dark:text-slate-200 block">{v.preferred_area}</span>
                          <span className="text-slate-400 text-[11px]">{v.skills}</span>
                        </td>
                        <td className="p-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            v.status === 'APPROVED'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : v.status === 'REJECTED'
                                ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                          }`}>
                            {v.status}
                          </span>
                        </td>
                        <td className="p-3">
                          {v.responsibility ? (
                            <span className="text-slate-800 dark:text-slate-200 font-medium">{v.responsibility} ({v.allocation})</span>
                          ) : (
                            <span className="text-slate-400 italic">Unallocated</span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            v.completion_status === 'COMPLETED'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-border-default'
                          }`}>
                            {v.completion_status}
                          </span>
                        </td>
                        <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                          {isFaculty && v.status === 'PENDING' && (
                            <>
                              <button onClick={() => handleApproveVolunteer(v.id, true)} className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition active:scale-98">
                                Approve
                              </button>
                              <button onClick={() => handleApproveVolunteer(v.id, false)} className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition active:scale-98">
                                Reject
                              </button>
                            </>
                          )}
                          {isPresidentOrVp && v.status === 'PENDING' && !v.recommended_by && (
                            <button onClick={() => handleRecommendVolunteer(v.id)} className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition active:scale-98">
                              Recommend
                            </button>
                          )}
                          {isFaculty && v.status === 'APPROVED' && (
                            <>
                              <button
                                onClick={() => {
                                  setAllocatingApp(v)
                                  setAllocResp(v.responsibility || '')
                                  setAllocArea(v.allocation || '')
                                }}
                                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition active:scale-98"
                              >
                                Allocate
                              </button>
                              <button
                                onClick={() => handleCompleteVolunteer(v.id, v.completion_status !== 'COMPLETED')}
                                className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-98"
                              >
                                {v.completion_status === 'COMPLETED' ? 'Mark Incomplete' : 'Verify Completion'}
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: FORM BUILDER (DYNAMIC FORM BUILDER) */}
      {activeTab === 'form_builder' && isFaculty && (
        <DynamicFormBuilder
          eventId={eventId}
          eventName={ev?.name}
          eventDescription={ev?.description}
          initialForm={form}
          onPublished={async () => {
            await loadAll()
          }}
        />
      )}
      {activeTab === 'form_builder' && !isFaculty && (
        <div className="card max-w-xl mx-auto p-8 text-center space-y-3 bg-amber-50/50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-3xl">
          <IconAlertTriangle size={32} className="text-amber-600 dark:text-amber-400 mx-auto" />
          <h3 className="text-base font-bold text-amber-900 dark:text-amber-200">Faculty Coordinator Access Required</h3>
          <p className="text-xs text-amber-800 dark:text-amber-300">The Dynamic Form Builder is restricted to assigned Faculty Coordinators. Please sign in with an authorized Faculty account to customize registration form questions.</p>
        </div>
      )}

      {/* TAB: PARTICIPANTS & SUBMISSIONS */}
      {activeTab === 'participants' && (isFaculty || isPresidentOrVp) && (
        <div className="glass-card p-6 sm:p-8 rounded-3xl border border-border-default space-y-6 bg-white dark:bg-[#0E1017] shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-default pb-4">
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-purple-950/60 text-blue-600 dark:text-purple-400 border border-blue-200 dark:border-purple-800 flex items-center justify-center shrink-0">
                  <IconUsers size={16} />
                </span>
                <span>Event Registrations &amp; Submission Shortlisting</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Autonomous student leadership shortlisting console. Approved participants are queued to the Attendance Register.</p>
            </div>
            {isPresidentOrVp && !isEnded && (
              <button
                onClick={handleAutoSelect}
                className="btn btn-primary px-4 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm active:scale-98 transition shrink-0"
              >
                <IconSparkles size={14} />
                <span>Auto-Select All Eligible</span>
              </button>
            )}
            {isEnded && (
              <span className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-border-default text-xs font-bold shrink-0">
                Event Concluded · Shortlisting Finalized
              </span>
            )}
          </div>

          <div className="table-container border border-border-default rounded-2xl overflow-hidden max-h-[550px]">
            <table className="table-enterprise w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border-default text-slate-500 uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Registration ID</th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Form Version</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Responses</th>
                  <th className="py-3 px-4 text-right">Shortlist Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default font-sans">
                {(submissions.length > 0 ? submissions : participants.individuals || []).map((sub: any) => (
                  <tr key={sub.id || sub.registration_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-1 rounded-lg font-mono font-bold text-xs bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 shadow-2xs">
                        {sub.registration_id}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 dark:text-white block">{sub.name}</span>
                      <span className="text-slate-400 dark:text-slate-500 font-mono text-[11px]">{sub.usn}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-medium">
                      {sub.department} (Sem {sub.semester})
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-border-default shadow-2xs">
                        v{sub.form_version || 1}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-2xs ${
                        sub.status === 'SHORTLISTED'
                          ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                      }`}>
                        {sub.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <Link
                          to={isFaculty ? `/faculty/events/${eventId}/submissions/${sub.registration_id || sub.id}` : `/events/${eventId}/submissions/${sub.registration_id || sub.id}`}
                          className="btn btn-secondary px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 hover:border-purple-500 hover:text-purple-600 dark:hover:text-purple-400 transition active:scale-98"
                          title="Open whole page to inspect candidate's complete form details"
                        >
                          <IconEye size={13} />
                          <span>Inspect Full Form</span>
                        </Link>
                        <button
                          type="button"
                          onClick={() => setInspectingSub(sub)}
                          className="btn-outline px-2 py-1.5 rounded-xl text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                          title="Quick preview popup"
                        >
                          Quick
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {isPresidentOrVp && !isEnded && sub.status !== 'SHORTLISTED' && (
                        <button
                          onClick={() => handleShortlistReg(sub.id)}
                          className="btn btn-success px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs active:scale-98 ml-auto"
                        >
                          <IconCheck size={14} />
                          <span>Shortlist</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Modal to Inspect Student's Form Responses */}
          {inspectingSub && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
              <div className="bg-white dark:bg-[#0E1017] rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-5 max-h-[85vh] overflow-y-auto shadow-2xl border border-border-default">
                <div className="flex items-center justify-between border-b border-border-default pb-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Submission: {inspectingSub.name} ({inspectingSub.usn})
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Form Version: <b className="text-blue-600 dark:text-blue-400 font-mono">v{inspectingSub.form_version || 1}</b> · Reg ID: {inspectingSub.registration_id}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setInspectingSub(null)}
                    className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white flex items-center justify-center text-sm font-bold transition"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-3">
                  {Object.entries(inspectingSub.answers || {}).length === 0 ? (
                    <p className="text-xs text-slate-400 py-6 text-center">No questionnaire answers submitted.</p>
                  ) : (
                    Object.entries(inspectingSub.answers || {}).map(([qKey, aVal]: [string, any], aIdx) => (
                      <div key={aIdx} className="p-3.5 bg-slate-50 dark:bg-[#121520] rounded-2xl border border-border-default space-y-1">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                          {qKey}
                        </span>
                        {typeof aVal === 'object' && aVal !== null && aVal.file_url ? (
                          <div className="flex items-center gap-2 pt-1">
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">📄</span>
                            <a
                              href={aVal.file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              {aVal.filename || 'Download Uploaded File'}
                            </a>
                          </div>
                        ) : Array.isArray(aVal) ? (
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{aVal.join(', ')}</span>
                        ) : (
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{String(aVal)}</span>
                        )}
                      </div>
                    ))
                  )}
                </div>

                <div className="pt-2 border-t border-border-default flex justify-end">
                  <button
                    type="button"
                    onClick={() => setInspectingSub(null)}
                    className="btn btn-outline px-4 py-2 rounded-xl text-xs font-semibold"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: ATTENDANCE */}
      {activeTab === 'attendance' && isFaculty && (
        <div className="glass-card p-6 sm:p-8 rounded-3xl border border-border-default space-y-6 bg-white dark:bg-[#0E1017] shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-default pb-4">
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center shrink-0">
                  <IconCheckCircle size={16} />
                </span>
                <span>Participant Attendance Register</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {isCoordinator
                  ? 'Assigned Faculty Event Coordinator: Mark and confirm participant attendance for shortlisted candidates.'
                  : 'Faculty Attendance Register (Read-Only): Attendance marked by the assigned Faculty Event Coordinator.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="btn btn-secondary px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs active:scale-98"
                title="Print or export official attendance register"
              >
                <IconDownload size={14} className="text-blue-600 dark:text-blue-400" />
                <span>Export Register</span>
              </button>
              <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shadow-2xs shrink-0">
                {attendance.length} Shortlisted Participants
              </span>
            </div>
          </div>

          <div className="table-container border border-border-default rounded-2xl overflow-hidden max-h-[550px]">
            <table className="table-enterprise w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border-default text-slate-500 uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Participant</th>
                  <th className="py-3 px-4">Class</th>
                  <th className="py-3 px-4">Team</th>
                  <th className="py-3 px-4">Attendance Status</th>
                  {isCoordinator && <th className="py-3 px-4 text-right">Mark Attendance</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default font-sans">
                {attendance.length === 0 ? (
                  <tr>
                    <td colSpan={isCoordinator ? 5 : 4} className="py-8 text-center text-slate-400">
                      No participants shortlisted yet.
                    </td>
                  </tr>
                ) : (
                  attendance.map(a => (
                    <tr key={a.student_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 dark:text-white block">{a.name}</span>
                        <span className="text-slate-400 dark:text-slate-500 font-mono text-[11px]">{a.usn}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-medium">
                        {a.department} · Sem {a.semester} ({a.section})
                      </td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-mono">
                        {a.team_id ? `Team #${a.team_id}` : 'Individual'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-2xs ${
                          a.status === 'PRESENT'
                            ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : a.status === 'ABSENT'
                              ? 'bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                              : 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                        }`}>
                          {a.status}
                        </span>
                      </td>
                      {isCoordinator && (
                        <td className="py-3 px-4 text-right space-x-1.5">
                          <button
                            onClick={() => handleMarkAttendance(a.student_id, 'PRESENT')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition shadow-2xs active:scale-98 ${
                              a.status === 'PRESENT'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 dark:hover:text-emerald-300'
                            }`}
                          >
                            Present
                          </button>
                          <button
                            onClick={() => handleMarkAttendance(a.student_id, 'ABSENT')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition shadow-2xs active:scale-98 ${
                              a.status === 'ABSENT'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-700 dark:hover:text-rose-300'
                            }`}
                          >
                            Absent
                          </button>
                          <button
                            onClick={() => handleMarkAttendance(a.student_id, 'REVIEW')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition shadow-2xs active:scale-98 ${
                              a.status === 'REVIEW'
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-700 dark:hover:text-indigo-300'
                            }`}
                          >
                            Review
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: WINNERS */}
      {activeTab === 'winners' && (isFaculty || isPresidentOrVp) && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-border-default pb-3">
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 flex items-center justify-center shrink-0">
                  <IconAward size={16} />
                </span>
                <span>Event Winners &amp; Podium Summary</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">President and Vice President record winners across arbitrary numbered positions.</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Record Winner Form (Faculty Coordinator or Student Leadership) */}
            {(isFaculty || isPresidentOrVp) && (
              <div className="glass-card p-6 rounded-3xl border border-border-default space-y-4 bg-white dark:bg-[#0E1017] shadow-sm">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <IconSparkles size={16} className="text-blue-600 dark:text-purple-400" />
                  <span>Record Event Winner</span>
                </h3>
                <form onSubmit={handleAddWinner} className="space-y-3.5 text-xs">
                  <div>
                    <label className="label">Podium Position (1, 2, 3...) *</label>
                    <input
                      className="input font-semibold"
                      type="number"
                      min={1}
                      value={winnerForm.position}
                      onChange={e => setWinnerForm({ ...winnerForm, position: +e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="label">Winner Category *</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setWinnerForm({ ...winnerForm, recipient_type: 'team', student_user_id: '' })}
                        className={`py-2 px-3 rounded-xl text-xs font-semibold border transition ${
                          winnerForm.recipient_type === 'team'
                            ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-700 dark:text-blue-300'
                            : 'bg-white dark:bg-slate-900 border-border-default text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        Team
                      </button>
                      <button
                        type="button"
                        onClick={() => setWinnerForm({ ...winnerForm, recipient_type: 'individual', team_id: '' })}
                        className={`py-2 px-3 rounded-xl text-xs font-semibold border transition ${
                          winnerForm.recipient_type === 'individual'
                            ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-700 dark:text-blue-300'
                            : 'bg-white dark:bg-slate-900 border-border-default text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        Individual
                      </button>
                    </div>
                  </div>

                  {winnerForm.recipient_type === 'team' ? (
                    <div>
                      <label className="label">Select Winner Team *</label>
                      <select
                        className="input font-medium text-xs py-2.5 rounded-xl w-full"
                        value={winnerForm.team_id}
                        onChange={e => setWinnerForm({ ...winnerForm, team_id: e.target.value })}
                        required
                      >
                        <option value="">-- Choose winning team ({(participants.teams || []).length} registered) --</option>
                        {(participants.teams || []).map((t: any) => (
                          <option key={t.id} value={t.id}>
                            {t.team_name} (Leader: {t.leader_name} · {t.leader_usn})
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="label">Select Winner Individual *</label>
                      <select
                        className="input font-medium text-xs py-2.5 rounded-xl w-full"
                        value={winnerForm.student_user_id}
                        onChange={e => setWinnerForm({ ...winnerForm, student_user_id: e.target.value })}
                        required
                      >
                        <option value="">-- Choose winning contestant ({(participants.individuals || []).length} registered) --</option>
                        {(participants.individuals || []).map((s: any) => (
                          <option key={s.student_id || s.id} value={s.student_id || s.id}>
                            {s.name} ({s.usn}) · {s.department}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="label">Medal / Recognition Title *</label>
                    <input
                      className="input"
                      placeholder="e.g. 1st Place / Gold Medal / Best Innovation"
                      value={winnerForm.achievement}
                      onChange={e => setWinnerForm({ ...winnerForm, achievement: e.target.value })}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-2xs active:scale-98 transition"
                  >
                    <IconAward size={15} />
                    <span>Announce &amp; Record Winner</span>
                  </button>
                </form>
              </div>
            )}

            {/* Winners Table */}
            <div className={`glass-card p-6 rounded-3xl border border-border-default space-y-4 bg-white dark:bg-[#0E1017] shadow-sm ${!(isFaculty || isPresidentOrVp) ? 'col-span-full' : 'md:col-span-2'}`}>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center justify-between">
                <span>Confirmed Podium Winners</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 shadow-2xs">
                  {winners.length} Recorded
                </span>
              </h3>
              <div className="table-container border border-border-default rounded-2xl overflow-hidden">
                <table className="table-enterprise w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border-default text-slate-500 uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Position</th>
                      <th className="py-3 px-4">Award / Title</th>
                      <th className="py-3 px-4">Recipient</th>
                      {(isFaculty || isPresidentOrVp) && <th className="py-3 px-4 text-right">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-default font-sans">
                    {winners.map(w => (
                      <tr key={w.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-extrabold shadow-2xs inline-block ${
                            w.position === 1
                              ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                              : w.position === 2
                                ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700'
                                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                          }`}>
                            {w.position === 1 ? '🥇 1st Place' : w.position === 2 ? '🥈 2nd Place' : w.position === 3 ? '🥉 3rd Place' : `Rank #${w.position}`}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{w.achievement || 'Winner'}</td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-medium">
                          {w.team ? (
                            <div>
                              <span className="font-bold text-slate-900 dark:text-white">Team: {w.team.team_name}</span>
                              <span className="block text-[11px] text-slate-500 font-mono">Leader: {w.team.leader_name} ({w.team.leader_usn})</span>
                              {w.team.members?.length > 0 && (
                                <span className="block text-[10px] text-slate-400">
                                  Members: {w.team.members.map((m: any) => `${m.name} (${m.usn})`).join(', ')}
                                </span>
                              )}
                            </div>
                          ) : w.student ? (
                            <div>
                              <span className="font-bold text-slate-900 dark:text-white">{w.student.name}</span>
                              <span className="block text-[11px] text-slate-500 font-mono">{w.student.usn} · {w.student.department}</span>
                            </div>
                          ) : w.student_user_id ? (
                            `Student User #${w.student_user_id}`
                          ) : w.team_id ? (
                            `Team #${w.team_id}`
                          ) : (
                            'Podium Recipient'
                          )}
                        </td>
                        {(isFaculty || isPresidentOrVp) && (
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteWinner(w.id)}
                              className="btn btn-outline px-2.5 py-1 text-xs text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 hover:bg-rose-600 hover:text-white transition"
                            >
                              Remove
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                    {winners.length === 0 && (
                      <tr>
                        <td colSpan={(isFaculty || isPresidentOrVp) ? 4 : 3} className="py-8 text-center text-slate-400">
                          No winners recorded for this event yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: LEADERSHIP (FACULTY COORDINATOR) */}
      {activeTab === 'leadership' && isFaculty && (
        <div className="card space-y-6 max-w-2xl mx-auto">
          <div className="border-b pb-3">
            <h2 className="text-lg font-bold text-slate-900">Appoint Student Event Leadership</h2>
            <p className="text-xs text-slate-500">
              Faculty Coordinators appoint the Student Leadership Committee.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-blue-800">
              <span>🛡️</span> Strict Shortlisting Governance Rule
            </div>
            <p>
              Shortlisting of teams and individual registrants is <strong>strictly delegated</strong> to the appointed President, Vice President, and up to 2 Shortlisting Volunteers. Faculty coordinators <em>cannot</em> shortlist teams.
            </p>
          </div>

          {isEnded ? (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 font-medium text-center space-y-1">
              <strong className="block font-bold">Event Concluded · Leadership Appointments Closed</strong>
              <span>This event has ended. Leadership committee appointments cannot be added or modified for ended events.</span>
            </div>
          ) : (
            <form onSubmit={handleAppointLeadership} className="space-y-4">
              <div>
                <label className="label">Select Registered Volunteer Applicant *</label>
                {volunteers.length === 0 ? (
                  <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-xs space-y-1">
                    <div className="font-semibold flex items-center gap-1">
                      <span>ℹ️</span> No registered volunteer applicants found.
                    </div>
                    <p>
                      Per institutional governance rules, manual typing of student IDs is strictly disallowed. Students must first apply as volunteers for this event before they can be selected and appointed to the Leadership Committee.
                    </p>
                  </div>
                ) : (
                  <select
                    className="input font-medium"
                    value={leadStudentId}
                    onChange={e => setLeadStudentId(e.target.value)}
                    required
                  >
                    <option value="">-- Choose from Registered Volunteers ({volunteers.length} Available) --</option>
                    {volunteers.map(v => (
                      <option key={v.id || v.student_id} value={v.student_id}>
                        {v.name} ({v.usn}) — {v.department} {v.preferred_area ? `· Pref: ${v.preferred_area}` : ''} [{v.status}]
                      </option>
                    ))}
                  </select>
                )}
                <span className="text-[11px] text-slate-500 mt-1 block">
                  🔒 Strict Governance: Manual typing is disabled. Leaders are selected strictly from the verified registered volunteer applicants roster.
                </span>
              </div>
              <div>
                <label className="label">Leadership Position *</label>
                <select
                  className="input"
                  value={leadRole}
                  onChange={e => setLeadRole(e.target.value as any)}
                >
                  <option value="PRESIDENT">President (Student Head — Full Shortlisting Authority)</option>
                  <option value="VICE_PRESIDENT">Vice President (Full Shortlisting Authority)</option>
                  <option value="SHORTLISTER_VOLUNTEER">Shortlisting Volunteer (Max 2 — Authorized to Shortlist)</option>
                  <option value="VOLUNTEER_COORDINATOR">Student Volunteer Coordinator</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={!leadStudentId || volunteers.length === 0}
                className="btn-primary w-full text-xs font-semibold py-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm Leadership Appointment
              </button>
            </form>
          )}

          {/* Current Leadership Roster */}
          <div className="pt-4 border-t space-y-2">
            <h3 className="font-bold text-xs uppercase text-slate-500">Current Appointed Leaders</h3>
            <div className="space-y-2">
              {leadership.map(l => (
                <div key={l.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border text-xs">
                  <div>
                    <span className="font-bold text-slate-800">{l.name}</span>
                    <span className="text-slate-400 font-mono block">{l.usn} · {l.department}</span>
                  </div>
                  <span className="badge badge-vvce text-xs font-semibold">{l.role}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB: PDF REPORTS EXPORT (PHASE 16) */}
      {activeTab === 'reports' && isFaculty && (
        <div className="card space-y-5 max-w-3xl mx-auto">
          <div className="border-b pb-3">
            <h2 className="text-lg font-bold text-slate-900">Institutional A4 PDF Reports Export</h2>
            <p className="text-xs text-slate-500">
              Download formal college-branded reports. Generated dynamically using ReportLab with exact timestamps and access controls.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {reportsList.map(rep => (
              <div key={rep.type} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800">{rep.name}</span>
                <button
                  type="button"
                  onClick={() => api.download(`/reports/${rep.type}?event_id=${eventId}`, `${rep.type}_event_${eventId}.pdf`)}
                  className="btn-outline btn-sm text-xs"
                >
                  📥 Export PDF
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Event Dossier Printable & Shareable Modal */}
      {showPdfDossier && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#0E1017] w-full max-w-4xl max-h-[92vh] rounded-3xl shadow-2xl flex flex-col border border-border-default overflow-hidden">
            {/* Modal Controls (Hidden in Print) */}
            <div className="no-print p-4 border-b border-border-default bg-slate-50 dark:bg-[#121520] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold">
                  <IconFileText size={18} />
                </span>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Institutional Event Dossier</h3>
                  <p className="text-[11px] text-slate-500">Comprehensive official extract ready for digital PDF export, printing, or sharing</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="btn btn-primary px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs active:scale-98"
                >
                  <IconDownload size={14} />
                  <span>Print / Save as PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPdfDossier(false)}
                  className="btn btn-outline px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  <IconX size={16} />
                </button>
              </div>
            </div>

            {/* Scrollable Printable Document Container */}
            <div className="p-6 sm:p-8 overflow-y-auto font-sans text-slate-800 dark:text-slate-200" id="printable-event-dossier">
              {/* Institutional College Header */}
              <div className="border-b-2 border-slate-900 dark:border-white pb-4 mb-6 text-center">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400 block mb-1">
                  Vidyavardhaka Sangha®, Mysuru
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  VIDYAVARDHAKA COLLEGE OF ENGINEERING
                </h1>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                  Autonomous Institute, Affiliated to VTU, Belagavi · Approved by AICTE, New Delhi · Accredited by NAAC with &apos;A&apos; Grade
                </p>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                  P.B. No. 206, Gokulam 3rd Stage, Mysuru - 570 002, Karnataka, India
                </p>
                <div className="mt-3 inline-block px-4 py-1 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold uppercase tracking-wider">
                  OFFICIAL CAMPUS EVENT DOSSIER &amp; COMPREHENSIVE RECORD
                </div>
              </div>

              {/* Event Metadata Overview */}
              <div className="mb-6 space-y-3">
                <h2 className="text-base font-bold text-slate-900 dark:text-white border-b border-border-default pb-1 flex items-center justify-between">
                  <span>1. Event Specifications</span>
                  <span className="text-xs font-mono font-semibold text-slate-500">ID: #EV-{ev.id}</span>
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border-default">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Event Title</span>
                    <span className="font-bold text-slate-900 dark:text-white mt-0.5 block">{ev.name}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border-default">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Category</span>
                    <span className="font-bold text-slate-900 dark:text-white mt-0.5 block">{ev.category || 'General'}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border-default">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Status</span>
                    <span className="font-bold text-slate-900 dark:text-white mt-0.5 block">{ev.status}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border-default">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Venue / Location</span>
                    <span className="font-bold text-slate-900 dark:text-white mt-0.5 block">{ev.venue || 'Campus Auditorium'}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border-default">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Schedule Date</span>
                    <span className="font-bold text-slate-900 dark:text-white mt-0.5 block">{new Date(ev.start_at).toLocaleDateString()}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border-default">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Registration Fee</span>
                    <span className="font-bold text-slate-900 dark:text-white mt-0.5 block">{ev.registration_fee > 0 ? `₹${ev.registration_fee}` : 'Free Entry'}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border-default">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Participation Format</span>
                    <span className="font-bold text-slate-900 dark:text-white mt-0.5 block">{ev.team_enabled ? `Team (${ev.min_team_size}-${ev.max_team_size} members)` : 'Individual'}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border-default">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Branch Eligibility</span>
                    <span className="font-bold text-slate-900 dark:text-white mt-0.5 block">{ev.eligible_departments?.length ? ev.eligible_departments.join(', ') : 'All Branches'}</span>
                  </div>
                </div>
                {ev.description && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border-default">
                    <b>Overview:</b> {ev.description}
                  </p>
                )}
              </div>

              {/* Governance & Leadership Committee */}
              <div className="mb-6 space-y-3">
                <h2 className="text-base font-bold text-slate-900 dark:text-white border-b border-border-default pb-1">
                  2. Institutional Governance &amp; Student Leadership Committee
                </h2>
                <div className="border border-border-default rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                      <tr>
                        <th className="py-2 px-3">Role / Designation</th>
                        <th className="py-2 px-3">Official Appointee</th>
                        <th className="py-2 px-3">USN / ID</th>
                        <th className="py-2 px-3">Department</th>
                        <th className="py-2 px-3">Official Email</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-default">
                      {/* Faculty Coordinator */}
                      {ev.coordinators?.map((c: any) => (
                        <tr key={c.id || c.name}>
                          <td className="py-2 px-3 font-bold text-blue-700 dark:text-blue-300">Faculty Coordinator</td>
                          <td className="py-2 px-3 font-semibold">{c.name}</td>
                          <td className="py-2 px-3 font-mono">-</td>
                          <td className="py-2 px-3">{c.department || 'Faculty'}</td>
                          <td className="py-2 px-3 font-mono text-[11px]">{c.email || '-'}</td>
                        </tr>
                      ))}
                      {/* Student Leadership */}
                      {leadership.map((l: any) => (
                        <tr key={l.id}>
                          <td className="py-2 px-3 font-bold text-purple-700 dark:text-purple-300">{l.role?.replace('_', ' ')}</td>
                          <td className="py-2 px-3 font-semibold">{l.name}</td>
                          <td className="py-2 px-3 font-mono">{l.usn}</td>
                          <td className="py-2 px-3">{l.department}</td>
                          <td className="py-2 px-3 font-mono text-[11px]">{l.email}</td>
                        </tr>
                      ))}
                      {leadership.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-3 text-center text-slate-400">No student leadership designated yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Executive Summary Metrics */}
              <div className="mb-6 space-y-3">
                <h2 className="text-base font-bold text-slate-900 dark:text-white border-b border-border-default pb-1">
                  3. Executive Participation &amp; Operation Metrics
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Registered Teams</span>
                    <span className="text-lg font-black text-blue-700 dark:text-blue-300 mt-0.5 block">{participants?.teams?.length || 0}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Shortlisted Finalists</span>
                    <span className="text-lg font-black text-purple-700 dark:text-purple-300 mt-0.5 block">{shortlistedTeams.length}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Volunteer Force</span>
                    <span className="text-lg font-black text-emerald-700 dark:text-emerald-300 mt-0.5 block">{volunteers.length}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Podium Winners Declared</span>
                    <span className="text-lg font-black text-amber-700 dark:text-amber-300 mt-0.5 block">{winners.length}</span>
                  </div>
                </div>
              </div>

              {/* Registered & Shortlisted Teams Roster */}
              <div className="mb-6 space-y-3">
                <h2 className="text-base font-bold text-slate-900 dark:text-white border-b border-border-default pb-1 flex items-center justify-between">
                  <span>4. Registered &amp; Shortlisted Teams Roster</span>
                  <span className="text-xs font-mono font-medium text-slate-500">{participants?.teams?.length || 0} Total Entries</span>
                </h2>
                <div className="border border-border-default rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                      <tr>
                        <th className="py-2 px-3">Team Name</th>
                        <th className="py-2 px-3">Leader</th>
                        <th className="py-2 px-3">Team Members</th>
                        <th className="py-2 px-3">Status</th>
                        <th className="py-2 px-3">Fee Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-default">
                      {(participants?.teams || []).map((t: any) => (
                        <tr key={t.id}>
                          <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">{t.team_name}</td>
                          <td className="py-2 px-3 font-medium">{t.leader_name} ({t.leader_usn})</td>
                          <td className="py-2 px-3 text-[11px] text-slate-600 dark:text-slate-400">
                            {t.members?.map((m: any) => `${m.name} (${m.usn})`).join(', ') || '-'}
                          </td>
                          <td className="py-2 px-3 font-semibold">
                            <span className={t.status === 'SHORTLISTED' ? 'text-emerald-600 font-bold' : ''}>{t.status}</span>
                          </td>
                          <td className="py-2 px-3 font-mono">{t.payment_status}</td>
                        </tr>
                      ))}
                      {(participants?.teams || []).length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-3 text-center text-slate-400">No teams registered yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Student Volunteer Squad */}
              <div className="mb-6 space-y-3">
                <h2 className="text-base font-bold text-slate-900 dark:text-white border-b border-border-default pb-1 flex items-center justify-between">
                  <span>5. Student Volunteer Force &amp; Duty Allocations</span>
                  <span className="text-xs font-mono font-medium text-slate-500">{volunteers.length} Active Appointees</span>
                </h2>
                <div className="border border-border-default rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                      <tr>
                        <th className="py-2 px-3">Volunteer Name</th>
                        <th className="py-2 px-3">USN</th>
                        <th className="py-2 px-3">Department</th>
                        <th className="py-2 px-3">Assigned Responsibility</th>
                        <th className="py-2 px-3">Area / Venue Allocation</th>
                        <th className="py-2 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-default">
                      {volunteers.map((v: any) => (
                        <tr key={v.id}>
                          <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">{v.name}</td>
                          <td className="py-2 px-3 font-mono">{v.usn}</td>
                          <td className="py-2 px-3">{v.department}</td>
                          <td className="py-2 px-3 font-medium">{v.responsibility || 'General Support'}</td>
                          <td className="py-2 px-3">{v.allocation || 'Main Stage / Campus'}</td>
                          <td className="py-2 px-3 font-semibold">{v.status}</td>
                        </tr>
                      ))}
                      {volunteers.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-3 text-center text-slate-400">No volunteers recorded for this event.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Official Podium Winners & Honors */}
              <div className="mb-6 space-y-3">
                <h2 className="text-base font-bold text-slate-900 dark:text-white border-b border-border-default pb-1 flex items-center justify-between">
                  <span>6. Official Podium Winners &amp; Honors</span>
                  <span className="text-xs font-mono font-medium text-slate-500">{winners.length} Confirmed Honors</span>
                </h2>
                <div className="border border-border-default rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                      <tr>
                        <th className="py-2 px-3">Position</th>
                        <th className="py-2 px-3">Award / Recognition Title</th>
                        <th className="py-2 px-3">Honored Recipient (Team / Student)</th>
                        <th className="py-2 px-3">USN / Members</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-default">
                      {winners.map((w: any) => (
                        <tr key={w.id}>
                          <td className="py-2 px-3 font-black text-slate-900 dark:text-white">
                            {w.position === 1 ? '🥇 1st Place' : w.position === 2 ? '🥈 2nd Place' : w.position === 3 ? '🥉 3rd Place' : `Rank #${w.position}`}
                          </td>
                          <td className="py-2 px-3 font-bold text-blue-700 dark:text-blue-300">{w.achievement || 'Podium Honor'}</td>
                          <td className="py-2 px-3 font-semibold">
                            {w.team ? w.team.team_name : w.student ? w.student.name : w.student_user_id ? `Student #${w.student_user_id}` : `Team #${w.team_id}`}
                          </td>
                          <td className="py-2 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                            {w.team
                              ? `Leader: ${w.team.leader_usn}${w.team.members?.length ? `, Members: ${w.team.members.map((m: any) => m.usn).join(', ')}` : ''}`
                              : w.student ? `${w.student.usn} (${w.student.department})` : '-'}
                          </td>
                        </tr>
                      ))}
                      {winners.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-3 text-center text-slate-400">Podium evaluation in progress; winners to be announced upon event conclusion.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Institutional Sign-off & Seal */}
              <div className="pt-6 border-t-2 border-slate-900 dark:border-white space-y-6">
                <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span>Generated: {new Date().toLocaleString()}</span>
                  <span>System Verification Hash: VVCE-EV{ev.id}-{Date.now().toString(36).toUpperCase()}</span>
                </div>
                <div className="grid grid-cols-3 gap-6 pt-8 text-center text-xs">
                  <div>
                    <div className="border-t border-slate-400 pt-2 font-bold text-slate-900 dark:text-white">
                      Faculty Event Coordinator
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Signature &amp; Date</span>
                  </div>
                  <div>
                    <div className="border-t border-slate-400 pt-2 font-bold text-slate-900 dark:text-white">
                      Head of Department (HOD)
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Signature &amp; Department Seal</span>
                  </div>
                  <div>
                    <div className="border-t border-slate-400 pt-2 font-bold text-slate-900 dark:text-white">
                      Principal / Dean of Student Affairs
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Institutional Endorsement</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Volunteer Allocation Modal */}
      {allocatingApp && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="card w-full max-w-md bg-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900">Allocate Volunteer Responsibility</h3>
              <button onClick={() => setAllocatingApp(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleAllocateVolunteer} className="space-y-3.5 text-xs">
              <p className="text-slate-600">Volunteer: <b>{allocatingApp.name}</b> ({allocatingApp.usn})</p>
              <div>
                <label className="label">Assigned Responsibility *</label>
                <input
                  className="input"
                  placeholder="e.g. Stage Logistics Coordinator / Desk Manager"
                  value={allocResp}
                  onChange={e => setAllocResp(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label">Allocation Location / Area *</label>
                <input
                  className="input"
                  placeholder="e.g. Amphitheatre Main Stage / Ground Floor Registration"
                  value={allocArea}
                  onChange={e => setAllocArea(e.target.value)}
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setAllocatingApp(null)} className="btn-secondary text-xs">Cancel</button>
                <button type="submit" className="btn-primary text-xs">Save Allocation</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Event Deletion Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="card-antigravity max-w-md w-full p-6 space-y-4 rounded-3xl bg-white dark:bg-[#0E1017] border border-border-default shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 flex items-center justify-center mx-auto">
              <IconTrash size={24} />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Delete Event?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Are you sure you want to permanently delete <b className="text-slate-800 dark:text-slate-200">"{ev?.name}"</b>?
                All registrations, team data, volunteer assignments, attendance records, and leadership appointments will be permanently removed.
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deletingEvent}
                className="btn btn-secondary flex-1 py-2 text-xs font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteEvent}
                disabled={deletingEvent}
                className="btn bg-rose-600 hover:bg-rose-700 text-white flex-1 py-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 shadow-sm active:scale-98"
              >
                {deletingEvent ? <span>Deleting...</span> : <span>Delete Event</span>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Multi-Form Preview Console (Preview all 3 forms after created) */}
      <MultiFormPreviewModal
        isOpen={showMultiFormPreview}
        onClose={() => setShowMultiFormPreview(false)}
        eventId={eventId}
        eventName={ev?.name}
        eventDescription={ev?.description}
        eventCategory={ev?.category}
        minTeamSize={ev?.min_team_size || 2}
        maxTeamSize={ev?.max_team_size || 4}
        pptTemplateUrl={ev?.ppt_template_url}
        requireIdProof={Boolean(ev?.require_id_proof)}
        ideaPptRequired={Boolean(ev?.idea_ppt_required)}
        customFormTitle={form?.title}
        customFormDescription={form?.description}
        customQuestions={form?.questions || []}
        publishedVersion={form?.published_version || 0}
        initialTab="custom"
      />
    </div>
  )
}
