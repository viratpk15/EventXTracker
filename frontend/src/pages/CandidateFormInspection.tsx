import React, { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { api, getAccountType } from '../api'
import { BackButton } from '../components/ui/BackButton'
import {
  IconUserCheck,
  IconCheck,
  IconUsers,
  IconDownload,
  IconExternalLink,
  IconFileText,
  IconArrowLeft,
  IconArrowRight,
  IconShield,
  IconSparkles,
  IconCalendar,
  IconClock,
  IconMapPin,
  IconPhone,
  IconMail,
  IconStar,
  IconLayers,
  IconCheckCircle,
  IconAlertTriangle,
  IconPrinter
} from '../components/ui/Icons'

export default function CandidateFormInspection() {
  const { id, regId } = useParams()
  const eventId = Number(id)
  const navigate = useNavigate()
  const accountType = getAccountType()
  const isFaculty = accountType === 'FACULTY'

  const [data, setData] = useState<any>(null)
  const [allSubmissions, setAllSubmissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [shortlisting, setShortlisting] = useState(false)

  useEffect(() => {
    loadSubmission()
    loadAllEventSubmissions()
  }, [eventId, regId])

  async function loadSubmission() {
    setLoading(true)
    setError('')
    try {
      const res = await api.get(`/events/${eventId}/submissions/${regId}`)
      setData(res)
    } catch (err: any) {
      setError(err.message || 'Failed to load candidate registration details')
    } finally {
      setLoading(false)
    }
  }

  async function loadAllEventSubmissions() {
    try {
      const list = await api.get(`/events/${eventId}/submissions`).catch(() => [])
      setAllSubmissions(list || [])
    } catch {
      /* ignore */
    }
  }

  // Shortlist Action
  async function handleShortlist() {
    if (!data?.id) return
    setShortlisting(true)
    setError('')
    setSuccess('')
    try {
      await api.post(`/events/${eventId}/shortlist/${data.id}`)
      setSuccess(`Candidate ${data.student?.full_name} shortlisted and queued to Attendance Register!`)
      setData((prev: any) => ({ ...prev, status: 'SHORTLISTED' }))
    } catch (err: any) {
      setError(err.message || 'Failed to shortlist candidate')
    } finally {
      setShortlisting(false)
    }
  }

  // Adjacent Candidate Navigation
  const currentIndex = allSubmissions.findIndex(
    s => s.registration_id === regId || String(s.id) === String(regId)
  )
  const prevSub = currentIndex > 0 ? allSubmissions[currentIndex - 1] : null
  const nextSub = currentIndex >= 0 && currentIndex < allSubmissions.length - 1 ? allSubmissions[currentIndex + 1] : null

  if (loading) {
    return (
      <div className="card text-center py-20 space-y-3">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Loading candidate application dossier…</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="card text-center py-16 space-y-4 max-w-xl mx-auto">
        <IconAlertTriangle size={36} className="text-rose-500 mx-auto" />
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Submission Not Found</h3>
        <p className="text-xs text-rose-600 dark:text-rose-400">{error || 'Could not locate candidate registration.'}</p>
        <Link
          to={isFaculty ? `/faculty/events/${eventId}` : `/events/${eventId}`}
          className="btn btn-secondary text-xs px-4 py-2 inline-flex items-center gap-2"
        >
          <IconArrowLeft size={14} />
          <span>Back to Event</span>
        </Link>
      </div>
    )
  }

  const student = data.student || {}
  const event = data.event || {}
  const fields = data.detailed_fields || []
  const team = data.team
  const isShortlisted = data.status === 'SHORTLISTED'

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Left Come Back Navigation */}
      <div className="flex items-center justify-between">
        <BackButton
          to={isFaculty ? `/faculty/events/${eventId}` : `/events/${eventId}`}
          label="Come Back to Event Registrations"
          size="sm"
          variant="outline"
          className="shadow-2xs"
        />
      </div>

      {/* Top Breadcrumb & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-default pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <Link to={isFaculty ? "/faculty/dashboard" : "/student/dashboard"} className="hover:underline">
              {isFaculty ? "Faculty Dashboard" : "Dashboard"}
            </Link>
            <span>/</span>
            <Link to={isFaculty ? `/faculty/events/${eventId}` : `/events/${eventId}`} className="hover:underline">
              {event.name}
            </Link>
            <span>/</span>
            <Link to={isFaculty ? `/faculty/events/${eventId}?tab=participants` : `/events/${eventId}`} className="hover:underline">
              Registrations
            </Link>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-bold">{student.full_name}</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to={isFaculty ? `/faculty/events/${eventId}?tab=participants` : `/events/${eventId}`}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 shrink-0"
            >
              <IconArrowLeft size={13} />
              <span>Back to Registrations List</span>
            </Link>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <span className="text-xs text-slate-500 font-mono">
              Candidate {currentIndex >= 0 ? currentIndex + 1 : 1} of {Math.max(allSubmissions.length, 1)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Previous / Next Candidate Buttons */}
          {prevSub && (
            <Link
              to={isFaculty ? `/faculty/events/${eventId}/submissions/${prevSub.registration_id}` : `/events/${eventId}/submissions/${prevSub.registration_id}`}
              className="btn btn-outline text-xs px-3 py-1.5 rounded-xl flex items-center gap-1 active:scale-98"
              title={`Inspect previous candidate: ${prevSub.name}`}
            >
              <IconArrowLeft size={13} />
              <span>Prev</span>
            </Link>
          )}
          {nextSub && (
            <Link
              to={isFaculty ? `/faculty/events/${eventId}/submissions/${nextSub.registration_id}` : `/events/${eventId}/submissions/${nextSub.registration_id}`}
              className="btn btn-outline text-xs px-3 py-1.5 rounded-xl flex items-center gap-1 active:scale-98"
              title={`Inspect next candidate: ${nextSub.name}`}
            >
              <span>Next</span>
              <IconArrowRight size={13} />
            </Link>
          )}

          <button
            type="button"
            onClick={() => window.print()}
            className="btn btn-secondary text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5 active:scale-98"
            title="Print candidate application dossier"
          >
            <IconPrinter size={14} />
            <span>Print Form Sheet</span>
          </button>

          {!isShortlisted && (
            <button
              type="button"
              disabled={shortlisting}
              onClick={handleShortlist}
              className="btn btn-primary text-xs font-bold px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm active:scale-98"
            >
              <IconSparkles size={14} />
              <span>{shortlisting ? 'Shortlisting…' : 'Shortlist Candidate'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {success && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2">
          <IconCheckCircle size={16} className="text-emerald-600 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Candidate Executive Header Dossier Card */}
      <div className="card-antigravity p-6 sm:p-8 bg-gradient-to-br from-white via-slate-50/70 to-blue-50/20 dark:from-[#0E1017] dark:via-[#0B0D14] dark:to-black border border-border-default rounded-3xl shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            {student.avatar_url ? (
              <img
                src={student.avatar_url}
                alt={student.full_name}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-blue-500 shadow-md shrink-0"
              />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-extrabold text-2xl flex items-center justify-center shrink-0 shadow-md">
                {student.full_name?.charAt(0) || 'S'}
              </div>
            )}

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                  {student.department} · Sem {student.semester} ({student.section || 'A'})
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  isShortlisted
                    ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                    : 'bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
                }`}>
                  {data.status}
                </span>
                {team && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
                    👥 Team Entry: {team.team_name}
                  </span>
                )}
              </div>

              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {student.full_name}
              </h1>

              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-mono flex-wrap">
                <span>USN: <strong className="text-slate-800 dark:text-slate-200">{student.usn}</strong></span>
                <span>·</span>
                <span>Reg ID: <strong className="text-blue-600 dark:text-blue-400">{data.registration_id}</strong></span>
                {data.created_at && (
                  <>
                    <span>·</span>
                    <span>Submitted: {new Date(data.created_at).toLocaleString()}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Quick Contact Box */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#121520] border border-border-default text-xs space-y-1.5 shrink-0 self-start sm:self-auto min-w-[220px]">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <IconMail size={13} className="text-slate-400 shrink-0" />
              <span className="truncate">{student.email || '—'}</span>
            </div>
            {student.phone && (
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <IconPhone size={13} className="text-slate-400 shrink-0" />
                <span className="font-mono">{student.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-slate-500 text-[11px] pt-1 border-t border-border-default">
              <span>Form Schema:</span>
              <strong className="text-purple-600 dark:text-purple-400 font-mono">
                {data.form_title} (v{data.form_version || 1})
              </strong>
            </div>
          </div>
        </div>

        {student.quote && (
          <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 text-xs italic text-blue-900 dark:text-blue-200">
            "{student.quote}"
          </div>
        )}
      </div>

      {/* TEAM PROPOSAL DETAILS (IF TEAM REGISTRATION) */}
      {team && (
        <div className="card p-6 rounded-3xl border border-border-default bg-white dark:bg-[#0E1017] shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border-default pb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-sm">
                👥
              </span>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Team Proposal: {team.team_name}
                </h3>
                <p className="text-xs text-slate-500">Status: {team.status} · Payment: {team.payment_status}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {team.project_title && (
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#121520] border border-border-default space-y-1">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Project / Idea Title</span>
                <p className="font-bold text-slate-900 dark:text-white text-sm">{team.project_title}</p>
              </div>
            )}

            {team.tech_stack && (
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#121520] border border-border-default space-y-1">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Target Tech Stack & Tools</span>
                <p className="font-mono text-purple-600 dark:text-purple-400 font-semibold">{team.tech_stack}</p>
              </div>
            )}

            {team.problem_statement && (
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#121520] border border-border-default space-y-1 md:col-span-2">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Problem Statement</span>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{team.problem_statement}</p>
              </div>
            )}

            {team.proposed_solution && (
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#121520] border border-border-default space-y-1 md:col-span-2">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Proposed Architecture & Solution</span>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{team.proposed_solution}</p>
              </div>
            )}

            {team.pitch_deck_url && (
              <div className="p-3.5 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 flex items-center justify-between text-xs md:col-span-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📊</span>
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block">Team Presentation Pitch Deck</span>
                    <span className="text-[11px] text-slate-500 font-mono truncate max-w-sm block">{team.pitch_deck_url}</span>
                  </div>
                </div>
                <a
                  href={team.pitch_deck_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 shrink-0"
                >
                  <IconExternalLink size={13} />
                  <span>Open Pitch Deck</span>
                </a>
              </div>
            )}

            {/* Team Members List */}
            {team.members && team.members.length > 0 && (
              <div className="md:col-span-2 space-y-2 pt-2 border-t border-border-default">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Team Roster:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {team.members.map((m: any, idx: number) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#121520] border border-border-default flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white block truncate">{m.name}</span>
                        <span className="text-[11px] text-slate-400 font-mono">{m.usn} · {m.department}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        m.is_leader ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}>
                        {m.is_leader ? 'Leader' : m.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* QUESTION-BY-QUESTION FORM DETAILS FILLED BY CANDIDATE */}
      <div className="glass-card p-6 sm:p-8 rounded-3xl border border-border-default bg-white dark:bg-[#0E1017] shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-default pb-4">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <IconFileText size={18} className="text-purple-600 dark:text-purple-400" />
              <span>Candidate Form Submission Details (Inspect Answers)</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Comprehensive questionnaire responses recorded under schema <b>{data.form_title}</b> (v{data.form_version || 1}).
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-50 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-mono self-start sm:self-auto">
            {fields.length} Questionnaire Fields
          </span>
        </div>

        {fields.length === 0 ? (
          <div className="py-12 text-center space-y-2 text-slate-400">
            <span className="text-3xl block">📝</span>
            <p className="text-xs font-semibold">No questionnaire responses recorded for this registration.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {fields.map((field: any, idx: number) => {
              const val = field.value
              const isFile = field.type === 'file' || (typeof val === 'object' && val !== null && val.file_url)
              const fileUrl = isFile ? (val?.file_url || val) : null
              const isImage = typeof fileUrl === 'string' && (fileUrl.match(/\.(jpg|jpeg|png|webp|gif)$/i) || fileUrl.includes('/proofs/'))

              return (
                <div
                  key={field.id || idx}
                  className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-[#121520] border border-border-default space-y-2.5 transition hover:border-slate-300 dark:hover:border-slate-700"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black text-slate-400 font-mono">#{idx + 1}</span>
                        <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                          {field.title || field.id}
                        </h4>
                        {field.required && <span className="text-rose-500 font-bold">*</span>}
                      </div>
                      {field.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">{field.description}</p>
                      )}
                    </div>

                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-white dark:bg-slate-900 border border-border-default text-slate-500 shrink-0 font-mono">
                      {field.type}
                    </span>
                  </div>

                  {/* Render Response Value Depending on Question Type */}
                  <div className="pt-1">
                    {val === null || val === undefined || val === '' ? (
                      <span className="text-xs text-slate-400 italic">No response provided</span>
                    ) : isFile ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 p-3 bg-white dark:bg-slate-900 rounded-xl border border-border-default">
                          <span className="text-xl">📎</span>
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                              {typeof val === 'object' && val.file_name ? val.file_name : 'Uploaded File Attachment'}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono truncate block">{fileUrl}</span>
                          </div>
                          <a
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 shrink-0"
                          >
                            <IconDownload size={13} />
                            <span>Download / View</span>
                          </a>
                        </div>

                        {/* If file is an image (e.g. ID card photo), show embedded high-res preview */}
                        {isImage && (
                          <div className="rounded-xl overflow-hidden border border-border-default max-h-64 bg-slate-950 flex items-center justify-center p-2">
                            <img
                              src={fileUrl}
                              alt={field.title}
                              className="max-h-60 rounded-lg object-contain shadow-xs"
                              onError={e => { (e.currentTarget.style.display = 'none') }}
                            />
                          </div>
                        )}
                      </div>
                    ) : field.type === 'url' || (typeof val === 'string' && (val.startsWith('http://') || val.startsWith('https://'))) ? (
                      <div className="flex items-center gap-2 p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-border-default">
                        <IconExternalLink size={14} className="text-blue-600 shrink-0" />
                        <a
                          href={val}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-mono font-semibold text-blue-600 dark:text-blue-400 hover:underline truncate"
                        >
                          {val}
                        </a>
                      </div>
                    ) : Array.isArray(val) ? (
                      <div className="flex flex-wrap gap-1.5">
                        {val.map((item, itemIdx) => (
                          <span
                            key={itemIdx}
                            className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-border-default text-xs font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1"
                          >
                            <IconCheck size={12} className="text-emerald-600" />
                            <span>{String(item)}</span>
                          </span>
                        ))}
                      </div>
                    ) : field.type === 'rating' ? (
                      <div className="flex items-center gap-1 text-amber-500">
                        {Array.from({ length: 5 }).map((_, rIdx) => (
                          <IconStar
                            key={rIdx}
                            size={16}
                            className={rIdx < Number(val) ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-700'}
                          />
                        ))}
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 ml-2">
                          {val} / 5
                        </span>
                      </div>
                    ) : field.type === 'yes_no' ? (
                      <span className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 ${
                        String(val).toLowerCase() === 'yes' || String(val) === 'true'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300'
                          : 'bg-rose-50 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300'
                      }`}>
                        {String(val)}
                      </span>
                    ) : field.type === 'paragraph' || (typeof val === 'string' && val.length > 80) ? (
                      <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-border-default text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                        {String(val)}
                      </div>
                    ) : (
                      <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-border-default text-xs font-bold text-slate-900 dark:text-white font-sans">
                        {String(val)}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer Navigation Bar */}
      <div className="flex items-center justify-between border-t border-border-default pt-4 text-xs">
        <Link
          to={isFaculty ? `/faculty/events/${eventId}?tab=participants` : `/events/${eventId}`}
          className="btn btn-secondary text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 active:scale-98"
        >
          <IconArrowLeft size={14} />
          <span>Back to All Submissions</span>
        </Link>

        <div className="flex items-center gap-2">
          {prevSub && (
            <Link
              to={isFaculty ? `/faculty/events/${eventId}/submissions/${prevSub.registration_id}` : `/events/${eventId}/submissions/${prevSub.registration_id}`}
              className="btn btn-outline text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 active:scale-98"
            >
              <IconArrowLeft size={13} />
              <span>Previous Candidate</span>
            </Link>
          )}
          {nextSub && (
            <Link
              to={isFaculty ? `/faculty/events/${eventId}/submissions/${nextSub.registration_id}` : `/events/${eventId}/submissions/${nextSub.registration_id}`}
              className="btn btn-primary text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 active:scale-98"
            >
              <span>Next Candidate</span>
              <IconArrowRight size={13} />
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

