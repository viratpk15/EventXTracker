import React, { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { api, getAccountType } from '../api'
import { DynamicFormBuilder } from '../components/forms/DynamicFormBuilder'
import { MultiFormPreviewModal } from '../components/forms/MultiFormPreviewModal'
import { BackButton } from '../components/ui/BackButton'
import {
  IconArrowLeft,
  IconEye,
  IconSparkles,
  IconAlertTriangle,
  IconLayers,
  IconCalendar,
  IconCheckCircle
} from '../components/ui/Icons'

export default function EventFormBuilderPage() {
  const { id } = useParams()
  const eventId = Number(id)
  const navigate = useNavigate()
  const accountType = getAccountType()
  const isFaculty = accountType === 'FACULTY'

  const [ev, setEv] = useState<any>(null)
  const [form, setForm] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showMultiPreview, setShowMultiPreview] = useState(false)

  useEffect(() => {
    if (!eventId || isNaN(eventId)) {
      setError('Invalid Event ID specified in route')
      setLoading(false)
      return
    }
    loadData()
  }, [eventId])

  async function loadData() {
    setLoading(true)
    setError('')
    try {
      const [eventData, formData] = await Promise.all([
        api.get(`/events/${eventId}`),
        api.get(`/events/${eventId}/form`).catch(() => null),
      ])
      setEv(eventData)
      setForm(formData)
    } catch (err: any) {
      setError(err.message || 'Failed to load event or form builder data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="card text-center py-24 space-y-4 max-w-xl mx-auto rounded-3xl border border-border-default shadow-sm bg-white dark:bg-[#0E1017]">
        <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <div className="space-y-1">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Loading Form Studio Workspace…</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Fetching event configuration, published schemas, and question registry.
          </p>
        </div>
      </div>
    )
  }

  if (error || !ev) {
    return (
      <div className="card text-center py-16 space-y-4 max-w-lg mx-auto rounded-3xl border border-rose-200 dark:border-rose-900/60 bg-white dark:bg-[#0E1017] p-8 shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center text-2xl mx-auto">
          ⚠️
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Unable to Load Event Form Studio</h2>
          <p className="text-xs text-rose-600 dark:text-rose-400">{error || 'Event not found.'}</p>
        </div>
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            type="button"
            onClick={loadData}
            className="btn btn-primary px-4 py-2 text-xs font-bold rounded-xl"
          >
            Retry Loading
          </button>
          <Link
            to={isFaculty ? '/faculty/dashboard' : '/student/dashboard'}
            className="btn btn-secondary px-4 py-2 text-xs font-bold rounded-xl"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const backLink = isFaculty ? `/faculty/events/${eventId}` : `/events/${eventId}`

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Left Come Back Button */}
      <div className="flex items-center justify-between">
        <BackButton
          to={backLink}
          label="Come Back to Event Details"
          size="sm"
          variant="outline"
          className="shadow-2xs"
        />
      </div>

      {/* Studio Header Bar */}
      <div className="card p-6 sm:p-8 bg-gradient-to-r from-purple-50/90 via-indigo-50/40 to-slate-50 dark:from-[#121020] dark:via-[#0E121E] dark:to-[#0A0C14] border-2 border-purple-200 dark:border-purple-900/60 rounded-3xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-purple-700 dark:text-purple-400 flex-wrap">
            <Link to={isFaculty ? '/faculty/dashboard' : '/student/dashboard'} className="hover:underline">
              {isFaculty ? 'Faculty Dashboard' : 'Student Portal'}
            </Link>
            <span>/</span>
            <Link to={backLink} className="hover:underline max-w-[200px] truncate">
              {ev.name}
            </Link>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-bold">Dynamic Form Studio</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-2xl bg-purple-600 text-white flex items-center justify-center text-lg shadow-sm shrink-0">
              📝
            </span>
            <span>Edit Form Builder · {ev.name}</span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
            Create new registration questions tailored to current event needs, apply one-click preset templates (Hackathon, Project Expo, Workshop, Cultural), preview all 3 form specifications, or delete old obsolete questions to start fresh.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            type="button"
            onClick={() => setShowMultiPreview(true)}
            className="btn px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 flex items-center gap-1.5 shadow-sm active:scale-98 transition"
            title="Preview all 3 forms (Default Individual, Default Team, Custom Dynamic Form)"
          >
            <IconEye size={15} />
            <span>Preview All 3 Forms</span>
          </button>

          <Link
            to={backLink}
            className="btn btn-secondary px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 active:scale-98"
          >
            <IconArrowLeft size={14} />
            <span>Back to Event Details</span>
          </Link>

          <Link
            to={isFaculty ? '/faculty/dashboard' : '/student/dashboard'}
            className="btn btn-outline px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 active:scale-98"
          >
            <span>Dashboard</span>
          </Link>
        </div>
      </div>

      {/* Main Studio Body: DynamicFormBuilder or Authorization Fallback */}
      {isFaculty ? (
        <DynamicFormBuilder
          eventId={eventId}
          eventName={ev.name}
          eventDescription={ev.description}
          initialForm={form}
          onPublished={async () => {
            await loadData()
          }}
        />
      ) : (
        <div className="card max-w-xl mx-auto p-8 text-center space-y-3 bg-amber-50/50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-3xl">
          <IconAlertTriangle size={36} className="text-amber-600 dark:text-amber-400 mx-auto" />
          <h3 className="text-base font-bold text-amber-900 dark:text-amber-200">
            Faculty Coordinator Access Required
          </h3>
          <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
            The Dynamic Form Builder is restricted to assigned Faculty Coordinators. Please sign in with an authorized Faculty account to customize or reset registration questions.
          </p>
          <div className="pt-2">
            <Link to={backLink} className="btn btn-primary px-4 py-2 text-xs font-bold rounded-xl">
              ← Return to Event View
            </Link>
          </div>
        </div>
      )}

      {/* Multi-Form Preview Console Modal */}
      <MultiFormPreviewModal
        isOpen={showMultiPreview}
        onClose={() => setShowMultiPreview(false)}
        eventId={eventId}
        eventName={ev.name}
        eventDescription={ev.description}
        eventCategory={ev.category}
        minTeamSize={ev.min_team_size || 2}
        maxTeamSize={ev.max_team_size || 4}
        pptTemplateUrl={ev.ppt_template_url}
        requireIdProof={Boolean(ev.require_id_proof)}
        ideaPptRequired={Boolean(ev.idea_ppt_required)}
        customFormTitle={form?.title || ev.name}
        customFormDescription={form?.description || ev.description}
        customQuestions={form?.questions || []}
        publishedVersion={form?.published_version || 0}
        initialTab="custom"
      />
    </div>
  )
}

