import React, { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { api } from '../api'
import { BackButton } from '../components/ui/BackButton'
import {
  IconDashboard,
  IconUsers,
  IconUser,
  IconUpload,
  IconBuilding,
  IconFileText,
  IconPlus,
  IconSearch,
  IconCheckCircle,
  IconAlertTriangle,
  IconClock,
  IconShield,
  IconLock,
  IconGraduationCap,
  IconDownload,
  IconEye,
  IconCopy,
  IconX,
} from '../components/ui/Icons'
import ImageFileUpload from '../components/ui/ImageFileUpload'

type Tab = 'overview' | 'accounts' | 'academic' | 'provision' | 'bulk' | 'governance' | 'profile' | 'audit'

export default function AuthorityDashboard({ initialTab }: { initialTab?: Tab }) {
  const location = useLocation()
  const determineInitialTab = (): Tab => {
    if (initialTab) return initialTab
    const path = location.pathname.toLowerCase()
    if (path.includes('student') || path.includes('faculty') || path.includes('account')) return 'accounts'
    if (path.includes('bulk')) return 'bulk'
    if (path.includes('provision')) return 'provision'
    if (path.includes('academic') || path.includes('semester') || path.includes('settings')) return 'academic'
    if (path.includes('department') || path.includes('hod') || path.includes('class-teacher') || path.includes('section')) return 'governance'
    if (path.includes('profile') || path.includes('security')) return 'profile'
    if (path.includes('audit')) return 'audit'
    return 'overview'
  }
  const [activeTab, setActiveTab] = useState<Tab>(determineInitialTab)
  const [dash, setDash] = useState<any>(null)
  const [accounts, setAccounts] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [governance, setGovernance] = useState<any>({ hods: [], class_teachers: [] })
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Credentials visibility in accounts directory
  const [showPasswords, setShowPasswords] = useState<Record<number, boolean>>({})

  // Authority Personal Profile & Security State
  const [me, setMe] = useState<any>(null)
  const [authProfileForm, setAuthProfileForm] = useState({
    avatar_url: '',
    quote: '',
  })
  const [savingAuthProfile, setSavingAuthProfile] = useState(false)
  const [authOldPassword, setAuthOldPassword] = useState('')
  const [authNewPassword, setAuthNewPassword] = useState('')

  // Academic Settings & Semester Automation State
  const [academicData, setAcademicData] = useState<any>(null)
  const [academicForm, setAcademicForm] = useState({
    odd_sem_promotion_month: 8,
    even_sem_promotion_month: 2,
    auto_promotion_enabled: true,
    current_academic_year: '2025-26',
  })
  const [promoteForm, setPromoteForm] = useState({
    batch_year: '',
    from_semester: '',
    increment: 1,
    max_semester: 8,
  })
  const [promoting, setPromoting] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [promotionResult, setPromotionResult] = useState<any>(null)

  // Demo & Testing dataset management
  const [demoStatus, setDemoStatus] = useState<any>(null)
  const [demoLoading, setDemoLoading] = useState(false)
  const [demoActionMsg, setDemoActionMsg] = useState('')

  // Filters for accounts directory
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // Single provision form
  const [provisionType, setProvisionType] = useState<'STUDENT' | 'FACULTY'>('STUDENT')
  const [studentForm, setStudentForm] = useState({
    full_name: '', usn: '', email: '', branch: 'CSE',
    joining_year: 2024, semester: 1, section: 'A'
  })
  const [facultyForm, setFacultyForm] = useState({
    full_name: '', email: '', branch: 'CSE', designation: 'Assistant Professor'
  })
  const [createdCreds, setCreatedCreds] = useState<any>(null)

  // Edit account modal
  const [selectedAccount, setSelectedAccount] = useState<any>(null)
  const [editForm, setEditForm] = useState<any>({})

  // Bulk import state
  const [bulkKind, setBulkKind] = useState<'STUDENT' | 'FACULTY'>('STUDENT')
  const [bulkFile, setBulkFile] = useState<File | null>(null)
  const [bulkResult, setBulkResult] = useState<any>(null)
  const [bulkUploading, setBulkUploading] = useState(false)

  // Governance modals
  const [hodModal, setHodModal] = useState<number | null>(null)
  const [selectedFacultyForHod, setSelectedFacultyForHod] = useState('')
  const [ctModal, setCtModal] = useState<number | null>(null)
  const [ctForm, setCtForm] = useState({
    semester: 1, section: 'A', academic_year: '2025-26', faculty_user_id: ''
  })

  useEffect(() => {
    setActiveTab(determineInitialTab())
  }, [location.pathname, initialTab])

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    setError('')
    try {
      const [d, a, depts, gov, aud, acad, myProfile, demoSt] = await Promise.all([
        api.get('/authority/dashboard'),
        api.get('/authority/accounts'),
        api.get('/authority/departments'),
        api.get('/authority/governance'),
        api.get('/authority/audit?limit=150'),
        api.get('/authority/academic-settings').catch(() => null),
        api.get('/authority/auth/me').catch(() => null),
        api.getDemoStatus().catch(() => null),
      ])
      setDash(d)
      setAccounts(a)
      setDepartments(depts)
      setGovernance(gov)
      setAuditLogs(aud)
      if (demoSt) {
        setDemoStatus(demoSt)
      }
      if (acad) {
        setAcademicData(acad)
        if (acad.settings) {
          setAcademicForm(acad.settings)
        }
      }
      if (myProfile) {
        setMe(myProfile)
        setAuthProfileForm({
          avatar_url: myProfile.profile?.avatar_url || '',
          quote: myProfile.profile?.quote || '',
        })
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  async function handlePurgeDemoData() {
    if (!window.confirm("⚠️ WARNING: This will permanently delete all seeded test events, dynamic forms, leadership appointments, and demo accounts created for testing.\n\nAny real institutional accounts or events created by you will remain intact.\n\nAre you sure you want to purge all demo data?")) {
      return
    }
    setDemoLoading(true)
    setDemoActionMsg('')
    try {
      const res = await api.purgeDemoData()
      setDemoActionMsg(`✅ ${res.message || 'Demo testing data purged successfully.'}`)
      await loadAll()
    } catch (err: any) {
      setDemoActionMsg(`❌ Error: ${err.message}`)
    } finally {
      setDemoLoading(false)
    }
  }

  async function handleReseedDemoData() {
    if (!window.confirm("🌱 Re-seed the realistic VVCE demo dataset with events, forms, and test accounts?")) {
      return
    }
    setDemoLoading(true)
    setDemoActionMsg('')
    try {
      const res = await api.reseedDemoData()
      setDemoActionMsg(`✅ ${res.message || 'Demo testing data re-seeded successfully.'}`)
      await loadAll()
    } catch (err: any) {
      setDemoActionMsg(`❌ Error: ${err.message}`)
    } finally {
      setDemoLoading(false)
    }
  }

  async function handleSaveAuthProfile(e: React.FormEvent) {
    e.preventDefault()
    setSavingAuthProfile(true)
    setError(''); setSuccess('')
    try {
      await api.patch('/authority/auth/profile', {
        avatar_url: authProfileForm.avatar_url,
        quote: authProfileForm.quote,
      })
      setSuccess('Authority profile customization saved!')
      const updated = await api.get('/authority/auth/me')
      setMe(updated)
    } catch (err: any) {
      setError(err.message || 'Failed to update profile')
    } finally {
      setSavingAuthProfile(false)
    }
  }

  async function handleAuthPasswordChange(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setSuccess('')
    try {
      await api.post('/auth/change-password', {
        old_password: authOldPassword,
        new_password: authNewPassword,
      })
      setSuccess('Authority password updated successfully')
      setAuthOldPassword('')
      setAuthNewPassword('')
    } catch (err: any) {
      setError(err.message || 'Failed to update password')
    }
  }

  async function loadAcademicData() {
    try {
      const acad = await api.get('/authority/academic-settings')
      setAcademicData(acad)
      if (acad.settings) {
        setAcademicForm(acad.settings)
      }
    } catch (e: any) {
      console.error(e)
    }
  }

  async function handleSaveAcademicSettings(e: React.FormEvent) {
    e.preventDefault()
    setSavingSettings(true)
    setError(''); setSuccess('')
    try {
      await api.post('/authority/academic-settings', academicForm)
      setSuccess('Academic settings updated successfully')
      loadAcademicData()
    } catch (err: any) {
      setError(err.message || 'Failed to update academic settings')
    } finally {
      setSavingSettings(false)
    }
  }

  async function handleExecuteBatchPromotion() {
    if (!confirm('Are you sure you want to promote students? This will advance the semester for all matching students.')) {
      return
    }
    setPromoting(true)
    setError(''); setSuccess(''); setPromotionResult(null)
    try {
      const body: any = {
        increment: Number(promoteForm.increment) || 1,
        max_semester: Number(promoteForm.max_semester) || 8,
      }
      if (promoteForm.batch_year) body.batch_year = Number(promoteForm.batch_year)
      if (promoteForm.from_semester) body.from_semester = Number(promoteForm.from_semester)

      const res = await api.post('/authority/students/promote-semester', body)
      setPromotionResult(res)
      setSuccess(res.message || 'Batch semester promotion completed!')
      loadAll()
      loadAcademicData()
    } catch (err: any) {
      setError(err.message || 'Promotion failed')
    } finally {
      setPromoting(false)
    }
  }

  // Account actions
  async function handleSuspend(id: number) {
    if (!confirm('Suspend this account?')) return
    try {
      await api.post(`/authority/accounts/${id}/suspend`)
      setSuccess('Account suspended successfully')
      loadAll()
    } catch (err: any) { setError(err.message) }
  }

  async function handleReactivate(id: number) {
    try {
      await api.post(`/authority/accounts/${id}/reactivate`)
      setSuccess('Account reactivated successfully')
      loadAll()
    } catch (err: any) { setError(err.message) }
  }

  async function handleRevoke(id: number) {
    if (!confirm('REVOKE this account? The user will permanently lose access.')) return
    try {
      await api.post(`/authority/accounts/${id}/revoke`)
      setSuccess('Account revoked successfully')
      loadAll()
    } catch (err: any) { setError(err.message) }
  }

  async function handlePasswordReset(id: number) {
    try {
      const r = await api.post(`/authority/accounts/${id}/password-reset`)
      setCreatedCreds({ email: `User #${id}`, temporary_password: r.temporary_password })
      loadAll()
    } catch (err: any) { setError(err.message) }
  }

  async function handleSaveAccountEdit(e: React.FormEvent) {
    e.preventDefault()
    try {
      await api.patch(`/authority/accounts/${selectedAccount.id}`, editForm)
      setSuccess('Account details updated')
      setSelectedAccount(null)
      loadAll()
    } catch (err: any) { setError(err.message) }
  }

  // Single provision
  async function handleCreateStudent(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setSuccess('')
    try {
      const res = await api.post('/authority/students', studentForm)
      setCreatedCreds(res)
      setSuccess(`Student account provisioned for ${studentForm.email}`)
      setStudentForm({ full_name: '', usn: '', email: '', branch: 'CSE', joining_year: 2024, semester: 1, section: 'A' })
      loadAll()
    } catch (err: any) { setError(err.message) }
  }

  async function handleCreateFaculty(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setSuccess('')
    try {
      const res = await api.post('/authority/faculty', facultyForm)
      setCreatedCreds(res)
      setSuccess(`Faculty account provisioned for ${facultyForm.email}`)
      setFacultyForm({ full_name: '', email: '', branch: 'CSE', designation: 'Assistant Professor' })
      loadAll()
    } catch (err: any) { setError(err.message) }
  }

  // Bulk import
  async function handleBulkImportSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!bulkFile) return
    setBulkUploading(true)
    setError(''); setSuccess(''); setBulkResult(null)

    try {
      const formData = new FormData()
      formData.append('file', bulkFile)
      const res = await api.postForm(`/authority/bulk-import?kind=${bulkKind}`, formData)
      setBulkResult(res)
      if (res.ok) {
        setSuccess(`Bulk import complete: ${res.created} ${bulkKind.toLowerCase()} accounts created.`)
        loadAll()
      } else {
        setError(`Bulk import had ${res.errors?.length || 0} validation errors. Correct the rows and retry.`)
      }
    } catch (err: any) {
      setError(err.message || 'Bulk import failed')
    } finally {
      setBulkUploading(false)
    }
  }

  // Governance
  async function handleAssignHod(deptId: number) {
    if (!selectedFacultyForHod) return
    try {
      await api.post(`/authority/hod?department_id=${deptId}&faculty_user_id=${selectedFacultyForHod}`)
      setSuccess('HOD assigned successfully')
      setHodModal(null)
      loadAll()
    } catch (err: any) { setError(err.message) }
  }

  async function handleAssignCt(deptId: number) {
    if (!ctForm.faculty_user_id) return
    try {
      await api.post(`/authority/class-teacher?department_id=${deptId}&semester=${ctForm.semester}&section=${ctForm.section}&academic_year=${ctForm.academic_year}&faculty_user_id=${ctForm.faculty_user_id}`)
      setSuccess('Class Teacher assigned successfully')
      setCtModal(null)
      loadAll()
    } catch (err: any) { setError(err.message) }
  }

  async function handleRevokeCt(ctId: number) {
    if (!confirm('Revoke this Class Teacher assignment?')) return
    try {
      await api.del(`/authority/class-teacher/${ctId}`)
      setSuccess('Class Teacher assignment revoked')
      loadAll()
    } catch (err: any) { setError(err.message) }
  }

  // Filtered accounts
  const filteredAccounts = accounts.filter(acc => {
    const matchesQ = !searchQuery ||
      acc.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (acc.name && acc.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (acc.usn && acc.usn.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesRole = !roleFilter || acc.type === roleFilter
    const matchesStatus = !statusFilter || acc.status === statusFilter
    return matchesQ && matchesRole && matchesStatus
  })

  return (
    <div className="space-y-6">
      {/* Top Left Come Back Navigation when on sub-menus or child pages */}
      {activeTab !== 'overview' && (
        <div className="flex items-center justify-between">
          <BackButton
            to="/authority/dashboard"
            label="Come Back to Authority Overview"
            size="sm"
            variant="outline"
            className="shadow-2xs font-semibold"
          />
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="badge badge-authority">Institutional Administration</span>
            <span className="text-xs text-slate-400 font-mono">VVCE Mysore</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">
            Authority Command Center
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Institutional governance, account lifecycle provisioning, and compliance audit trail
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => { setActiveTab('provision'); setCreatedCreds(null); }}
            className="btn btn-primary btn-sm"
          >
            <IconPlus size={15} />
            <span>Provision Account</span>
          </button>
          <button
            onClick={() => setActiveTab('bulk')}
            className="btn btn-secondary btn-sm"
          >
            <IconUpload size={15} />
            <span>Bulk CSV Import</span>
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IconAlertTriangle size={18} className="text-rose-600 dark:text-rose-400" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-rose-500 hover:text-rose-700">✕</button>
        </div>
      )}
      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IconCheckCircle size={18} className="text-emerald-600 dark:text-emerald-400" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess('')} className="text-emerald-500 hover:text-emerald-700">✕</button>
        </div>
      )}

      {/* Credentials Banner when an account is created/reset */}
      {createdCreds && (
        <div className="card bg-amber-50/80 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 p-5">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-bold text-amber-900 dark:text-amber-200 text-sm flex items-center gap-2">
                <IconLock size={16} />
                <span>Initial Credentials Issued</span>
              </h3>
              <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">
                Provide these temporary credentials directly to the student/faculty member. Password change is enforced on first sign-in.
              </p>
              <div className="mt-3 grid sm:grid-cols-2 gap-3 text-sm bg-white dark:bg-slate-900 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
                <div>
                  <span className="text-xs text-slate-400 block">Account:</span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{createdCreds.email}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">Temporary Password:</span>
                  <span className="font-mono font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                    {createdCreds.temporary_password}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setCreatedCreds(null)}
              className="text-amber-700 dark:text-amber-400 hover:underline text-xs font-semibold ml-4"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex overflow-x-auto border-b border-[var(--border-color)] bg-[var(--bg-surface)] rounded-xl p-1 shadow-xs gap-1">
        {[
          { id: 'overview', label: 'Overview', icon: <IconDashboard size={15} /> },
          { id: 'accounts', label: `Accounts Directory (${accounts.length})`, icon: <IconUsers size={15} /> },
          { id: 'academic', label: 'Academic & Semester Automation', icon: <IconGraduationCap size={15} /> },
          { id: 'provision', label: 'Single Provisioning', icon: <IconUser size={15} /> },
          { id: 'bulk', label: 'Bulk CSV Import', icon: <IconUpload size={15} /> },
          { id: 'governance', label: 'Departments & Governance', icon: <IconBuilding size={15} /> },
          { id: 'profile', label: 'Admin Profile & Security', icon: <IconLock size={15} /> },
          { id: 'audit', label: `Audit Log (${auditLogs.length})`, icon: <IconFileText size={15} /> },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as Tab)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all shrink-0 ${
              activeTab === t.id
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && dash && (
        <div className="space-y-6">
          {/* Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card-antigravity border-l-4 border-l-blue-600 space-y-1">
              <span className="text-label text-slate-500 dark:text-slate-400 uppercase font-semibold">Total Students</span>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-50 tabular-nums">{dash.total_students}</p>
              <span className="text-metadata text-slate-400 block">Enrolled undergraduates</span>
            </div>
            <div className="card-antigravity border-l-4 border-l-teal-500 space-y-1">
              <span className="text-label text-slate-500 dark:text-slate-400 uppercase font-semibold">Total Faculty</span>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-50 tabular-nums">{dash.total_faculty}</p>
              <span className="text-metadata text-slate-400 block">Professors & HODs</span>
            </div>
            <div className="card-antigravity border-l-4 border-l-emerald-500 space-y-1">
              <span className="text-label text-slate-500 dark:text-slate-400 uppercase font-semibold">Active Accounts</span>
              <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">{dash.active_accounts}</p>
              <span className="text-metadata text-slate-400 block">Authorized active sessions</span>
            </div>
            <div className="card-antigravity border-l-4 border-l-rose-500 space-y-1">
              <span className="text-label text-slate-500 dark:text-slate-400 uppercase font-semibold">Suspended / Revoked</span>
              <p className="text-2xl sm:text-3xl font-extrabold text-rose-600 dark:text-rose-400 tabular-nums">{dash.suspended_accounts}</p>
              <span className="text-metadata text-slate-400 block">Deactivated access</span>
            </div>
          </div>

          {/* Department Breakdown */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-4 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <IconGraduationCap size={16} className="text-blue-600 dark:text-blue-400" />
                  <span>Students by Department</span>
                </span>
                <span className="text-xs text-slate-400 font-normal">7 branches</span>
              </h3>
              <div className="space-y-3">
                {Object.entries(dash.dept_students || {}).map(([dept, count]: any) => (
                  <div key={dept} className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 w-16">{dept}</span>
                    <div className="flex-1 mx-3 bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-blue-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, ((count as number) / (dash.total_students || 1)) * 100 * 3)}%` }}
                      ></div>
                    </div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 w-8 text-right tabular-nums">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-4 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <IconUsers size={16} className="text-teal-600 dark:text-teal-400" />
                  <span>Faculty by Department</span>
                </span>
                <span className="text-xs text-slate-400 font-normal">Academic Staff</span>
              </h3>
              <div className="space-y-3">
                {Object.entries(dash.dept_faculty || {}).map(([dept, count]: any) => (
                  <div key={dept} className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 w-16">{dept}</span>
                    <div className="flex-1 mx-3 bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-teal-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, ((count as number) / (dash.total_faculty || 1)) * 100 * 3)}%` }}
                      ></div>
                    </div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 w-8 text-right tabular-nums">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recently Provisioned Accounts */}
          <div className="card space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                <IconClock size={16} className="text-slate-500" />
                <span>Recently Provisioned Accounts</span>
              </h3>
              <button
                type="button"
                onClick={() => setActiveTab('accounts')}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                View all accounts →
              </button>
            </div>
            <div className="table-container">
              <table className="table-enterprise">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th className="text-right">Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {(dash.recent_accounts || []).slice(0, 6).map((a: any) => (
                    <tr key={a.email}>
                      <td className="font-mono font-medium text-slate-800 dark:text-slate-200">{a.email}</td>
                      <td>
                        <span className={`badge ${a.type === 'STUDENT' ? 'badge-student' : 'badge-faculty'}`}>
                          {a.type}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${a.status === 'ACTIVE' ? 'badge-success' : 'badge-neutral'}`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="text-right text-xs text-slate-400 font-mono">
                        {new Date(a.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ACCOUNTS DIRECTORY */}
      {activeTab === 'accounts' && (
        <div className="card space-y-4">
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between pb-3 border-b border-[var(--border-color)]">
            <div className="relative w-full md:w-80">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <IconSearch size={15} />
              </div>
              <input
                className="input pl-9"
                placeholder="Search name, USN, or email..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <select
                className="input w-36"
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
              >
                <option value="">All Roles</option>
                <option value="STUDENT">Students</option>
                <option value="FACULTY">Faculty</option>
              </select>
              <select
                className="input w-36"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="PENDING_ACTIVATION">Pending Activation</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="REVOKED">Revoked</option>
              </select>
            </div>
          </div>

          <div className="table-container max-h-[580px] overflow-y-auto">
            <table className="table-enterprise">
              <thead>
                <tr>
                  <th>Name / USN</th>
                  <th>Email ID</th>
                  <th>Account Password</th>
                  <th>Dept</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No accounts matched your search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredAccounts.map(acc => (
                    <tr key={acc.id}>
                      <td>
                        <span className="font-semibold text-slate-900 dark:text-slate-100 block">{acc.name || '—'}</span>
                        {acc.usn && <span className="font-mono text-xs text-slate-400">{acc.usn}</span>}
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5 font-mono text-xs">
                          <span className="text-slate-800 dark:text-slate-200 select-all">{acc.email}</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(acc.email)
                              setSuccess(`Copied email ${acc.email} to clipboard!`)
                            }}
                            title="Copy email address"
                            className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <IconCopy size={13} />
                          </button>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5 font-mono text-xs">
                          <span className={showPasswords[acc.id] ? "font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800 select-all" : "text-slate-400 tracking-wider"}>
                            {showPasswords[acc.id] ? (acc.temp_password || (acc.account_type === 'STUDENT' ? 'StudentPass@123' : 'FacultyPass@123')) : '••••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowPasswords(prev => ({ ...prev, [acc.id]: !prev[acc.id] }))}
                            title={showPasswords[acc.id] ? "Hide password" : "Reveal password"}
                            className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <IconEye size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const pw = acc.temp_password || (acc.account_type === 'STUDENT' ? 'StudentPass@123' : 'FacultyPass@123')
                              navigator.clipboard.writeText(pw)
                              setSuccess(`Copied password for ${acc.email} to clipboard!`)
                            }}
                            title="Copy account password"
                            className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <IconCopy size={13} />
                          </button>
                        </div>
                      </td>
                      <td>{acc.department || '—'}</td>
                      <td>
                        <span className={`badge ${acc.account_type === 'STUDENT' ? 'badge-student' : 'badge-faculty'}`}>
                          {acc.account_type}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${
                          acc.status === 'ACTIVE'
                            ? 'badge-success'
                            : acc.status === 'SUSPENDED'
                              ? 'badge-danger'
                              : 'badge-warning'
                        }`}>
                          {acc.status}
                        </span>
                      </td>
                      <td className="text-right space-x-1.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => { setSelectedAccount(acc); setEditForm(acc); }}
                          className="btn btn-secondary btn-sm"
                        >
                          View & Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePasswordReset(acc.id)}
                          className="btn btn-outline btn-sm"
                        >
                          Reset PW
                        </button>
                        {acc.status === 'ACTIVE' ? (
                          <button
                            type="button"
                            onClick={() => handleSuspend(acc.id)}
                            className="btn btn-danger btn-sm"
                          >
                            Suspend
                          </button>
                        ) : acc.status === 'SUSPENDED' ? (
                          <button
                            type="button"
                            onClick={() => handleReactivate(acc.id)}
                            className="btn btn-success btn-sm"
                          >
                            Reactivate
                          </button>
                        ) : null}
                        {acc.status !== 'REVOKED' && (
                          <button
                            type="button"
                            onClick={() => handleRevoke(acc.id)}
                            className="btn btn-danger btn-sm"
                          >
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PROVISIONING */}
      {activeTab === 'provision' && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Provision Student */}
          <div className="card">
            <div className="flex items-center justify-between mb-4 border-b pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Provision Student Account</h3>
                <p className="text-xs text-slate-500">Generates activation credentials and binds student profile</p>
              </div>
              <span className="text-2xl">🎓</span>
            </div>
            <form onSubmit={handleCreateStudent} className="space-y-3.5">
              <div>
                <label className="label">Full Name *</label>
                <input
                  className="input"
                  placeholder="e.g. Rahul Sharma"
                  value={studentForm.full_name}
                  onChange={e => setStudentForm({ ...studentForm, full_name: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">USN *</label>
                  <input
                    className="input"
                    placeholder="1VV24CSE001"
                    value={studentForm.usn}
                    onChange={e => setStudentForm({ ...studentForm, usn: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="label">Department *</label>
                  <select
                    className="input"
                    value={studentForm.branch}
                    onChange={e => setStudentForm({ ...studentForm, branch: e.target.value })}
                  >
                    {['CSE', 'ISE', 'AIML', 'EC', 'EEE', 'ME', 'CV'].map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Institutional Email * (vvce{"{YY}{BRANCH}{NNNN}"}@vvce.ac.in)</label>
                <input
                  className="input"
                  type="email"
                  placeholder="vvce24cse0001@vvce.ac.in"
                  value={studentForm.email}
                  onChange={e => setStudentForm({ ...studentForm, email: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="label">Joining Year</label>
                  <input
                    className="input"
                    type="number"
                    value={studentForm.joining_year}
                    onChange={e => setStudentForm({ ...studentForm, joining_year: +e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Semester</label>
                  <select
                    className="input"
                    value={studentForm.semester}
                    onChange={e => setStudentForm({ ...studentForm, semester: +e.target.value })}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                      <option key={s} value={s}>Sem {s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Section</label>
                  <input
                    className="input"
                    value={studentForm.section}
                    onChange={e => setStudentForm({ ...studentForm, section: e.target.value })}
                  />
                </div>
              </div>
              <button type="submit" className="btn-primary w-full mt-2">
                Provision Student Account
              </button>
            </form>
          </div>

          {/* Provision Faculty */}
          <div className="card">
            <div className="flex items-center justify-between mb-4 border-b pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Provision Faculty Account</h3>
                <p className="text-xs text-slate-500">College-issued faculty account with department assignment</p>
              </div>
              <span className="text-2xl">👨‍🏫</span>
            </div>
            <form onSubmit={handleCreateFaculty} className="space-y-3.5">
              <div>
                <label className="label">Full Name *</label>
                <input
                  className="input"
                  placeholder="e.g. Dr. Priya Rao"
                  value={facultyForm.full_name}
                  onChange={e => setFacultyForm({ ...facultyForm, full_name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label">College Email * (@vvce.ac.in)</label>
                <input
                  className="input"
                  type="email"
                  placeholder="faccse06@vvce.ac.in"
                  value={facultyForm.email}
                  onChange={e => setFacultyForm({ ...facultyForm, email: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Department *</label>
                  <select
                    className="input"
                    value={facultyForm.branch}
                    onChange={e => setFacultyForm({ ...facultyForm, branch: e.target.value })}
                  >
                    {['CSE', 'ISE', 'AIML', 'EC', 'EEE', 'ME', 'CV'].map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Designation</label>
                  <input
                    className="input"
                    placeholder="Assistant Professor"
                    value={facultyForm.designation}
                    onChange={e => setFacultyForm({ ...facultyForm, designation: e.target.value })}
                  />
                </div>
              </div>
              <button type="submit" className="btn-primary w-full mt-6">
                Provision Faculty Account
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 4: BULK CSV IMPORT */}
      {activeTab === 'bulk' && (
        <div className="card space-y-6 max-w-3xl mx-auto">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Bulk CSV Provisioning</h2>
            <p className="text-xs text-slate-500 mt-1">
              Upload institutional CSV files. All-or-nothing transactional commit ensures zero partial corruptions.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex-1">
              <label className="label">Target Account Type</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="radio"
                    name="bulkKind"
                    checked={bulkKind === 'STUDENT'}
                    onChange={() => setBulkKind('STUDENT')}
                  />
                  Students
                </label>
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="radio"
                    name="bulkKind"
                    checked={bulkKind === 'FACULTY'}
                    onChange={() => setBulkKind('FACULTY')}
                  />
                  Faculty
                </label>
              </div>
            </div>
            <div>
              <button
                type="button"
                onClick={() => api.download(`/authority/accounts/import-template?kind=${bulkKind}`, `${bulkKind.toLowerCase()}_template.csv`)}
                className="btn btn-outline btn-sm"
              >
                <IconDownload size={14} />
                <span>Download {bulkKind} Template</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleBulkImportSubmit} className="space-y-4">
            <div>
              <label className="label">Select CSV File</label>
              <input
                type="file"
                accept=".csv"
                className="input file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
                onChange={e => setBulkFile(e.target.files?.[0] || null)}
                required
              />
            </div>

            <button
              type="submit"
              disabled={!bulkFile || bulkUploading}
              className="btn-primary w-full py-2.5"
            >
              {bulkUploading ? 'Validating & Importing…' : `Validate & Import ${bulkKind} Records`}
            </button>
          </form>

          {/* Bulk Import Results */}
          {bulkResult && (
            <div className="space-y-3 pt-3 border-t">
              <h3 className="font-bold text-sm text-slate-800">Import Verification Summary</h3>
              {bulkResult.ok ? (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
                  ✓ Successfully committed batch #{bulkResult.batch_id}: <b>{bulkResult.created}</b> accounts created.
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm space-y-2">
                  <p className="font-semibold">Import rejected due to {bulkResult.errors?.length || 0} validation errors:</p>
                  <div className="max-h-48 overflow-y-auto space-y-1 font-mono text-xs">
                    {bulkResult.errors?.map((err: any, idx: number) => (
                      <div key={idx} className="bg-white/70 p-2 rounded border border-rose-200">
                        Row {err.row}: {Array.isArray(err.errors) ? err.errors.join(', ') : JSON.stringify(err.errors)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: DEPARTMENTS & GOVERNANCE */}
      {activeTab === 'governance' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Departments & Academic Assignments</h2>
            <p className="text-xs text-slate-500">Configure Department HODs and Class Teacher assignments.</p>
          </div>

          {/* Department Cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.map(d => (
              <div key={d.code} className="card flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-extrabold text-lg text-slate-900 dark:text-purple-300">{d.code}</span>
                    <span className="badge badge-neutral text-[10px]">{d.student_count} Students · {d.faculty_count} Faculty</span>
                  </div>
                  <h4 className="font-medium text-slate-800 text-sm">{d.name}</h4>
                  <div className="mt-3 p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                    <span className="text-slate-400 block font-semibold text-[10px] uppercase">Head of Department (HOD):</span>
                    {d.hod ? (
                      <span className="font-bold text-slate-800">{d.hod.name} ({d.hod.email})</span>
                    ) : (
                      <span className="text-amber-700 font-semibold italic">Unassigned</span>
                    )}
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    Active Class Teachers: <b>{d.class_teacher_count}</b>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                  <button
                    onClick={() => { setHodModal(d.id); setSelectedFacultyForHod(''); }}
                    className="btn-outline btn-sm flex-1 text-center"
                  >
                    Assign HOD
                  </button>
                  <button
                    onClick={() => { setCtModal(d.id); setCtForm({ semester: 1, section: 'A', academic_year: '2025-26', faculty_user_id: '' }); }}
                    className="btn-secondary btn-sm flex-1 text-center"
                  >
                    + Assign CT
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Active Class Teachers Table */}
          <div className="card space-y-3">
            <h3 className="font-bold text-sm text-slate-900">Current Class Teacher Assignments</h3>
            <div className="overflow-x-auto max-h-72">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 uppercase">
                    <th className="pb-2">Department</th>
                    <th className="pb-2">Sem / Sec</th>
                    <th className="pb-2">Academic Year</th>
                    <th className="pb-2">Class Teacher</th>
                    <th className="pb-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(governance.class_teachers || []).map((ct: any) => (
                    <tr key={ct.id} className="hover:bg-slate-50">
                      <td className="py-2 font-semibold text-slate-800">{ct.department}</td>
                      <td className="py-2">Semester {ct.semester} · Section {ct.section}</td>
                      <td className="py-2 text-slate-500">{ct.academic_year}</td>
                      <td className="py-2 font-medium text-slate-800">{ct.faculty_name} ({ct.faculty_email})</td>
                      <td className="py-2 text-right">
                        <button
                          onClick={() => handleRevokeCt(ct.id)}
                          className="text-rose-600 hover:text-rose-800 font-semibold"
                        >
                          Revoke
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Evaluation & Testing Data Management Card */}
          <div className="card space-y-4 border-2 border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-r from-indigo-50/50 via-white to-purple-50/40 dark:from-indigo-950/20 dark:via-slate-900 dark:to-purple-950/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    Evaluation & Testing Data Management
                  </h3>
                  <span className="badge badge-primary text-[10px] font-mono">DEMO SEEDER</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Control seeded campus events and evaluation accounts. You can inspect all features with pre-populated events, and purge them whenever you are ready for real production usage.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleReseedDemoData}
                  disabled={demoLoading}
                  className="btn btn-secondary btn-sm text-xs font-semibold"
                >
                  🌱 Re-seed Demo Data
                </button>
                <button
                  type="button"
                  onClick={handlePurgeDemoData}
                  disabled={demoLoading}
                  className="btn btn-danger btn-sm text-xs font-bold shadow-xs hover:bg-rose-700"
                >
                  🗑️ Purge Test Data
                </button>
              </div>
            </div>

            {demoActionMsg && (
              <div className="p-3 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200">
                {demoActionMsg}
              </div>
            )}

            {demoStatus && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Status</span>
                  <span className={`font-bold ${demoStatus.is_demo_active ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
                    {demoStatus.is_demo_active ? '● Active in DB' : '○ Clean / Purged'}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Seeded Events</span>
                  <span className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">
                    {demoStatus.seeded_events_count} Events
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Seeded Accounts</span>
                  <span className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">
                    {demoStatus.seeded_users_count} Users
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Test Passwords</span>
                  <span className="font-mono text-purple-600 dark:text-purple-400 font-bold">
                    faculty123 / student123
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: ACADEMIC & SEMESTER AUTOMATION */}
      {activeTab === 'academic' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border-color)] pb-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                <IconGraduationCap size={20} className="text-purple-600 dark:text-purple-400" />
                <span>Academic Calendar & Semester Automation</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Configure automatic semester advancement schedules and execute manual batch cohort promotions.
              </p>
            </div>
            <button
              onClick={loadAcademicData}
              className="btn btn-secondary btn-sm self-start"
            >
              Refresh Distribution Data
            </button>
          </div>

          {/* Promotion Result Banner */}
          {promotionResult && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-sm space-y-1">
              <div className="font-bold flex items-center gap-2">
                <IconCheckCircle size={18} className="text-emerald-600 dark:text-emerald-400" />
                <span>Batch Promotion Executed Successfully</span>
              </div>
              <p className="text-xs text-emerald-800 dark:text-emerald-300">
                {promotionResult.promoted_count} students promoted to the next semester ({promotionResult.graduated_count} completed final semester / graduated).
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* CARD 1: AUTOMATIC SCHEDULE SETTINGS */}
            <div className="card space-y-5">
              <div className="border-b border-[var(--border-color)] pb-3">
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <IconClock size={16} className="text-blue-600 dark:text-blue-400" />
                  <span>Automatic Promotion Calendar Schedule</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Set the recurring month of each academic year when odd and even semester batches auto-advance.
                </p>
              </div>

              <form onSubmit={handleSaveAcademicSettings} className="space-y-4 text-xs">
                <div>
                  <label className="label">Current Institutional Academic Year</label>
                  <input
                    className="input font-mono font-bold"
                    value={academicForm.current_academic_year}
                    onChange={e => setAcademicForm({ ...academicForm, current_academic_year: e.target.value })}
                    placeholder="e.g. 2025-26"
                    required
                  />
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">
                    Institutional academic term applied to reports and course registers.
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Odd Semester Promotion Month</label>
                    <select
                      className="input font-semibold"
                      value={academicForm.odd_sem_promotion_month}
                      onChange={e => setAcademicForm({ ...academicForm, odd_sem_promotion_month: +e.target.value })}
                    >
                      {[
                        { num: 7, name: 'July (Month 7)' },
                        { num: 8, name: 'August (Month 8 - Recommended)' },
                        { num: 9, name: 'September (Month 9)' },
                        { num: 10, name: 'October (Month 10)' },
                      ].map(m => (
                        <option key={m.num} value={m.num}>{m.name}</option>
                      ))}
                    </select>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">
                      Advances cohorts into Semesters 3, 5, 7.
                    </span>
                  </div>

                  <div>
                    <label className="label">Even Semester Promotion Month</label>
                    <select
                      className="input font-semibold"
                      value={academicForm.even_sem_promotion_month}
                      onChange={e => setAcademicForm({ ...academicForm, even_sem_promotion_month: +e.target.value })}
                    >
                      {[
                        { num: 1, name: 'January (Month 1)' },
                        { num: 2, name: 'February (Month 2 - Recommended)' },
                        { num: 3, name: 'March (Month 3)' },
                        { num: 4, name: 'April (Month 4)' },
                      ].map(m => (
                        <option key={m.num} value={m.num}>{m.name}</option>
                      ))}
                    </select>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">
                      Advances cohorts into Semesters 2, 4, 6, 8.
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-[var(--border-color)] flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                      Enable Automated Recurring Updation
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 text-[11px] block">
                      Automatically advances active undergraduate student semesters when promotion month begins.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={academicForm.auto_promotion_enabled}
                    onChange={e => setAcademicForm({ ...academicForm, auto_promotion_enabled: e.target.checked })}
                    className="w-5 h-5 rounded text-blue-600 cursor-pointer"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="btn btn-primary btn-sm"
                  >
                    {savingSettings ? 'Saving Settings…' : 'Save Academic Schedule'}
                  </button>
                </div>
              </form>
            </div>

            {/* CARD 2: BATCH PROMOTION EXECUTION CONSOLE */}
            <div className="card space-y-5">
              <div className="border-b border-[var(--border-color)] pb-3">
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <IconUsers size={16} className="text-purple-600 dark:text-purple-400" />
                  <span>Execute Batch Cohort Semester Promotion</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Advance all students in a batch or semester with one click.
                </p>
              </div>

              {/* Real-Time Distribution Matrix */}
              {academicData?.stats && (
                <div className="space-y-3">
                  <span className="text-label text-slate-500 uppercase font-bold text-[11px]">
                    Current Student Roster Distribution ({academicData.stats.total_students} Total)
                  </span>
                  
                  {/* By Semester */}
                  <div className="flex flex-wrap gap-1.5">
                    {academicData.stats.by_semester.map((s: any) => (
                      <span
                        key={s.semester}
                        className="badge badge-neutral text-xs px-2.5 py-1"
                      >
                        Sem {s.semester}: <b className="ml-1 text-slate-900 dark:text-white font-mono">{s.count}</b>
                      </span>
                    ))}
                  </div>

                  {/* By Batch */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {academicData.stats.by_batch.map((b: any) => (
                      <span
                        key={b.joining_year}
                        className="badge badge-blue text-[11px] px-2.5 py-0.5"
                      >
                        Batch '{String(b.joining_year).slice(-2)} ({b.joining_year}): <b className="ml-1 font-mono">{b.count}</b>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Promotion Form */}
              <div className="space-y-4 pt-3 border-t border-[var(--border-color)] text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label">Target Student Joining Batch</label>
                    <select
                      className="input"
                      value={promoteForm.batch_year}
                      onChange={e => setPromoteForm({ ...promoteForm, batch_year: e.target.value })}
                    >
                      <option value="">All Batches</option>
                      {academicData?.stats?.by_batch?.map((b: any) => (
                        <option key={b.joining_year} value={b.joining_year}>
                          Batch {b.joining_year} ({b.count} students)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="label">From Current Semester</label>
                    <select
                      className="input"
                      value={promoteForm.from_semester}
                      onChange={e => setPromoteForm({ ...promoteForm, from_semester: e.target.value })}
                    >
                      <option value="">All Current Semesters</option>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                        <option key={s} value={s}>Semester {s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Increment By</label>
                    <input
                      className="input font-mono"
                      type="number"
                      min={1}
                      max={2}
                      value={promoteForm.increment}
                      onChange={e => setPromoteForm({ ...promoteForm, increment: +e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">Maximum Semester Cap</label>
                    <input
                      className="input font-mono"
                      type="number"
                      min={1}
                      max={10}
                      value={promoteForm.max_semester}
                      onChange={e => setPromoteForm({ ...promoteForm, max_semester: +e.target.value })}
                    />
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200 text-xs">
                  ⚠️ <b>Permanent Action:</b> Executing promotion increments <code>current_semester</code> for all matching student accounts. Students beyond Semester 8 will be marked as graduated.
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    disabled={promoting}
                    onClick={handleExecuteBatchPromotion}
                    className="btn btn-primary btn-sm"
                  >
                    {promoting ? 'Promoting Cohort…' : 'Execute Cohort Semester Promotion'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: AUTHORITY PROFILE & SECURITY */}
      {activeTab === 'profile' && (
        <div className="space-y-6 max-w-3xl mx-auto">
          {/* Authority Profile Customization */}
          <div className="card space-y-4 p-6 border-slate-200 dark:border-slate-800">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <IconUser size={18} className="text-blue-600 dark:text-blue-400" />
                <span>Authority Admin Profile Customization</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Manage your institutional administrator profile picture and official bio quote.
              </p>
            </div>

            <form onSubmit={handleSaveAuthProfile} className="space-y-4 text-xs">
              <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60">
                <div className="shrink-0 text-center">
                  <div className="w-20 h-20 rounded-full mx-auto overflow-hidden bg-slate-200 dark:bg-slate-700 border-2 border-blue-500 flex items-center justify-center text-slate-600 dark:text-slate-200 font-extrabold text-2xl shadow-sm">
                    {authProfileForm.avatar_url ? (
                      <img
                        src={authProfileForm.avatar_url}
                        alt="Profile Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                      />
                    ) : (
                      <span>A</span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block font-mono">Avatar Preview</span>
                </div>

                <div className="flex-1 w-full">
                  <ImageFileUpload
                    label="Administrator Photo / Avatar (PNG, JPG)"
                    value={authProfileForm.avatar_url}
                    onChange={url => setAuthProfileForm({ ...authProfileForm, avatar_url: url })}
                    accept="image/*"
                    placeholder="Click or drag to upload administrator photo"
                    helperText="Upload your official photo or enter an image URL directly."
                  />
                </div>
              </div>

              <div>
                <label className="label">Official Institutional Motto / Bio Quote</label>
                <textarea
                  className="input"
                  rows={2}
                  maxLength={500}
                  placeholder="e.g. Advancing academic excellence, governance integrity, and student success."
                  value={authProfileForm.quote}
                  onChange={e => setAuthProfileForm({ ...authProfileForm, quote: e.target.value })}
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={savingAuthProfile}
                  className="btn btn-primary btn-sm"
                >
                  {savingAuthProfile ? 'Saving Changes…' : 'Save Profile Customization'}
                </button>
              </div>
            </form>
          </div>

          {/* Authority Password Change */}
          <div className="card space-y-4 p-6 border-slate-200 dark:border-slate-800">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <IconLock size={18} className="text-blue-600 dark:text-blue-400" />
                <span>Change Authority Account Password</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Update your administrative login credentials.
              </p>
            </div>

            <form onSubmit={handleAuthPasswordChange} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Current Password *</label>
                  <input
                    type="password"
                    className="input"
                    value={authOldPassword}
                    onChange={e => setAuthOldPassword(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="label">New Permanent Password *</label>
                  <input
                    type="password"
                    className="input"
                    placeholder="At least 8 characters"
                    value={authNewPassword}
                    onChange={e => setAuthNewPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 6: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="card space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Institutional Governance Audit Trail</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Immutable regulatory compliance log with cryptographic timestamps</p>
            </div>
            <span className="badge badge-neutral text-xs font-mono">{auditLogs.length} Records</span>
          </div>
          <div className="table-container max-h-[600px] overflow-y-auto">
            <table className="table-enterprise">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Actor</th>
                  <th>Entity</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody className="font-mono text-xs">
                {auditLogs.map((log: any) => (
                  <tr key={log.id}>
                    <td className="text-slate-400 dark:text-slate-500 whitespace-nowrap text-[11px]">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td>
                      <span className="font-semibold text-blue-600 dark:text-blue-400">{log.action}</span>
                    </td>
                    <td className="text-slate-600 dark:text-slate-300">User #{log.actor_id || 'System'}</td>
                    <td className="text-slate-500 dark:text-slate-400">{log.entity || '—'} {log.entity_id ? `(#${log.entity_id})` : ''}</td>
                    <td className="text-slate-700 dark:text-slate-300 truncate max-w-xs">{log.detail || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Account Modal */}
      {selectedAccount && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="card w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Account Details & Management</h3>
              <button onClick={() => setSelectedAccount(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <IconX size={18} />
              </button>
            </div>

            {/* Account Credentials Showcase for Authority */}
            <div className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 space-y-2 text-xs">
              <span className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                <IconLock size={12} />
                <span>Account Credentials (Authority View)</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-amber-200 dark:border-amber-800/60">
                <div>
                  <span className="text-[10px] text-slate-400 block">Login Email ID:</span>
                  <div className="flex items-center gap-1 font-mono font-semibold text-slate-800 dark:text-slate-200">
                    <span className="truncate select-all">{selectedAccount.email}</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(selectedAccount.email)
                        setSuccess(`Copied email ${selectedAccount.email}`)
                      }}
                      className="p-1 hover:text-blue-600"
                      title="Copy email"
                    >
                      <IconCopy size={12} />
                    </button>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Active / Temporary Password:</span>
                  <div className="flex items-center gap-1.5 font-mono font-bold text-amber-600 dark:text-amber-400">
                    <span className="select-all">{selectedAccount.temp_password || (selectedAccount.type === 'STUDENT' ? 'StudentPass@123' : 'FacultyPass@123')}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const pw = selectedAccount.temp_password || (selectedAccount.type === 'STUDENT' ? 'StudentPass@123' : 'FacultyPass@123')
                        navigator.clipboard.writeText(pw)
                        setSuccess(`Copied password for ${selectedAccount.email}`)
                      }}
                      className="p-1 hover:text-blue-600"
                      title="Copy password"
                    >
                      <IconCopy size={12} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <form onSubmit={handleSaveAccountEdit} className="space-y-3">
              <div>
                <label className="label">Full Name</label>
                <input
                  className="input"
                  value={editForm.full_name || ''}
                  onChange={e => setEditForm({ ...editForm, full_name: e.target.value })}
                  required
                />
              </div>
              {selectedAccount.type === 'STUDENT' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Current Semester</label>
                    <input
                      className="input"
                      type="number"
                      value={editForm.semester || 1}
                      onChange={e => setEditForm({ ...editForm, semester: +e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">Section</label>
                    <input
                      className="input"
                      value={editForm.section || 'A'}
                      onChange={e => setEditForm({ ...editForm, section: e.target.value })}
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="label">Designation</label>
                  <input
                    className="input"
                    value={editForm.designation || ''}
                    onChange={e => setEditForm({ ...editForm, designation: e.target.value })}
                  />
                </div>
              )}
              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
                <button type="button" onClick={() => setSelectedAccount(null)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign HOD Modal */}
      {hodModal !== null && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="card w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Assign Department HOD</h3>
              <button onClick={() => setHodModal(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <IconX size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">Select an existing faculty member from this department:</p>
              <select
                className="input"
                value={selectedFacultyForHod}
                onChange={e => setSelectedFacultyForHod(e.target.value)}
              >
                <option value="">-- Choose Faculty Member --</option>
                {accounts
                  .filter(a => a.type === 'FACULTY' && a.department === departments.find(d => d.id === hodModal)?.code)
                  .map(f => (
                    <option key={f.id} value={f.id}>{f.name} ({f.email})</option>
                  ))}
              </select>
              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
                <button type="button" onClick={() => setHodModal(null)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!selectedFacultyForHod}
                  onClick={() => handleAssignHod(hodModal)}
                  className="btn btn-primary btn-sm"
                >
                  Confirm HOD Assignment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Class Teacher Modal */}
      {ctModal !== null && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="card w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Assign Class Teacher</h3>
              <button onClick={() => setCtModal(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <IconX size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Semester</label>
                  <select
                    className="input"
                    value={ctForm.semester}
                    onChange={e => setCtForm({ ...ctForm, semester: +e.target.value })}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                      <option key={s} value={s}>Semester {s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Section</label>
                  <input
                    className="input"
                    value={ctForm.section}
                    onChange={e => setCtForm({ ...ctForm, section: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="label">Academic Year</label>
                <input
                  className="input font-mono"
                  value={ctForm.academic_year}
                  onChange={e => setCtForm({ ...ctForm, academic_year: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Assign Faculty Member</label>
                <select
                  className="input"
                  value={ctForm.faculty_user_id}
                  onChange={e => setCtForm({ ...ctForm, faculty_user_id: e.target.value })}
                >
                  <option value="">-- Choose Faculty Member --</option>
                  {accounts
                    .filter(a => a.type === 'FACULTY' && a.department === departments.find(d => d.id === ctModal)?.code)
                    .map(f => (
                      <option key={f.id} value={f.id}>{f.name} ({f.email})</option>
                    ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
                <button type="button" onClick={() => setCtModal(null)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!ctForm.faculty_user_id}
                  onClick={() => handleAssignCt(ctModal)}
                  className="btn btn-primary btn-sm"
                >
                  Confirm Assignment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
