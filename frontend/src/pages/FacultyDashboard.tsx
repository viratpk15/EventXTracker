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
  IconArchive,
  IconX,
  IconCalendar,
  IconMessageSquare,
  IconQrCode
} from '../components/ui/Icons'
import ImageFileUpload from '../components/ui/ImageFileUpload'

export type FacultyTab =
  | 'normal_dept'     // 1. Normal View: Department Dashboard (Profile + Dept Students Participating & Volunteering list + Download)
  | 'create_event'    // 2. Special Menu: Create College Event
  | 'active_events'   // 2. Special Menu: Current Coordinated Events
  | 'history_events'  // 2. Special Menu: Coordinated Events History & Archives
  | 'ct_students'     // 3. Class Teacher Section: Assigned Section Students Roster
  | 'ct_academics'    // 3. Class Teacher Section: Academic Verification Queue
  | 'security'        // Profile Customization & Password Settings

export default function FacultyDashboard({ initialTab }: { initialTab?: FacultyTab }) {
  const location = useLocation()

  const determineInitialTab = (): FacultyTab => {
    if (initialTab) return initialTab
    const path = location.pathname.toLowerCase()
    if (path.includes('create')) return 'create_event'
    if (path.includes('active')) return 'active_events'
    if (path.includes('history')) return 'history_events'
    if (path.includes('class-teacher/students') || path.includes('/students')) return 'ct_students'
    if (path.includes('class-teacher/reviews') || path.includes('academic') || path.includes('review')) return 'ct_academics'
    if (path.includes('profile') || path.includes('security')) return 'security'
    return 'normal_dept'
  }

  const [activeTab, setActiveTab] = useState<FacultyTab>(determineInitialTab)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Faculty Profile Customization & Password
  const [facultyProfileForm, setFacultyProfileForm] = useState({
    avatar_url: '',
    quote: '',
  })
  const [savingFacultyProfile, setSavingFacultyProfile] = useState(false)
  const [facultyOldPassword, setFacultyOldPassword] = useState('')
  const [facultyNewPassword, setFacultyNewPassword] = useState('')

  // 1. Normal View: Department Participation State
  const [deptData, setDeptData] = useState<any>(null)
  const [activityFilter, setActivityFilter] = useState<'all' | 'participants' | 'volunteers'>('all')
  const [deptSearch, setDeptSearch] = useState('')

  // 2. Special Menu: Coordinated Events State
  const [coordinatedEvents, setCoordinatedEvents] = useState<any>(null)
  const [eventToDelete, setEventToDelete] = useState<any>(null)
  const [deletingEvent, setDeletingEvent] = useState(false)

  const handleConfirmDeleteEvent = async () => {
    if (!eventToDelete) return
    setDeletingEvent(true)
    setError('')
    try {
      await api.delete(`/events/${eventToDelete.id}`)
      setSuccess(`Event "${eventToDelete.name}" deleted successfully.`)
      setEventToDelete(null)
      await loadData()
    } catch (err: any) {
      setError(err.message || 'Failed to delete event')
    } finally {
      setDeletingEvent(false)
    }
  }

  // 3. Class Teacher Section State
  const [me, setMe] = useState<any>(null)
  const [ctClasses, setCtClasses] = useState<any[]>([])
  const [ctStudents, setCtStudents] = useState<any[]>([])
  const [ctReviews, setCtReviews] = useState<any>(null)
  const [ctStudentSearch, setCtStudentSearch] = useState('')

  // Review Modal State
  const [reviewRecord, setReviewRecord] = useState<any>(null)
  const [reviewType, setReviewType] = useState<'internship' | 'external'>('internship')
  const [reviewStatus, setReviewStatus] = useState<'VERIFIED' | 'REJECTED' | 'ON_HOLD'>('VERIFIED')
  const [evidenceInspected, setEvidenceInspected] = useState(false)
  const [reviewNotes, setReviewNotes] = useState('')

  // Initial Event Form Template
  const initialEventForm = {
    name: '',
    description: '',
    category: 'Technical',
    venue: '',
    start_at: '',
    end_at: '',
    timezone: 'Asia/Kolkata',
    reg_open_at: '',
    reg_close_at: '',
    formChoice: 'team_default' as 'team_default' | 'individual_default' | 'custom',
    customEntryType: 'team' as 'team' | 'individual',
    volunteer_enabled: true,
    min_team_size: 2,
    max_team_size: 4,
    eligible_departments: [] as string[],
    eligible_semesters: [] as number[],
    selection_mode: 'MANUAL',
    require_same_department: false,
    registration_fee: 0,
    upi_id: '',
    whatsapp_group_url: '',
    payment_qr_url: '',
    payment_instructions: '',
    require_id_proof: false,
    idea_ppt_required: true,
    ppt_template_url: '',
    poster_url: '',
  }

  // Create Event Form State
  const [eventForm, setEventForm] = useState(initialEventForm)
  const [createdEventInfo, setCreatedEventInfo] = useState<any>(null)
  const [creatingEvent, setCreatingEvent] = useState(false)

  function resetCreateEventForm() {
    setCreatedEventInfo(null)
    setEventForm({ ...initialEventForm })
    setError('')
    setSuccess('')
  }

  // Custom Form Builder Questions State (Option 3)
  const [customQuestions, setCustomQuestions] = useState<any[]>([
    { id: 'q_1', type: 'short_text', title: 'Domain Track / Focus Area', description: 'Specify your technology track', required: true, placeholder: 'e.g. AI / Web / IoT' },
    { id: 'q_2', type: 'long_text', title: 'Problem Statement & Proposed Solution', description: 'Detailed summary of the submission', required: true, placeholder: 'Explain the challenge and your approach' },
    { id: 'q_3', type: 'file', title: 'Upload Presentation Deck (PPT/PDF)', description: 'Slide deck or architecture document (max 15MB)', required: true, file_types: ['pdf', 'pptx', 'ppt'], max_file_size_mb: 15 },
  ])
  const [newQuestionType, setNewQuestionType] = useState('short_text')
  const [previewCustomForm, setPreviewCustomForm] = useState(false)

  useEffect(() => {
    setActiveTab(determineInitialTab())
  }, [location.pathname])

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    setError('')
    try {
      const [dept, profile, coord, classes, students, reviews] = await Promise.all([
        api.get('/faculty/department-participation'),
        api.get('/auth/me'),
        api.get('/faculty/coordinated-events'),
        api.get('/faculty/class-teacher/assigned-class').catch(() => []),
        api.get('/faculty/class-teacher/students').catch(() => []),
        api.get('/faculty/class-teacher/reviews').catch(() => ({ internships: [], external_events: [], total_pending: 0 })),
      ])
      setDeptData(dept)
      setMe(profile)
      setCoordinatedEvents(coord)
      setCtClasses(classes)
      setCtStudents(students)
      setCtReviews(reviews)
      if (profile?.profile) {
        setFacultyProfileForm({
          avatar_url: profile.profile.avatar_url || '',
          quote: profile.profile.quote || '',
        })
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load faculty portal data')
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveFacultyProfile(e: React.FormEvent) {
    e.preventDefault()
    setSavingFacultyProfile(true)
    setError(''); setSuccess('')
    try {
      await api.patch('/auth/profile', {
        avatar_url: facultyProfileForm.avatar_url,
        quote: facultyProfileForm.quote,
      })
      setSuccess('Faculty profile customization saved successfully!')
      const updated = await api.get('/auth/me')
      setMe(updated)
    } catch (err: any) {
      setError(err.message || 'Failed to update profile')
    } finally {
      setSavingFacultyProfile(false)
    }
  }

  async function handleFacultyPasswordChange(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setSuccess('')
    try {
      await api.post('/auth/change-password', {
        old_password: facultyOldPassword,
        new_password: facultyNewPassword,
      })
      setSuccess('Password updated successfully')
      setFacultyOldPassword('')
      setFacultyNewPassword('')
    } catch (err: any) {
      setError(err.message || 'Failed to update password')
    }
  }

  // --- Handlers for Custom Form Builder ---
  function addCustomQuestion(type: string) {
    const id = `q_${Date.now()}`
    const isChoice = ['dropdown', 'single_choice', 'multiple_choice'].includes(type)
    const isSection = type === 'section'
    const isInstruction = type === 'instruction'
    const isFile = type === 'file'

    setCustomQuestions(prev => [
      ...prev,
      {
        id,
        type,
        title: isSection ? 'New Section Heading' : isInstruction ? 'Important Instructions' : 'Untitled Question',
        description: '',
        required: !isSection && !isInstruction,
        placeholder: '',
        options: isChoice ? ['Option 1', 'Option 2', 'Option 3'] : undefined,
        file_types: isFile ? ['pdf', 'pptx', 'ppt', 'jpg', 'png'] : undefined,
        max_file_size_mb: isFile ? 15 : undefined,
      }
    ])
  }

  function updateCustomQuestion(idx: number, patch: Partial<any>) {
    setCustomQuestions(prev => {
      const copy = [...prev]
      copy[idx] = { ...copy[idx], ...patch }
      return copy
    })
  }

  function removeCustomQuestion(idx: number) {
    setCustomQuestions(prev => prev.filter((_, i) => i !== idx))
  }

  function moveCustomQuestion(idx: number, dir: -1 | 1) {
    setCustomQuestions(prev => {
      const target = idx + dir
      if (target < 0 || target >= prev.length) return prev
      const copy = [...prev]
      const temp = copy[idx]
      copy[idx] = copy[target]
      copy[target] = temp
      return copy
    })
  }

  function duplicateCustomQuestion(idx: number) {
    setCustomQuestions(prev => {
      const q = prev[idx]
      const copy = [...prev]
      copy.splice(idx + 1, 0, {
        ...q,
        id: `q_${Date.now()}`,
        title: `${q.title} (Copy)`,
      })
      return copy
    })
  }

  // --- Handler for Create Event ---
  async function handleCreateEvent(e: React.FormEvent) {
    e.preventDefault()
    if (creatingEvent) return
    setError(''); setSuccess('')
    setCreatingEvent(true)

    try {
      const isTeam = eventForm.formChoice === 'team_default' || (eventForm.formChoice === 'custom' && eventForm.customEntryType === 'team')
      const isIndiv = eventForm.formChoice === 'individual_default' || (eventForm.formChoice === 'custom' && eventForm.customEntryType === 'individual')

      const payload: any = {
        name: eventForm.name.trim(),
        description: eventForm.description.trim() || null,
        category: eventForm.category,
        venue: eventForm.venue.trim() || null,
        start_at: new Date(eventForm.start_at).toISOString(),
        end_at: new Date(eventForm.end_at).toISOString(),
        timezone: eventForm.timezone,
        reg_open_at: eventForm.reg_open_at ? new Date(eventForm.reg_open_at).toISOString() : null,
        reg_close_at: eventForm.reg_close_at ? new Date(eventForm.reg_close_at).toISOString() : null,
        individual_enabled: isIndiv,
        team_enabled: isTeam,
        volunteer_enabled: eventForm.volunteer_enabled,
        min_team_size: isTeam ? eventForm.min_team_size : 1,
        max_team_size: isTeam ? eventForm.max_team_size : 1,
        eligible_departments: eventForm.eligible_departments.length > 0 ? eventForm.eligible_departments : null,
        eligible_semesters: eventForm.eligible_semesters.length > 0 ? eventForm.eligible_semesters : null,
        selection_mode: eventForm.selection_mode,
        require_same_department: isTeam ? eventForm.require_same_department : false,
        registration_fee: Number(eventForm.registration_fee) || 0,
        upi_id: eventForm.upi_id.trim() || null,
        whatsapp_group_url: eventForm.whatsapp_group_url.trim() || null,
        payment_qr_url: eventForm.payment_qr_url.trim() || null,
        payment_instructions: eventForm.payment_instructions.trim() || null,
        require_id_proof: eventForm.require_id_proof,
        idea_ppt_required: eventForm.idea_ppt_required,
        ppt_template_url: eventForm.ppt_template_url.trim() || null,
        poster_url: eventForm.poster_url.trim() || null,
        initial_form_template: eventForm.formChoice,
        custom_questions: eventForm.formChoice === 'custom' ? customQuestions : undefined,
      }
      const res = await api.post('/events', payload)
      setSuccess(`Event '${eventForm.name}' created and published live successfully! (ID: #${res.id})`)
      setCreatedEventInfo({
        id: res.id,
        name: eventForm.name,
        category: eventForm.category,
        venue: eventForm.venue,
        poster_url: eventForm.poster_url.trim() || null,
        start_at: eventForm.start_at,
        end_at: eventForm.end_at,
        form_id: res.form_id,
        form_choice: eventForm.formChoice,
        volunteer_enabled: eventForm.volunteer_enabled,
        min_team_size: isTeam ? eventForm.min_team_size : 1,
        max_team_size: isTeam ? eventForm.max_team_size : 1,
      })
      loadData()
    } catch (err: any) {
      setError(err.message || 'Failed to create event')
    } finally {
      setCreatingEvent(false)
    }
  }

  // --- Handler for Reviewing Student Academic Record ---
  async function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault()
    if (!reviewRecord) return
    setError(''); setSuccess('')

    try {
      const endpoint = reviewType === 'internship'
        ? `/internships/${reviewRecord.id}/review?status=${reviewStatus}&evidence_inspected=${evidenceInspected}&notes=${encodeURIComponent(reviewNotes)}`
        : `/external-events/${reviewRecord.id}/review?status=${reviewStatus}&evidence_inspected=${evidenceInspected}&notes=${encodeURIComponent(reviewNotes)}`

      await api.post(endpoint)
      setSuccess(`Academic submission marked as ${reviewStatus}`)
      setReviewRecord(null)
      loadData()
    } catch (err: any) {
      setError(err.message || 'Failed to submit academic review')
    }
  }

  // --- Download Department Roster CSV ---
  function handleDownloadDeptRoster() {
    const code = deptData?.faculty?.department_code || 'Department'
    api.download('/faculty/department-participation/export', `${code}_Event_Participation_and_Volunteering_Roster.csv`)
  }

  // --- Department Roster Filtering ---
  const allDeptRecords = [
    ...(deptData?.participants || []).map((p: any) => ({ ...p, recordType: 'PARTICIPANT' })),
    ...(deptData?.volunteers || []).map((v: any) => ({ ...v, recordType: 'VOLUNTEER' })),
  ]

  const filteredDeptRecords = allDeptRecords.filter(item => {
    if (activityFilter === 'participants' && item.recordType !== 'PARTICIPANT') return false
    if (activityFilter === 'volunteers' && item.recordType !== 'VOLUNTEER') return false
    if (deptSearch.trim()) {
      const q = deptSearch.toLowerCase()
      const matchName = item.name?.toLowerCase().includes(q)
      const matchUsn = item.usn?.toLowerCase().includes(q)
      const matchEvent = item.event_name?.toLowerCase().includes(q)
      if (!matchName && !matchUsn && !matchEvent) return false
    }
    return true
  })

  // --- Class Teacher Students Filtering ---
  const filteredCtStudents = ctStudents.filter(s => {
    if (!ctStudentSearch.trim()) return true
    const q = ctStudentSearch.toLowerCase()
    return s.full_name?.toLowerCase().includes(q) || s.usn?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q)
  })

  // Pending reviews
  const pendingInternships = (ctReviews?.internships || []).filter((i: any) => i.status === 'PENDING_REVIEW')
  const pendingExternal = (ctReviews?.external_events || []).filter((e: any) => e.status === 'PENDING_REVIEW')
  const totalPendingReviews = (pendingInternships.length + pendingExternal.length)

  // Identify active menu category
  const isSpecialMenu = ['create_event', 'active_events', 'history_events'].includes(activeTab)
  const isCtMenu = ['ct_students', 'ct_academics'].includes(activeTab)
  const isNormalMenu = activeTab === 'normal_dept'

  return (
    <div className="space-y-6">
      {/* Top Left Come Back Navigation when on sub-menus or child pages */}
      {!isNormalMenu && (
        <div className="flex items-center justify-between">
          <BackButton
            to="/faculty/dashboard"
            label="Come Back to Department Dashboard"
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


      {/* ========================================================================= */}
      {/* 1. NORMAL VIEW: DEPARTMENT & PROFILE DASHBOARD                            */}
      {/* ========================================================================= */}
      {isNormalMenu && (
        <div className="space-y-6">
          {/* Faculty Profile Card */}
          <div className="card-antigravity space-y-5 rounded-2xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                    {deptData?.faculty?.name || me?.profile?.full_name || 'Faculty Member'}
                  </h1>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-semibold">
                    ID: FAC-{deptData?.faculty?.id || me?.id || '—'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                  <span>{deptData?.faculty?.email || me?.email}</span>
                  <span className="inline-block w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                  <span>Vidyavardhaka College of Engineering</span>
                </p>
              </div>

              {/* Institutional Role & Class Teacher Badges */}
              <div className="flex flex-wrap items-center gap-2">
                {deptData?.faculty?.is_hod ? (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex items-center gap-1.5 shadow-sm">
                    <IconBuilding size={14} />
                    <span>Head of the Department (HOD)</span>
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5">
                    <IconUser size={14} />
                    <span>Faculty Teacher ({deptData?.faculty?.designation || 'Teacher'})</span>
                  </span>
                )}

                {deptData?.faculty?.is_class_teacher ? (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1.5 shadow-sm">
                    <IconGraduationCap size={14} />
                    <span>
                      Class Teacher: {deptData?.faculty?.class_teacher_assignments?.map((c: any) =>
                        `Sem ${c.semester} (${c.section}) [${c.academic_year}]`
                      ).join(', ')}
                    </span>
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                    Not Assigned as Class Teacher
                  </span>
                )}
              </div>
            </div>

            {/* Department Summary Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="stat-card">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Department
                </span>
                <span className="text-xl font-extrabold text-slate-900 dark:text-white block mt-0.5">
                  {deptData?.faculty?.department_code || 'CSE'}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 truncate block">
                  {deptData?.faculty?.department_name || 'Engineering'}
                </span>
              </div>

              <div className="stat-card">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Total Enrolled Students
                </span>
                <span className="text-xl font-extrabold text-slate-900 dark:text-white block mt-0.5">
                  {deptData?.total_dept_students || 0}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 block">In {deptData?.faculty?.department_code || 'Dept'}</span>
              </div>

              <div className="stat-card border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/10">
                <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider block">
                  Participating in Events
                </span>
                <span className="text-xl font-extrabold text-emerald-900 dark:text-emerald-200 block mt-0.5">
                  {deptData?.total_participants || 0}
                </span>
                <span className="text-xs text-emerald-700 dark:text-emerald-400 block">Active registrations</span>
              </div>

              <div className="stat-card border-sky-200 dark:border-sky-900/50 bg-sky-50/40 dark:bg-sky-950/10">
                <span className="text-[11px] font-bold text-sky-800 dark:text-sky-400 uppercase tracking-wider block">
                  Volunteering for Events
                </span>
                <span className="text-xl font-extrabold text-sky-900 dark:text-sky-200 block mt-0.5">
                  {deptData?.total_volunteers || 0}
                </span>
                <span className="text-xs text-sky-700 dark:text-sky-400 block">Active volunteer duties</span>
              </div>
            </div>
          </div>

          {/* Department Students Participating & Volunteering List with Download Button */}
          <div className="card space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <IconLayers size={18} className="text-teal-600 dark:text-purple-400" />
                  <span>{deptData?.faculty?.department_code || 'CSE'} Department Students Event Activity</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Official roster of students from {deptData?.faculty?.department_name || 'Department'} participating and volunteering across college events.
                </p>
              </div>

              {/* Download Option Button */}
              <button
                onClick={handleDownloadDeptRoster}
                className="btn btn-primary px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs active:scale-98 transition shrink-0"
              >
                <IconDownload size={14} />
                <span>Download Department Roster (CSV)</span>
              </button>
            </div>

            {/* Filters & Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 overflow-x-auto p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-semibold">
                <button
                  onClick={() => setActivityFilter('all')}
                  className={`px-3 py-1.5 rounded-md transition-all ${
                    activityFilter === 'all'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  All Activity ({allDeptRecords.length})
                </button>
                <button
                  onClick={() => setActivityFilter('participants')}
                  className={`px-3 py-1.5 rounded-md transition-all ${
                    activityFilter === 'participants'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Participants ({deptData?.participants?.length || 0})
                </button>
                <button
                  onClick={() => setActivityFilter('volunteers')}
                  className={`px-3 py-1.5 rounded-md transition-all ${
                    activityFilter === 'volunteers'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Volunteers ({deptData?.volunteers?.length || 0})
                </button>
              </div>

              <div className="relative w-full sm:w-64">
                <IconSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  className="input input-icon-left py-1.5 text-xs"
                  style={{ paddingLeft: '2.5rem' }}
                  placeholder="Search student, USN, or event..."
                  value={deptSearch}
                  onChange={e => setDeptSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Table */}
            {filteredDeptRecords.length === 0 ? (
              <div className="p-8 text-center text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-xs">
                No event participation or volunteering records found for {deptData?.faculty?.department_code || 'your'} department.
              </div>
            ) : (
              <div className="table-container max-h-[550px] overflow-y-auto">
                <table className="table-enterprise">
                  <thead>
                    <tr>
                      <th>Student Details</th>
                      <th>Class</th>
                      <th>Activity Type</th>
                      <th>Event Name & Category</th>
                      <th>Role / Details</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDeptRecords.map((item: any) => (
                      <tr key={item.id}>
                        <td>
                          <span className="font-bold text-slate-900 dark:text-white block">{item.name}</span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">{item.usn}</span>
                        </td>
                        <td className="font-medium text-slate-700 dark:text-slate-300">
                          Sem {item.semester} ({item.section})
                        </td>
                        <td>
                          {item.recordType === 'PARTICIPANT' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                              Participant
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-800">
                              Volunteer
                            </span>
                          )}
                        </td>
                        <td>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 block">{item.event_name}</span>
                          <span className="text-[11px] text-slate-400 dark:text-slate-500">{item.event_category} · {item.venue}</span>
                        </td>
                        <td>
                          {item.recordType === 'PARTICIPANT' ? (
                            <div>
                              <span className="font-semibold text-slate-700 dark:text-slate-300 block">{item.mode}</span>
                              {item.team_name && item.team_name !== '-' && (
                                <span className="text-[11px] text-teal-700 dark:text-purple-300 font-mono">Team: {item.team_name}</span>
                              )}
                            </div>
                          ) : (
                            <div>
                              <span className="font-semibold text-slate-700 dark:text-slate-300 block">Pref: {item.preferred_area}</span>
                              {item.responsibility && item.responsibility !== '-' && (
                                <span className="text-[11px] text-slate-500 dark:text-slate-400">Task: {item.responsibility}</span>
                              )}
                            </div>
                          )}
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
                        </td>
                        <td className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                          {item.date}
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
      {/* 2. SPECIAL MENU: EVENT COORDINATOR WORKSPACE                               */}
      {/* ========================================================================= */}
      {isSpecialMenu && (
        <div className="space-y-6">
          {/* Top Sub-Navigation Tabs for Event Coordinator */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <IconActivity size={22} className="text-teal-600 dark:text-purple-400" />
                <span>Event Coordinator Workspace</span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Manage your active coordinated events, create new events, appoint student leadership, and inspect archived history.
              </p>
            </div>

            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-x-auto text-xs font-semibold">
              <button
                onClick={() => setActiveTab('create_event')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${
                  activeTab === 'create_event'
                    ? 'bg-teal-600 text-white shadow-sm shadow-teal-600/25 dark:bg-purple-600 dark:text-white dark:shadow-purple-900/40 font-bold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
                }`}
              >
                <IconPlus size={15} />
                <span>Create College Event</span>
              </button>
              <button
                onClick={() => setActiveTab('active_events')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${
                  activeTab === 'active_events'
                    ? 'bg-teal-600 text-white shadow-sm shadow-teal-600/25 dark:bg-purple-600 dark:text-white dark:shadow-purple-900/40 font-bold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
                }`}
              >
                <IconCalendar size={15} />
                <span>Active Coordinated Events ({coordinatedEvents?.active_events?.length || 0})</span>
              </button>
              <button
                onClick={() => setActiveTab('history_events')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${
                  activeTab === 'history_events'
                    ? 'bg-teal-600 text-white shadow-sm shadow-teal-600/25 dark:bg-purple-600 dark:text-white dark:shadow-purple-900/40 font-bold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
                }`}
              >
                <IconArchive size={15} />
                <span>History & Archives ({coordinatedEvents?.history_events?.length || 0})</span>
              </button>
            </div>
          </div>

          {/* SUB-VIEW 2A: ACTIVE COORDINATED EVENTS */}
          {activeTab === 'active_events' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">Current Active Coordinated Events</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Events currently open or upcoming where you are the authorized Faculty Coordinator.
                  </p>
                </div>
                <button
                  onClick={() => {
                    resetCreateEventForm()
                    setActiveTab('create_event')
                  }}
                  className="btn btn-primary px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm shadow-blue-500/20 active:scale-98"
                >
                  <IconPlus size={15} />
                  <span>Create Another Event</span>
                </button>
              </div>

              {(!coordinatedEvents?.active_events || coordinatedEvents.active_events.length === 0) ? (
                <div className="p-10 text-center text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                  <IconCalendar size={36} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="font-semibold text-slate-700 dark:text-slate-300">No active coordinated events found.</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Click the "Create College Event" button above to launch an event.</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {coordinatedEvents.active_events.map((ev: any) => (
                    <div key={ev.id} className="card card-hover flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 uppercase">
                              {ev.category}
                            </span>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">{ev.name}</h3>
                          </div>
                          <span className={`badge ${ev.status === 'LIVE' ? 'badge-success' : 'badge-vvce'}`}>
                            {ev.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                          <span className="flex items-center gap-1">
                            <IconMapPin size={13} className="text-slate-400" />
                            {ev.venue || 'Campus Venue'}
                          </span>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <IconCalendar size={13} className="text-slate-400" />
                            {new Date(ev.start_at).toLocaleDateString()}
                          </span>
                        </p>

                        {/* Quick Metrics Bar */}
                        <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-center text-xs">
                          <div className="p-2 rounded bg-slate-50 dark:bg-slate-800/60">
                            <span className="text-[10px] text-slate-400 uppercase block font-semibold">Registrations</span>
                            <span className="font-bold text-slate-900 dark:text-white">{ev.registrations_count || 0}</span>
                          </div>
                          <div className="p-2 rounded bg-slate-50 dark:bg-slate-800/60">
                            <span className="text-[10px] text-slate-400 uppercase block font-semibold">Teams</span>
                            <span className="font-bold text-slate-900 dark:text-white">{ev.teams_count || 0}</span>
                          </div>
                          <div className="p-2 rounded bg-slate-50 dark:bg-slate-800/60">
                            <span className="text-[10px] text-slate-400 uppercase block font-semibold">Volunteers</span>
                            <span className="font-bold text-slate-900 dark:text-white">{ev.volunteers_count || 0}</span>
                          </div>
                          <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300">
                            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 uppercase block font-semibold">Shortlisted</span>
                            <span className="font-bold text-emerald-900 dark:text-emerald-200">{ev.shortlisted_teams_count || 0}</span>
                          </div>
                        </div>
                      </div>

                      {/* Operations Actions */}
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            to={`/faculty/events/${ev.id}/form-builder`}
                            className="btn btn-secondary px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition active:scale-98"
                          >
                            <IconEdit size={13} />
                            <span>Edit Form Builder</span>
                          </Link>
                          <Link
                            to={`/faculty/events/${ev.id}`}
                            className="btn btn-primary px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs active:scale-98"
                          >
                            <span>Open Event Workspace</span>
                            <IconExternalLink size={13} />
                          </Link>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEventToDelete(ev)}
                          className="btn btn-secondary px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 transition active:scale-98"
                          title="Delete event and cascade child data"
                        >
                          <IconTrash size={13} />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SUB-VIEW 2B: COORDINATED EVENTS HISTORY & ARCHIVES */}
          {activeTab === 'history_events' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Coordinated Events History & Data Archives</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Preserved records, participant statistics, winner announcements, and reports from past events you coordinated.
                </p>
              </div>

              {(!coordinatedEvents?.history_events || coordinatedEvents.history_events.length === 0) ? (
                <div className="p-10 text-center text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-xs">
                  No past completed events found in your archive yet. Completed events will automatically be stored here.
                </div>
              ) : (
                <div className="space-y-3">
                  {coordinatedEvents.history_events.map((ev: any) => (
                    <div key={ev.id} className="card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-400 dark:text-slate-500">#{ev.id}</span>
                          <span className="font-bold text-slate-900 dark:text-white text-sm">{ev.name}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            ev.status === 'ENDED' || ev.status === 'COMPLETED'
                              ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                              : 'badge badge-neutral'
                          }`}>
                            {ev.status === 'COMPLETED' ? 'ENDED' : ev.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {ev.category} · {ev.venue} · Concluded on {new Date(ev.end_at).toLocaleDateString()}
                        </p>
                        <div className="flex flex-wrap gap-3 pt-1 text-[11px] text-slate-600 dark:text-slate-400">
                          <span>Total Registrations: <b className="text-slate-900 dark:text-slate-200">{ev.registrations_count || 0}</b></span>
                          <span>Shortlisted: <b className="text-emerald-700 dark:text-emerald-400">{ev.shortlisted_teams_count || 0}</b></span>
                          <span>Winners Declared: <b className="text-amber-700 dark:text-amber-400">{ev.winners_count || 0}</b></span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          to={`/faculty/events/${ev.id}`}
                          className="btn-outline btn-sm text-xs flex items-center gap-1.5"
                        >
                          <span>View Preserved Data</span>
                          <IconExternalLink size={16} />
                        </Link>
                        <Link
                          to={`/faculty/events/${ev.id}?tab=reports`}
                          className="btn-secondary btn-sm text-xs flex items-center gap-1.5"
                        >
                          <IconFileText size={13} />
                          <span>Export PDF Reports</span>
                        </Link>
                        <button
                          type="button"
                          onClick={() => setEventToDelete(ev)}
                          className="btn-secondary btn-sm text-xs flex items-center gap-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 transition active:scale-98"
                          title="Delete event and cascade child data"
                        >
                          <IconTrash size={13} />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SUB-VIEW 2C: CREATE EVENT (WITH COMPLETE SUCCESS SHOWCASE) */}
          {activeTab === 'create_event' && (
            <div className="max-w-4xl mx-auto space-y-6">
              {createdEventInfo ? (
                /* COMPLETE SUCCESS SHOWCASE INTERFACE */
                <div className="glass-card p-6 sm:p-10 rounded-3xl border border-border-default bg-white dark:bg-[#0E1017] shadow-sm space-y-8 text-center relative overflow-hidden">
                  <div className="absolute right-0 top-0 w-96 h-full bg-gradient-to-l from-emerald-500/10 via-blue-500/5 to-transparent pointer-events-none"></div>

                  <div className="relative z-10 space-y-4 max-w-xl mx-auto">
                    <div className="w-20 h-20 rounded-3xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700/80 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                      <IconCheckCircle size={44} />
                    </div>
                    <div className="space-y-1.5">
                      <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 uppercase tracking-wider">
                        Event Created & Published Live
                      </span>
                      <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                        {createdEventInfo.name}
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-mono">
                        Official Reference ID: #{createdEventInfo.id} · Form Schema V1 Published
                      </p>
                    </div>

                    {createdEventInfo.poster_url && (
                      <div className="max-w-md mx-auto rounded-2xl overflow-hidden border border-border-default shadow-md max-h-56 flex items-center justify-center bg-slate-950">
                        <img src={createdEventInfo.poster_url} alt="Event Poster" className="max-h-56 object-cover w-full" />
                      </div>
                    )}
                  </div>

                  {/* Telemetry Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto text-left">
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#121520] border border-border-default text-xs">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Category</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 mt-1 block">{createdEventInfo.category || 'Technical'}</span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#121520] border border-border-default text-xs">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Venue</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 mt-1 block truncate">{createdEventInfo.venue || 'Campus Auditorium'}</span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#121520] border border-border-default text-xs">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Team Size</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 mt-1 block">
                        {createdEventInfo.min_team_size === 1 && createdEventInfo.max_team_size === 1
                          ? 'Individual'
                          : `${createdEventInfo.min_team_size} – ${createdEventInfo.max_team_size} Members`}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#121520] border border-border-default text-xs">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Volunteers</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
                        {createdEventInfo.volunteer_enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>

                  {/* Action CTAs */}
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
                    <Link
                      to={`/faculty/events/${createdEventInfo.id}`}
                      className="btn btn-primary px-4 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs active:scale-98 w-full sm:w-auto"
                    >
                      <span>Open Event Workspace</span>
                      <IconExternalLink size={14} />
                    </Link>
                    <Link
                      to={`/faculty/events/${createdEventInfo.id}/form-builder`}
                      className="btn btn-secondary px-4 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-98 w-full sm:w-auto"
                    >
                      <IconEdit size={14} />
                      <span>Customize Dynamic Form</span>
                    </Link>
                    <Link
                      to={`/faculty/leadership?event_id=${createdEventInfo.id}`}
                      className="btn btn-outline px-4 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-98 w-full sm:w-auto"
                    >
                      <IconAward size={14} />
                      <span>Appoint Student Leaders</span>
                    </Link>
                    <button
                      type="button"
                      onClick={resetCreateEventForm}
                      className="btn btn-outline px-4 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-98 w-full sm:w-auto"
                    >
                      <IconPlus size={14} />
                      <span>Create Another Event</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* CREATION FORM CONTAINER */
                <div className="glass-card p-6 sm:p-8 rounded-3xl border border-border-default bg-white dark:bg-[#0E1017] shadow-sm space-y-6">
                  <div className="border-b border-slate-200 dark:border-slate-800 pb-3 flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white">Create New College Event</h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Authorized Faculty Coordinator portal for Vidyavardhaka College of Engineering (VVCE).
                      </p>
                    </div>
                    <span className="badge badge-vvce text-xs">Event Creation Workspace</span>
                  </div>

                  <form onSubmit={handleCreateEvent} className="space-y-8">
                {/* SECTION 1: EVENT ESSENTIALS & LOGISTICS */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                    <IconSparkles size={16} className="text-teal-600 dark:text-purple-400" />
                    <span>1. Event Essentials & Logistics</span>
                  </h3>
                  <div>
                    <label className="label">Event Name *</label>
                    <input
                      className="input font-semibold"
                      placeholder="e.g. HackVVCE 2026 - Annual 24hr State-Level Hackathon"
                      value={eventForm.name}
                      onChange={e => setEventForm({ ...eventForm, name: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="label">Description & Problem Statement / Guidelines</label>
                    <textarea
                      className="input"
                      rows={3}
                      placeholder="Objectives, themes, eligibility criteria, problem statements, and schedule..."
                      value={eventForm.description}
                      onChange={e => setEventForm({ ...eventForm, description: e.target.value })}
                    />
                  </div>

                  {/* Event Poster / Showcase Graphic */}
                  <div>
                    <ImageFileUpload
                      label="Event Promotional Poster / Showcase Graphic (Picture Upload / URL)"
                      value={eventForm.poster_url}
                      onChange={url => setEventForm({ ...eventForm, poster_url: url })}
                      accept="image/*"
                      placeholder="Click or drag to upload Event Poster (JPG/PNG/WEBP)"
                      helperText="Attach an official promotional poster to attract students faster on the campus event explorer."
                    />
                    {eventForm.poster_url && (
                      <div className="mt-2.5 relative rounded-2xl overflow-hidden border border-border-default max-h-48 flex items-center justify-center bg-black/5 dark:bg-black/40">
                        <img src={eventForm.poster_url} alt="Event Poster Preview" className="max-h-48 object-contain" />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Category</label>
                      <select
                        className="input"
                        value={eventForm.category}
                        onChange={e => setEventForm({ ...eventForm, category: e.target.value })}
                      >
                        {['Technical', 'Cultural', 'Sports', 'Workshop', 'Conference', 'Hackathon'].map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label">Venue</label>
                      <div className="relative">
                        <IconMapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                          className="input input-icon-left text-xs"
                          style={{ paddingLeft: '2.5rem' }}
                          placeholder="e.g. CSE Seminar Hall / Multi-Purpose Auditorium"
                          value={eventForm.venue}
                          onChange={e => setEventForm({ ...eventForm, venue: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Event Start Date & Time *</label>
                      <input
                        className="input"
                        type="datetime-local"
                        value={eventForm.start_at}
                        onChange={e => setEventForm({ ...eventForm, start_at: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="label">Event End Date & Time *</label>
                      <input
                        className="input"
                        type="datetime-local"
                        value={eventForm.end_at}
                        onChange={e => setEventForm({ ...eventForm, end_at: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Registration Window Opens</label>
                      <input
                        className="input"
                        type="datetime-local"
                        value={eventForm.reg_open_at}
                        onChange={e => setEventForm({ ...eventForm, reg_open_at: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="label">Registration Window Closes (Auto-Stops Accepting Registrations)</label>
                      <input
                        className="input"
                        type="datetime-local"
                        value={eventForm.reg_close_at}
                        onChange={e => setEventForm({ ...eventForm, reg_close_at: e.target.value })}
                      />
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 block">
                        Once the closing date & time is reached, the system will automatically stop accepting new registrations.
                      </span>
                    </div>
                  </div>

                  {/* Volunteer Applications Toggle */}
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={eventForm.volunteer_enabled}
                        onChange={e => setEventForm({ ...eventForm, volunteer_enabled: e.target.checked })}
                      />
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white text-sm block">
                          Enable Volunteer Registrations for this Event
                        </span>
                        <span className="text-slate-500 dark:text-slate-400 text-xs block mt-0.5">
                          Allows students to apply as event volunteers. Student details (Name, USN, Department, Semester, Section) are locked and auto-populated directly from institutional student profiles — applicants only supply their contact phone number and area of interest.
                        </span>
                      </div>
                    </label>
                  </div>

                  {/* Fee & Payment Configuration */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                        <IconCreditCard size={15} />
                        <span>Registration Fee & Shortlisted Teams Payment Setup</span>
                      </h4>
                      <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded">
                        Free / Pending at Registration
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-bold">
                        <IconAlertTriangle size={14} className="text-amber-600 dark:text-amber-400" />
                        <span>Strict VVCE Institutional Payment Rule:</span>
                      </div>
                      <p>
                        Registration fee is <strong>NEVER charged during initial student registration</strong>. Initial registration is completely free/pending review. Only after teams or participants are <strong>officially shortlisted</strong> will the team leader be required to pay the fee to unlock the official WhatsApp group.
                      </p>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="label">Registration Fee per Team / Participant (₹)</label>
                        <input
                          className="input font-mono font-bold text-slate-800 dark:text-white"
                          type="number"
                          min={0}
                          step={1}
                          value={eventForm.registration_fee}
                          onChange={e => setEventForm({ ...eventForm, registration_fee: +e.target.value })}
                          placeholder="0 for Free Event"
                        />
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 block">
                          Enter 0 if event is free. If &gt; 0, shortlisted teams pay via UPI to unlock WhatsApp group.
                        </span>
                      </div>
                      <div>
                        <label className="label">Coordinator UPI ID (e.g. vvceevents@oksbi)</label>
                        <input
                          className="input font-mono font-bold text-slate-800 dark:text-white"
                          placeholder="e.g. vvceevents@oksbi or 9876543210@upi"
                          value={eventForm.upi_id}
                          onChange={e => setEventForm({ ...eventForm, upi_id: e.target.value })}
                        />
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 block">
                          Displayed to shortlisted team leaders with a 1-click copy button.
                        </span>
                      </div>
                    </div>

                    {/* QR Code Image Upload Box */}
                    <div className="pt-2">
                      <ImageFileUpload
                        label="UPI Payment QR Code Picture (Image Upload)"
                        value={eventForm.payment_qr_url}
                        onChange={url => setEventForm({ ...eventForm, payment_qr_url: url })}
                        accept="image/*"
                        placeholder="Click or drag to upload QR Code image (PNG/JPG)"
                        helperText="Upload the official department or coordinator QR code picture. Shortlisted teams scan this to pay."
                      />
                    </div>

                    <div>
                      <label className="label">Payment Instructions for Shortlisted Teams</label>
                      <textarea
                        className="input text-xs"
                        rows={2}
                        value={eventForm.payment_instructions}
                        onChange={e => setEventForm({ ...eventForm, payment_instructions: e.target.value })}
                        placeholder="e.g. Scan the QR code, pay via GPay/PhonePe/Paytm, and enter the 12-digit UTR / Transaction Reference number and upload payment receipt."
                      />
                    </div>

                    {/* WhatsApp Group Details */}
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <IconMessageSquare size={15} />
                        <span>Official WhatsApp / Community Group Join Link</span>
                      </h4>
                      <div>
                        <label className="label">WhatsApp Group Join URL</label>
                        <input
                          className="input font-mono text-xs"
                          value={eventForm.whatsapp_group_url}
                          onChange={e => setEventForm({ ...eventForm, whatsapp_group_url: e.target.value })}
                          placeholder="https://chat.whatsapp.com/ExampleInviteLink"
                        />
                      </div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                        <IconLock size={13} className="text-slate-400" />
                        <span><strong>Strict Privacy Guard:</strong> This group link is kept confidential and will unlock ONLY to shortlisted teams/participants after fee payment.</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* SECTION 2: REGISTRATION FORM SELECTION (EXACTLY 3 OPTIONS) */}
                <div className="space-y-4">
                  <div className="border-b border-slate-200 dark:border-slate-800 pb-2">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                      <IconFileText size={16} className="text-purple-600 dark:text-purple-400" />
                      <span>2. Choose Registration Form (Exactly 3 Options)</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Choose how students register for this event. Creation happens right here — select a default form or build your own custom form before publishing.
                    </p>
                  </div>

                  {/* 3 Form Option Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Option 1: Default Team Registration */}
                    <div
                      onClick={() => setEventForm({ ...eventForm, formChoice: 'team_default' })}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        eventForm.formChoice === 'team_default'
                          ? 'border-purple-600 bg-purple-50/50 dark:bg-purple-950/30 shadow-md ring-1 ring-purple-500'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-950/60 flex items-center justify-center text-purple-700 dark:text-purple-300">
                          <IconUsers size={20} />
                        </div>
                        <input
                          type="radio"
                          name="formChoice"
                          checked={eventForm.formChoice === 'team_default'}
                          onChange={() => setEventForm({ ...eventForm, formChoice: 'team_default' })}
                          className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                        />
                      </div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">Option 1: Default Team Registration</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        Ideal for Hackathons & Team Projects. Collects team proposal, idea details, student PPT upload, coordinator reference PPT, and full team roster.
                      </p>
                      <span className="inline-block mt-3 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300">
                        Team Projects / Hackathons
                      </span>
                    </div>

                    {/* Option 2: Default Individual Registration */}
                    <div
                      onClick={() => setEventForm({ ...eventForm, formChoice: 'individual_default' })}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        eventForm.formChoice === 'individual_default'
                          ? 'border-purple-600 bg-purple-50/50 dark:bg-purple-950/30 shadow-md ring-1 ring-purple-500'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
                          <IconUser size={20} />
                        </div>
                        <input
                          type="radio"
                          name="formChoice"
                          checked={eventForm.formChoice === 'individual_default'}
                          onChange={() => setEventForm({ ...eventForm, formChoice: 'individual_default' })}
                          className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                        />
                      </div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">Option 2: Default Individual Registration</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        Ideal for Workshops, Guest Lectures & Solo Competitions. Auto-verifies student institutional identity and collects participation statement.
                      </p>
                      <span className="inline-block mt-3 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300">
                        Individual Entry / Workshops
                      </span>
                    </div>

                    {/* Option 3: Create New Custom Dynamic Form */}
                    <div
                      onClick={() => setEventForm({ ...eventForm, formChoice: 'custom' })}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        eventForm.formChoice === 'custom'
                          ? 'border-purple-600 bg-purple-50/50 dark:bg-purple-950/30 shadow-md ring-1 ring-purple-500'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center text-amber-700 dark:text-amber-300">
                          <IconEdit size={20} />
                        </div>
                        <input
                          type="radio"
                          name="formChoice"
                          checked={eventForm.formChoice === 'custom'}
                          onChange={() => setEventForm({ ...eventForm, formChoice: 'custom' })}
                          className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                        />
                      </div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">Option 3: Create New Custom Form</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        Google Forms style builder right here! Build your own custom questions (text, choices, uploads, rating, etc.) for team or individual entry.
                      </p>
                      <span className="inline-block mt-3 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300">
                        Custom Question Builder
                      </span>
                    </div>
                  </div>

                  {/* DETAILS FOR OPTION 1: DEFAULT TEAM REGISTRATION */}
                  {eventForm.formChoice === 'team_default' && (
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                          <IconUsers size={15} />
                          <span>Default Team Registration Settings & Roster Fields</span>
                        </h4>
                        <span className="badge badge-vvce text-xs">Team Mode Active</span>
                      </div>

                      {/* Faculty Coordinator Template Format PPT Upload */}
                      <div className="p-3.5 bg-cream-100/70 dark:bg-midnight-800/60 rounded-xl border border-border-default space-y-2">
                        <ImageFileUpload
                          label="Faculty Coordinator Reference PPT Template (PPT/PDF Upload)"
                          value={eventForm.ppt_template_url}
                          onChange={url => setEventForm({ ...eventForm, ppt_template_url: url })}
                          accept=".ppt,.pptx,.pdf"
                          placeholder="Click or drag to upload Reference Pitch Deck Template (.pptx / .pdf)"
                          helperText="Upload sample pitch deck slides. Students registering will see a prominent 'Download PPT Template' button to reference and prepare their slides."
                        />
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className="label">Min Team Size</label>
                          <input
                            className="input"
                            type="number"
                            min={1}
                            max={10}
                            value={eventForm.min_team_size}
                            onChange={e => setEventForm({ ...eventForm, min_team_size: +e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="label">Max Team Size</label>
                          <input
                            className="input"
                            type="number"
                            min={1}
                            max={10}
                            value={eventForm.max_team_size}
                            onChange={e => setEventForm({ ...eventForm, max_team_size: +e.target.value })}
                          />
                        </div>
                      </div>

                      {/* Restrict to Single Department Toggle */}
                      <label className="flex items-start gap-3 p-3 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 cursor-pointer">
                        <input
                          type="checkbox"
                          className="mt-0.5"
                          checked={eventForm.require_same_department}
                          onChange={e => setEventForm({ ...eventForm, require_same_department: e.target.checked })}
                        />
                        <div>
                          <span className="font-bold text-amber-900 dark:text-amber-200 text-xs sm:text-sm block">
                            Restrict all team members to single department
                          </span>
                          <span className="text-amber-800 dark:text-amber-300 text-xs block">
                            When enabled, all team members (including the team leader) must belong to the exact same department/branch. Cross-branch team invitations are strictly blocked.
                          </span>
                        </div>
                      </label>

                      {/* Toggles for PPT & ID Proof */}
                      <div className="grid sm:grid-cols-2 gap-3 pt-1">
                        <label className="flex items-start gap-2.5 p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 cursor-pointer text-xs">
                          <input
                            type="checkbox"
                            className="mt-0.5"
                            checked={eventForm.idea_ppt_required}
                            onChange={e => setEventForm({ ...eventForm, idea_ppt_required: e.target.checked })}
                          />
                          <div>
                            <span className="font-bold text-slate-800 dark:text-slate-200 block">Require Student Idea Pitch Deck (PPT/PDF)</span>
                            <span className="text-slate-500 dark:text-slate-400">Teams must upload their prepared idea pitch deck for committee review.</span>
                          </div>
                        </label>
                        <label className="flex items-start gap-2.5 p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 cursor-pointer text-xs">
                          <input
                            type="checkbox"
                            className="mt-0.5"
                            checked={eventForm.require_id_proof}
                            onChange={e => setEventForm({ ...eventForm, require_id_proof: e.target.checked })}
                          />
                          <div>
                            <span className="font-bold text-slate-800 dark:text-slate-200 block">Require College Student ID Proof Photo</span>
                            <span className="text-slate-500 dark:text-slate-400">Team leader and members must attach photo/scan of institutional student ID.</span>
                          </div>
                        </label>
                      </div>

                      {/* Preview of Questions Included in Default Team Form */}
                      <div className="p-3.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                        <span className="font-bold text-slate-800 dark:text-slate-200 block">Questions Included in Default Team Form:</span>
                        <ol className="list-decimal pl-4 text-slate-600 dark:text-slate-300 space-y-1">
                          <li><strong>Team Name</strong> (e.g. CyberKnights)</li>
                          <li><strong>Project / Idea Title</strong> (e.g. Smart Campus AI Surveillance)</li>
                          <li><strong>Problem Statement & Proposed Solution</strong> (Detailed proposal)</li>
                          <li><strong>Competition Track / Domain</strong> (Web, Mobile, AI/ML, IoT, Open Innovation)</li>
                          <li><strong>Student Idea Presentation Deck</strong> (Upload PPT / PDF slide deck)</li>
                          <li><strong>Team Leader Details</strong> (Name, USN, Phone, Email, Semester, Branch, Section) + ID photo {eventForm.require_id_proof ? '(Required)' : '(Optional)'}</li>
                          <li><strong>Team Members Details</strong> (Name, USN, Phone, Email, Branch, Semester, Section, Department) + ID photo {eventForm.require_id_proof ? '(Required)' : '(Optional)'}</li>
                          {eventForm.ppt_template_url && (
                            <li className="text-blue-700 dark:text-blue-400 font-semibold">
                              <strong>Download Button</strong> for Coordinator Reference PPT Template
                            </li>
                          )}
                        </ol>
                      </div>
                    </div>
                  )}

                  {/* DETAILS FOR OPTION 2: DEFAULT INDIVIDUAL REGISTRATION */}
                  {eventForm.formChoice === 'individual_default' && (
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                          <IconUser size={15} />
                          <span>Default Individual Registration Settings</span>
                        </h4>
                        <span className="badge badge-vvce text-xs">Individual Mode Active</span>
                      </div>

                      <label className="flex items-start gap-2.5 p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          className="mt-0.5"
                          checked={eventForm.require_id_proof}
                          onChange={e => setEventForm({ ...eventForm, require_id_proof: e.target.checked })}
                        />
                        <div>
                          <span className="font-bold text-slate-800 dark:text-slate-200 block">Require College Student ID Proof Photo</span>
                          <span className="text-slate-500 dark:text-slate-400">Participant must attach image or PDF of their institutional college ID card.</span>
                        </div>
                      </label>

                      {/* Preview of Questions Included in Default Individual Form */}
                      <div className="p-3.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                        <span className="font-bold text-slate-800 dark:text-slate-200 block">Questions Included in Default Individual Form:</span>
                        <ol className="list-decimal pl-4 text-slate-600 dark:text-slate-300 space-y-1">
                          <li><strong>Verified Student Identity</strong> (Name, USN, Email, Department, Current Semester, Section — locked from account)</li>
                          <li><strong>Contact Mobile / WhatsApp Number</strong> (Required for event communication)</li>
                          <li><strong>College Student ID Proof Photo</strong> {eventForm.require_id_proof ? '(Required)' : '(Optional)'}</li>
                          <li><strong>Participation Statement / Domain Interest</strong> (Optional background description)</li>
                        </ol>
                      </div>
                    </div>
                  )}

                  {/* DETAILS FOR OPTION 3: CREATE NEW CUSTOM DYNAMIC FORM */}
                  {eventForm.formChoice === 'custom' && (
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
                        <div>
                          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                            <IconEdit size={15} />
                            <span>Interactive Custom Dynamic Form Builder</span>
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Design your custom registration questions right here. Questions will be published as Form Version 1.
                          </p>
                        </div>

                        {/* Participation Entry Type for Custom Form */}
                        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">Participation Entry:</span>
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="radio"
                              name="customEntryType"
                              checked={eventForm.customEntryType === 'team'}
                              onChange={() => setEventForm({ ...eventForm, customEntryType: 'team' })}
                            />
                            <span className="text-slate-800 dark:text-slate-200">Team Entry</span>
                          </label>
                          <span className="text-slate-300 dark:text-slate-700">|</span>
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="radio"
                              name="customEntryType"
                              checked={eventForm.customEntryType === 'individual'}
                              onChange={() => setEventForm({ ...eventForm, customEntryType: 'individual' })}
                            />
                            <span className="text-slate-800 dark:text-slate-200">Individual Entry</span>
                          </label>
                        </div>
                      </div>

                      {eventForm.customEntryType === 'team' && (
                        <div className="grid sm:grid-cols-3 gap-3 p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                          <div>
                            <label className="label">Min Team Size</label>
                            <input
                              className="input text-xs"
                              type="number"
                              min={1}
                              max={10}
                              value={eventForm.min_team_size}
                              onChange={e => setEventForm({ ...eventForm, min_team_size: +e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="label">Max Team Size</label>
                            <input
                              className="input text-xs"
                              type="number"
                              min={1}
                              max={10}
                              value={eventForm.max_team_size}
                              onChange={e => setEventForm({ ...eventForm, max_team_size: +e.target.value })}
                            />
                          </div>
                          <div className="flex items-center pt-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={eventForm.require_same_department}
                                onChange={e => setEventForm({ ...eventForm, require_same_department: e.target.checked })}
                              />
                              <span className="font-semibold text-slate-800 dark:text-slate-200">Single Branch Only</span>
                            </label>
                          </div>
                        </div>
                      )}

                      {/* Add Question Controls */}
                      <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Add New Question Type:</label>
                          <select
                            className="input py-1 text-xs font-medium w-auto"
                            value={newQuestionType}
                            onChange={e => setNewQuestionType(e.target.value)}
                          >
                            <option value="short_text">Short Text</option>
                            <option value="long_text">Paragraph / Long Text</option>
                            <option value="email">Email Address</option>
                            <option value="phone">Phone Number</option>
                            <option value="number">Number</option>
                            <option value="dropdown">Dropdown Selection</option>
                            <option value="single_choice">Single Choice (Radio)</option>
                            <option value="multiple_choice">Multiple Choice (Checkboxes)</option>
                            <option value="yes_no">Yes / No</option>
                            <option value="date">Date</option>
                            <option value="url">Website / Portfolio URL</option>
                            <option value="file">File Upload (PPT / PDF / Images)</option>
                            <option value="rating">Rating / Scale</option>
                            <option value="section">Section Heading</option>
                            <option value="instruction">Instructions Banner</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => addCustomQuestion(newQuestionType)}
                            className="btn-primary btn-sm text-xs flex items-center gap-1"
                          >
                            <IconPlus size={14} />
                            <span>Add Question</span>
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => setPreviewCustomForm(!previewCustomForm)}
                          className="btn-outline btn-sm text-xs flex items-center gap-1.5"
                        >
                          <IconEye size={14} />
                          <span>{previewCustomForm ? 'Edit Questions' : 'Toggle Student Preview'}</span>
                        </button>
                      </div>

                      {/* Questions List */}
                      {!previewCustomForm ? (
                        <div className="space-y-3">
                          {customQuestions.length === 0 ? (
                            <div className="p-6 text-center text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
                              No custom questions added yet. Use the dropdown above to add your first question.
                            </div>
                          ) : (
                            customQuestions.map((q, idx) => (
                              <div key={q.id || idx} className="p-3.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm space-y-3 text-xs">
                                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold text-slate-400 dark:text-slate-500">#{idx + 1}</span>
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 uppercase">
                                      {q.type.replace('_', ' ')}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => moveCustomQuestion(idx, -1)}
                                      disabled={idx === 0}
                                      className="btn-ghost btn-xs text-slate-500 disabled:opacity-30 p-1"
                                      title="Move Up"
                                    >
                                      <IconChevronUp size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => moveCustomQuestion(idx, 1)}
                                      disabled={idx === customQuestions.length - 1}
                                      className="btn-ghost btn-xs text-slate-500 disabled:opacity-30 p-1"
                                      title="Move Down"
                                    >
                                      <IconChevronDown size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => duplicateCustomQuestion(idx)}
                                      className="btn-ghost btn-xs text-blue-600 dark:text-blue-400 flex items-center gap-1"
                                      title="Duplicate"
                                    >
                                      <IconCopy size={13} />
                                      <span>Duplicate</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => removeCustomQuestion(idx)}
                                      className="btn-ghost btn-xs text-rose-600 dark:text-rose-400 flex items-center gap-1"
                                      title="Delete"
                                    >
                                      <IconTrash size={13} />
                                      <span>Delete</span>
                                    </button>
                                  </div>
                                </div>

                                <div className="grid sm:grid-cols-3 gap-3">
                                  <div className="sm:col-span-2">
                                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Question Title / Label *</label>
                                    <input
                                      className="input text-xs"
                                      value={q.title}
                                      onChange={e => updateCustomQuestion(idx, { title: e.target.value })}
                                      placeholder="e.g. Enter Project Title"
                                      required
                                    />
                                  </div>
                                  <div className="flex items-center pt-5">
                                    {q.type !== 'section' && q.type !== 'instruction' && (
                                      <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={Boolean(q.required)}
                                          onChange={e => updateCustomQuestion(idx, { required: e.target.checked })}
                                        />
                                        <span className="font-semibold text-slate-800 dark:text-slate-200">Required Field</span>
                                      </label>
                                    )}
                                  </div>
                                </div>

                                <div>
                                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Helper Description / Instructions (Optional)</label>
                                  <input
                                    className="input text-xs"
                                    value={q.description || ''}
                                    onChange={e => updateCustomQuestion(idx, { description: e.target.value })}
                                    placeholder="Help text displayed under the question"
                                  />
                                </div>

                                {/* Options Editor for Choice Types */}
                                {['dropdown', 'single_choice', 'multiple_choice'].includes(q.type) && (
                                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded border border-slate-200 dark:border-slate-700">
                                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                      Choices / Options (Comma separated)
                                    </label>
                                    <input
                                      className="input text-xs bg-white dark:bg-slate-900"
                                      value={Array.isArray(q.options) ? q.options.join(', ') : (q.options || '')}
                                      onChange={e => updateCustomQuestion(idx, {
                                        options: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                                      })}
                                      placeholder="Option 1, Option 2, Option 3"
                                    />
                                  </div>
                                )}

                                {/* File Upload Restrictions */}
                                {q.type === 'file' && (
                                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded border border-slate-200 dark:border-slate-700">
                                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                      Allowed File Extensions (Comma separated)
                                    </label>
                                    <input
                                      className="input text-xs bg-white dark:bg-slate-900 font-mono"
                                      value={Array.isArray(q.file_types) ? q.file_types.join(', ') : 'pdf, pptx, ppt'}
                                      onChange={e => updateCustomQuestion(idx, {
                                        file_types: e.target.value.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
                                      })}
                                      placeholder="pdf, pptx, ppt, png, jpg"
                                    />
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      ) : (
                        /* Live Student Preview */
                        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-purple-800 shadow-inner space-y-4 text-xs">
                          <div className="border-b border-slate-200 dark:border-slate-700 pb-2 flex items-center justify-between">
                            <span className="font-bold text-slate-800 dark:text-white">Preview: Student Registration Form</span>
                            <span className="badge badge-vvce text-[10px]">Live Preview</span>
                          </div>
                          <div className="space-y-3">
                            {customQuestions.map((q, idx) => (
                              <div key={idx} className="p-3 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                                <label className="font-bold text-slate-800 dark:text-white block mb-0.5">
                                  {q.title} {q.required && <span className="text-rose-500">*</span>}
                                </label>
                                {q.description && <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-1.5">{q.description}</p>}
                                {q.type === 'file' ? (
                                  <div className="p-3 border border-dashed rounded bg-white dark:bg-slate-900 text-center text-slate-400 dark:text-slate-500">
                                    <IconPaperclip size={16} className="mx-auto mb-1 text-slate-400" />
                                    <span>[ Student File Upload Box: {q.file_types?.join(', ') || 'pdf, ppt'} ]</span>
                                  </div>
                                ) : ['dropdown', 'single_choice', 'multiple_choice'].includes(q.type) ? (
                                  <div className="flex flex-wrap gap-2 pt-1">
                                    {(q.options || ['Option 1', 'Option 2']).map((opt: string, oi: number) => (
                                      <span key={oi} className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                                        {opt}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <input className="input text-xs bg-white dark:bg-slate-900" placeholder={q.placeholder || 'Student input...'} disabled />
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* SECTION 3: SUBMIT AND GO LIVE */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2 flex flex-col items-center">
                  <button
                    type="submit"
                    disabled={creatingEvent}
                    className="btn btn-primary px-6 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-2xs active:scale-98 disabled:opacity-50"
                  >
                    <IconSend size={15} />
                    <span>{creatingEvent ? 'Compiling Schema & Publishing Live...' : 'Submit Form & Publish Event Live'}</span>
                  </button>
                  <p className="text-center text-xs text-slate-500 dark:text-slate-400">
                    Submitting creates the event, compiles the selected registration form schema, publishes Version 1 immediately, and opens registrations for VVCE students.
                  </p>
                </div>
              </form>
            </div>
            )}
          </div>
          )}
        </div>
      )}


      {/* ========================================================================= */}
      {/* 3. CLASS TEACHER SPECIAL SECTION (STRICTLY ONLY IF ASSIGNED!)              */}
      {/* ========================================================================= */}
      {isCtMenu && (
        <div className="space-y-6">
          {!me?.profile?.is_class_teacher ? (
            <div className="card p-8 text-center text-slate-500 dark:text-slate-400 space-y-2 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
              <IconLock size={32} className="mx-auto text-amber-600 dark:text-amber-400" />
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Class Teacher Access Restricted</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                You are not currently assigned as a Class Teacher for any academic section. This section is strictly reserved for appointed Class Teachers.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Class Teacher Header */}
              <div className="card bg-gradient-to-r from-indigo-500/10 via-indigo-500/5 to-transparent border-indigo-200 dark:border-indigo-900/60 p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <IconGraduationCap size={22} className="text-indigo-600 dark:text-indigo-400" />
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                        Class Teacher Workspace
                      </h2>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      Assigned Class:{' '}
                      <b className="text-slate-900 dark:text-slate-200">
                        {ctClasses.map(c => `${c.department_code} Sem ${c.semester} (Sec ${c.section}) [${c.academic_year}]`).join(', ')}
                      </b>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shadow-2xs">
                      {totalPendingReviews} Verifications Pending
                    </span>
                  </div>
                </div>

                {/* Sub-Tabs for Class Teacher */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs font-semibold">
                  <button
                    onClick={() => setActiveTab('ct_students')}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
                      activeTab === 'ct_students'
                        ? 'bg-indigo-600 text-white shadow-xs font-bold'
                        : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700'
                    }`}
                  >
                    <IconUsers size={14} />
                    <span>Section Students Roster ({ctStudents.length})</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('ct_academics')}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
                      activeTab === 'ct_academics'
                        ? 'bg-indigo-600 text-white shadow-xs font-bold'
                        : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700'
                    }`}
                  >
                    <IconFileText size={14} />
                    <span>Academic Verification Queue ({totalPendingReviews} Pending)</span>
                  </button>
                </div>
              </div>

              {/* SUB-VIEW 3A: COMPLETE SECTION STUDENTS ROSTER */}
              {activeTab === 'ct_students' && (
                <div className="card space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                        Complete Student Roster for Assigned Section
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Official student roster assigned under your Class Teacher academic mentorship.
                      </p>
                    </div>
                    <div className="relative w-full sm:w-64">
                      <IconSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        className="input input-icon-left py-1.5 text-xs"
                        style={{ paddingLeft: '2.5rem' }}
                        placeholder="Search student, USN, or email..."
                        value={ctStudentSearch}
                        onChange={e => setCtStudentSearch(e.target.value)}
                      />
                    </div>
                  </div>

                  {filteredCtStudents.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-xs">
                      No student records found in your assigned section roster.
                    </div>
                  ) : (
                    <div className="table-container max-h-[500px] overflow-y-auto">
                      <table className="table-enterprise">
                        <thead>
                          <tr>
                            <th>USN</th>
                            <th>Student Full Name</th>
                            <th>Institutional Email</th>
                            <th>Class / Section</th>
                            <th>Joining Year</th>
                            <th className="text-right">Verification Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredCtStudents.map((s: any) => (
                            <tr key={s.user_id}>
                              <td className="font-mono font-bold text-slate-800 dark:text-purple-300">{s.usn}</td>
                              <td className="font-semibold text-slate-900 dark:text-white">{s.full_name}</td>
                              <td className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">{s.email}</td>
                              <td className="font-medium text-slate-700 dark:text-slate-300">
                                {s.department} · Sem {s.semester} ({s.section})
                              </td>
                              <td className="text-slate-500 dark:text-slate-400">{s.joining_year || '—'}</td>
                              <td className="text-right">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                  Verified Student
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* SUB-VIEW 3B: ACADEMIC VERIFICATION QUEUE (APPROVALS NEEDED) */}
              {activeTab === 'ct_academics' && (
                <div className="space-y-6">
                  {/* Internships Queue */}
                  <div className="card space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                      <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                        <IconBriefcase size={16} className="text-teal-600 dark:text-purple-400" />
                        <span>Student Internship Submissions ({ctReviews?.internships?.length || 0})</span>
                      </h3>
                      <span className="px-3 py-1 rounded-full text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 shadow-2xs">
                        {pendingInternships.length} Pending Approval
                      </span>
                    </div>

                    {(!ctReviews?.internships || ctReviews.internships.length === 0) ? (
                      <p className="text-xs text-slate-400 dark:text-slate-500 py-6 text-center">No student internship records submitted for this section.</p>
                    ) : (
                      <div className="table-container">
                        <table className="table-enterprise">
                          <thead>
                            <tr>
                              <th>Student</th>
                              <th>Class</th>
                              <th>Company / Domain</th>
                              <th>Dates</th>
                              <th>Status</th>
                              <th className="text-right">Review Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ctReviews.internships.map((i: any) => (
                              <tr key={i.id}>
                                <td>
                                  <span className="font-bold text-slate-900 dark:text-white block">{i.name}</span>
                                  <span className="text-slate-400 dark:text-slate-500 font-mono text-[11px]">{i.usn}</span>
                                </td>
                                <td className="text-slate-700 dark:text-slate-300 font-medium">
                                  {i.department} · Sem {i.semester} ({i.section})
                                </td>
                                <td>
                                  <span className="font-semibold text-slate-800 dark:text-slate-200 block">{i.company}</span>
                                  <span className="text-slate-500 dark:text-slate-400">{i.role || 'Intern'}</span>
                                </td>
                                <td className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">{i.start_date || '—'} → {i.end_date || '—'}</td>
                                <td>
                                  <span className={`badge ${
                                    i.status === 'VERIFIED'
                                      ? 'badge-success'
                                      : i.status === 'REJECTED'
                                        ? 'badge-danger'
                                        : 'badge-warning'
                                  }`}>
                                    {i.status}
                                  </span>
                                </td>
                                <td className="text-right">
                                  <button
                                    onClick={() => {
                                      setReviewRecord(i)
                                      setReviewType('internship')
                                      setReviewStatus(i.status === 'PENDING_REVIEW' ? 'VERIFIED' : i.status)
                                      setEvidenceInspected(Boolean(i.evidence_inspected))
                                      setReviewNotes('')
                                    }}
                                    className="btn-outline btn-sm text-xs flex items-center gap-1.5 ml-auto"
                                  >
                                    <IconEdit size={13} />
                                    <span>{i.status === 'PENDING_REVIEW' ? 'Review & Verify' : 'View / Edit'}</span>
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* External Events Queue */}
                  <div className="card space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                      <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                        <IconAward size={16} className="text-indigo-600 dark:text-indigo-400" />
                        <span>External Event Participation Submissions ({ctReviews?.external_events?.length || 0})</span>
                      </h3>
                      <span className="px-3 py-1 rounded-full text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 shadow-2xs">
                        {pendingExternal.length} Pending Approval
                      </span>
                    </div>

                    {(!ctReviews?.external_events || ctReviews.external_events.length === 0) ? (
                      <p className="text-xs text-slate-400 dark:text-slate-500 py-6 text-center">No external event records submitted for this section.</p>
                    ) : (
                      <div className="table-container">
                        <table className="table-enterprise">
                          <thead>
                            <tr>
                              <th>Student</th>
                              <th>Class</th>
                              <th>Event & Organization</th>
                              <th>Achievement</th>
                              <th>Status</th>
                              <th className="text-right">Review Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ctReviews.external_events.map((e: any) => (
                              <tr key={e.id}>
                                <td>
                                  <span className="font-bold text-slate-900 dark:text-white block">{e.name}</span>
                                  <span className="text-slate-400 dark:text-slate-500 font-mono text-[11px]">{e.usn}</span>
                                </td>
                                <td className="text-slate-700 dark:text-slate-300 font-medium">
                                  {e.department} · Sem {e.semester} ({e.section})
                                </td>
                                <td>
                                  <span className="font-semibold text-slate-800 dark:text-slate-200 block">{e.event_name}</span>
                                  <span className="text-slate-500 dark:text-slate-400">{e.organization || 'External'}</span>
                                </td>
                                <td className="font-medium text-indigo-700 dark:text-indigo-400">{e.achievement || 'Participation'}</td>
                                <td>
                                  <span className={`badge ${
                                    e.status === 'VERIFIED'
                                      ? 'badge-success'
                                      : e.status === 'REJECTED'
                                        ? 'badge-danger'
                                        : 'badge-warning'
                                  }`}>
                                    {e.status}
                                  </span>
                                </td>
                                <td className="text-right">
                                  <button
                                    onClick={() => {
                                      setReviewRecord(e)
                                      setReviewType('external')
                                      setReviewStatus(e.status === 'PENDING_REVIEW' ? 'VERIFIED' : e.status)
                                      setEvidenceInspected(Boolean(e.evidence_inspected))
                                      setReviewNotes('')
                                    }}
                                    className="btn-outline btn-sm text-xs flex items-center gap-1.5 ml-auto"
                                  >
                                    <IconEdit size={13} />
                                    <span>{e.status === 'PENDING_REVIEW' ? 'Review & Verify' : 'View / Edit'}</span>
                                  </button>
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
            </div>
          )}
        </div>
      )}


      {/* ========================================================================= */}
      {/* 4. FACULTY PROFILE CUSTOMIZATION & SECURITY                               */}
      {/* ========================================================================= */}
      {activeTab === 'security' && (
        <div className="space-y-6 max-w-3xl mx-auto">
          {/* Institutional Faculty Record (Non-Editable) */}
          <div className="card space-y-4 p-6 border-slate-200 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <IconShield size={18} className="text-teal-600 dark:text-teal-400" />
                  <span>Institutional Faculty Identity</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Official college faculty credentials issued by Vidyavardhaka College of Engineering.
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
                  <span>Faculty Full Name</span>
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
                  <span>Department</span>
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
                  <span>Designation / Role</span>
                  <IconLock size={11} className="text-slate-400" />
                </label>
                <input
                  className="input bg-slate-100 dark:bg-slate-800/60 font-semibold cursor-not-allowed opacity-85"
                  value={me?.profile?.designation || 'Faculty Member'}
                  disabled
                  readOnly
                />
              </div>

              <div>
                <label className="label flex items-center justify-between">
                  <span>Official College Email</span>
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
                <b>Academic Registry Policy:</b> Faculty legal name, academic department, and official institutional designation are managed directly by College Administration.
              </span>
            </div>
          </div>

          {/* Profile Picture & Academic Bio Quote */}
          <div className="card space-y-4 p-6 border-slate-200 dark:border-slate-800">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <IconUser size={18} className="text-teal-600 dark:text-teal-400" />
                <span>Profile Customization</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Customize your faculty avatar picture and academic research quote.
              </p>
            </div>

            <form onSubmit={handleSaveFacultyProfile} className="space-y-4 text-xs">
              <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60">
                <div className="shrink-0 text-center">
                  <div className="w-20 h-20 rounded-full mx-auto overflow-hidden bg-slate-200 dark:bg-slate-700 border-2 border-teal-500 flex items-center justify-center text-slate-600 dark:text-slate-200 font-extrabold text-2xl shadow-sm">
                    {facultyProfileForm.avatar_url ? (
                      <img
                        src={facultyProfileForm.avatar_url}
                        alt="Profile Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                      />
                    ) : (
                      <span>{me?.profile?.full_name?.[0] || 'F'}</span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block font-mono">Avatar Preview</span>
                </div>

                <div className="flex-1 w-full">
                  <ImageFileUpload
                    label="Faculty Photo / Avatar (PNG, JPG)"
                    value={facultyProfileForm.avatar_url}
                    onChange={url => setFacultyProfileForm({ ...facultyProfileForm, avatar_url: url })}
                    accept="image/*"
                    placeholder="Click or drag to upload faculty portrait"
                    helperText="Upload your official portrait picture or enter an image URL directly."
                  />
                </div>
              </div>

              <div>
                <label className="label">Academic Quote / Research Motto / Short Bio</label>
                <textarea
                  className="input"
                  rows={2}
                  maxLength={500}
                  placeholder="e.g. Dedicated to mentoring tomorrow's engineers and fostering innovation."
                  value={facultyProfileForm.quote}
                  onChange={e => setFacultyProfileForm({ ...facultyProfileForm, quote: e.target.value })}
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={savingFacultyProfile}
                  className="btn btn-primary px-4 py-2 text-xs font-semibold"
                >
                  {savingFacultyProfile ? 'Saving Changes…' : 'Save Profile Customization'}
                </button>
              </div>
            </form>
          </div>

          {/* Change Password */}
          <div className="card space-y-4 p-6 border-slate-200 dark:border-slate-800">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <IconLock size={18} className="text-teal-600 dark:text-teal-400" />
                <span>Change Faculty Password</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Update your login password to ensure institutional account security.
              </p>
            </div>

            <form onSubmit={handleFacultyPasswordChange} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Current Password *</label>
                  <input
                    type="password"
                    className="input"
                    value={facultyOldPassword}
                    onChange={e => setFacultyOldPassword(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="label">New Permanent Password *</label>
                  <input
                    type="password"
                    className="input"
                    placeholder="At least 8 characters"
                    value={facultyNewPassword}
                    onChange={e => setFacultyNewPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="btn btn-primary px-4 py-2 text-xs font-semibold"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Academic Review Action Modal */}
      {reviewRecord && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="card w-full max-w-lg shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">
                  Review {reviewType === 'internship' ? 'Internship' : 'External Event'} Submission
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Student: <b>{reviewRecord.name}</b> ({reviewRecord.usn})</p>
              </div>
              <button onClick={() => setReviewRecord(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <IconX size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-3.5">
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg text-xs space-y-1">
                {reviewType === 'internship' ? (
                  <>
                    <p><b className="text-slate-900 dark:text-white">Company:</b> {reviewRecord.company}</p>
                    <p><b className="text-slate-900 dark:text-white">Role:</b> {reviewRecord.role || '—'}</p>
                    <p><b className="text-slate-900 dark:text-white">Dates:</b> {reviewRecord.start_date} to {reviewRecord.end_date}</p>
                    <p><b className="text-slate-900 dark:text-white">Description:</b> {reviewRecord.description || '—'}</p>
                  </>
                ) : (
                  <>
                    <p><b className="text-slate-900 dark:text-white">Event:</b> {reviewRecord.event_name}</p>
                    <p><b className="text-slate-900 dark:text-white">Organization:</b> {reviewRecord.organization}</p>
                    <p><b className="text-slate-900 dark:text-white">Achievement:</b> {reviewRecord.achievement || 'Participation'}</p>
                    <p><b className="text-slate-900 dark:text-white">Date:</b> {reviewRecord.event_date || '—'}</p>
                  </>
                )}
              </div>

              <div>
                <label className="label">Verification Decision *</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['VERIFIED', 'ON_HOLD', 'REJECTED'] as const).map(st => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setReviewStatus(st)}
                      className={`py-2 text-xs font-bold rounded-lg border text-center transition-all ${
                        reviewStatus === st
                          ? st === 'VERIFIED'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                            : st === 'ON_HOLD'
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                              : 'bg-rose-600 text-white border-rose-600 shadow-sm'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-xl">
                <label className="flex items-center gap-2 text-xs font-semibold text-indigo-900 dark:text-indigo-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={evidenceInspected}
                    onChange={e => setEvidenceInspected(e.target.checked)}
                  />
                  <span>Physical certificate / proof inspected and confirmed</span>
                </label>
              </div>

              <div>
                <label className="label">Class Teacher Review Notes</label>
                <textarea
                  className="input text-xs"
                  rows={3}
                  placeholder="Feedback, conditions, or verification remarks..."
                  value={reviewNotes}
                  onChange={e => setReviewNotes(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button type="button" onClick={() => setReviewRecord(null)} className="btn-secondary text-xs">
                  Cancel
                </button>
                <button type="submit" className="btn-primary text-xs">
                  Submit Verification Decision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Event Deletion Confirmation Modal */}
      {eventToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="card-antigravity max-w-md w-full p-6 space-y-4 rounded-3xl bg-white dark:bg-[#0E1017] border border-border-default shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 flex items-center justify-center mx-auto">
              <IconTrash size={24} />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Delete Event?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Are you sure you want to permanently delete <b className="text-slate-800 dark:text-slate-200">"{eventToDelete.name}"</b>?
                This will permanently purge all registrations, form submissions, teams, attendance records, and leadership appointments.
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setEventToDelete(null)}
                disabled={deletingEvent}
                className="btn btn-secondary flex-1 py-2 text-xs font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteEvent}
                disabled={deletingEvent}
                className="btn bg-rose-600 hover:bg-rose-700 text-white flex-1 py-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 shadow-sm active:scale-98"
              >
                {deletingEvent ? <span>Deleting...</span> : <span>Delete Event</span>}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
