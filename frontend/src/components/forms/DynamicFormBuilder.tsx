import React, { useState, useEffect } from 'react'
import { FormQuestion, QuestionType, EventFormData, FormVersionInfo } from '../../types/form'
import { DynamicFormRenderer } from './DynamicFormRenderer'
import { MultiFormPreviewModal } from './MultiFormPreviewModal'
import { api } from '../../api'
import {
  IconEdit,
  IconFileText,
  IconMail,
  IconPhone,
  IconHash,
  IconCreditCard,
  IconChevronDown,
  IconChevronUp,
  IconCheckCircle,
  IconCheck,
  IconHelpCircle,
  IconCalendar,
  IconClock,
  IconExternalLink,
  IconPaperclip,
  IconStar,
  IconLayers,
  IconSparkles,
  IconEye,
  IconArchive,
  IconCopy,
  IconTrash,
  IconPlus,
  IconX,
  IconAlertTriangle,
  IconLock,
  IconUnlock,
  IconActivity
} from '../ui/Icons'

interface DynamicFormBuilderProps {
  eventId: number
  eventName?: string
  eventDescription?: string
  initialForm?: EventFormData | null
  onPublished?: (version: number) => void
}

interface QuestionTypeDefinition {
  label: string
  category: 'text' | 'choice' | 'datetime' | 'media' | 'layout'
  icon: React.ComponentType<{ size?: number; className?: string }>
}

const QUESTION_TYPE_DEFS: Record<QuestionType, QuestionTypeDefinition> = {
  short_text: { label: 'Short Text', category: 'text', icon: IconEdit },
  paragraph: { label: 'Paragraph / Long Text', category: 'text', icon: IconFileText },
  email: { label: 'Email Address', category: 'text', icon: IconMail },
  phone: { label: 'Phone Number', category: 'text', icon: IconPhone },
  number: { label: 'Numeric Value', category: 'text', icon: IconHash },
  currency: { label: 'Currency (₹)', category: 'text', icon: IconCreditCard },
  dropdown: { label: 'Dropdown Selection', category: 'choice', icon: IconChevronDown },
  single_choice: { label: 'Single Choice (Radio)', category: 'choice', icon: IconCheckCircle },
  multiple_choice: { label: 'Multiple Choice (Checkboxes)', category: 'choice', icon: IconCheck },
  yes_no: { label: 'Yes / No', category: 'choice', icon: IconHelpCircle },
  date: { label: 'Date', category: 'datetime', icon: IconCalendar },
  time: { label: 'Time', category: 'datetime', icon: IconClock },
  datetime: { label: 'Date & Time', category: 'datetime', icon: IconCalendar },
  url: { label: 'Website / Portfolio URL', category: 'media', icon: IconExternalLink },
  file: { label: 'File Upload (PPT/PDF/Image)', category: 'media', icon: IconPaperclip },
  rating: { label: 'Rating Scale', category: 'layout', icon: IconStar },
  section_heading: { label: 'Section Heading', category: 'layout', icon: IconLayers },
  instruction: { label: 'Instructions Banner', category: 'layout', icon: IconSparkles },
}

export const DynamicFormBuilder: React.FC<DynamicFormBuilderProps> = ({
  eventId,
  eventName = 'Event Registration',
  eventDescription = '',
  initialForm,
  onPublished,
}) => {
  const [title, setTitle] = useState(initialForm?.title || eventName)
  const [description, setDescription] = useState(initialForm?.description || eventDescription)
  const [questions, setQuestions] = useState<FormQuestion[]>(initialForm?.questions || [])
  const [publishedVersion, setPublishedVersion] = useState(initialForm?.published_version || 0)
  const [isDraft, setIsDraft] = useState(Boolean(initialForm?.has_draft))
  const [savingDraft, setSavingDraft] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Preview & Version History Modals
  const [showPreview, setShowPreview] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false)
  const [clearingOldForm, setClearingOldForm] = useState(false)
  const [applyingTemplate, setApplyingTemplate] = useState(false)
  const [versions, setVersions] = useState<FormVersionInfo[]>([])
  const [loadingVersions, setLoadingVersions] = useState(false)
  const [selectedHistoryVersion, setSelectedHistoryVersion] = useState<number | null>(null)
  const [historyFormSchema, setHistoryFormSchema] = useState<EventFormData | null>(null)

  // Registration open/close status
  const [regClosing, setRegClosing] = useState(false)

  useEffect(() => {
    if (initialForm) {
      setTitle(initialForm.title || eventName)
      setDescription(initialForm.description || eventDescription)
      setQuestions(initialForm.questions || [])
      setPublishedVersion(initialForm.published_version || 0)
      setIsDraft(Boolean(initialForm.has_draft))
    } else if (eventId) {
      api.get(`/events/${eventId}/form`).then((data: any) => {
        if (!data) return
        setTitle(data.title || eventName)
        setDescription(data.description || eventDescription)
        setQuestions(data.questions || [])
        setPublishedVersion(data.published_version || 0)
        setIsDraft(Boolean(data.has_draft))
      }).catch(() => {})
    }
  }, [initialForm, eventId, eventName, eventDescription])

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  // --- Question Manipulation ---
  const handleAddQuestion = (type: QuestionType = 'short_text') => {
    const newId = `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    const isChoice = ['dropdown', 'single_choice', 'multiple_choice'].includes(type)
    const isSection = type === 'section_heading'
    const isInstruction = type === 'instruction'

    const newQ: FormQuestion = {
      id: newId,
      type,
      title: isSection ? 'New Section' : isInstruction ? 'Important Instructions' : 'Untitled Question',
      description: '',
      required: !isSection && !isInstruction,
      placeholder: '',
      options: isChoice ? ['Option 1', 'Option 2', 'Option 3'] : undefined,
      currency_symbol: type === 'currency' ? '₹' : undefined,
      rating_max: type === 'rating' ? 5 : undefined,
      allowed_extensions: type === 'file' ? ['pdf', 'png', 'jpg', 'pptx'] : undefined,
      max_size_mb: type === 'file' ? 15 : undefined,
    }
    setQuestions(prev => [...prev, newQ])
    setIsDraft(true)
  }

  const handleUpdateQuestion = (idx: number, updates: Partial<FormQuestion>) => {
    setQuestions(prev => {
      const copy = [...prev]
      copy[idx] = { ...copy[idx], ...updates }
      return copy
    })
    setIsDraft(true)
  }

  const handleDeleteQuestion = (idx: number) => {
    setQuestions(prev => prev.filter((_, i) => i !== idx))
    setIsDraft(true)
  }

  const handleDuplicateQuestion = (idx: number) => {
    const target = questions[idx]
    const duplicated: FormQuestion = {
      ...JSON.parse(JSON.stringify(target)),
      id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: `${target.title} (Copy)`,
    }
    setQuestions(prev => {
      const copy = [...prev]
      copy.splice(idx + 1, 0, duplicated)
      return copy
    })
    setIsDraft(true)
  }

  const handleMoveQuestion = (idx: number, direction: 'up' | 'down') => {
    if (direction === 'up' && idx === 0) return
    if (direction === 'down' && idx === questions.length - 1) return
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1
    setQuestions(prev => {
      const copy = [...prev]
      const temp = copy[idx]
      copy[idx] = copy[targetIdx]
      copy[targetIdx] = temp
      return copy
    })
    setIsDraft(true)
  }

  // --- Choice Options Management ---
  const handleAddOption = (qIdx: number) => {
    setQuestions(prev => {
      const copy = [...prev]
      const currentOpts = copy[qIdx].options || []
      copy[qIdx].options = [...currentOpts, `Option ${currentOpts.length + 1}`]
      return copy
    })
    setIsDraft(true)
  }

  const handleUpdateOption = (qIdx: number, optIdx: number, val: string) => {
    setQuestions(prev => {
      const copy = [...prev]
      const currentOpts = [...(copy[qIdx].options || [])]
      currentOpts[optIdx] = val
      copy[qIdx].options = currentOpts
      return copy
    })
    setIsDraft(true)
  }

  const handleDeleteOption = (qIdx: number, optIdx: number) => {
    setQuestions(prev => {
      const copy = [...prev]
      const currentOpts = (copy[qIdx].options || []).filter((_, i) => i !== optIdx)
      copy[qIdx].options = currentOpts
      return copy
    })
    setIsDraft(true)
  }

  // --- Save Draft & Publish ---
  const handleSaveDraft = async () => {
    setSavingDraft(true)
    try {
      await api.put(`/events/${eventId}/form/draft`, {
        title,
        description,
        questions,
      })
      setIsDraft(false)
      showToast('Form draft saved successfully!')
    } catch (err: any) {
      showToast(err.message || 'Failed to save draft', 'error')
    } finally {
      setSavingDraft(false)
    }
  }

  const handlePublish = async () => {
    if (questions.length === 0) {
      showToast('Please add at least one question before publishing.', 'error')
      return
    }

    setPublishing(true)
    try {
      const res = await api.put(`/events/${eventId}/form`, {
        title,
        description,
        questions,
      })
      setPublishedVersion(res.version)
      setIsDraft(false)
      showToast(`Form published successfully as v${res.version}!`)
      if (onPublished) onPublished(res.version)
    } catch (err: any) {
      showToast(err.message || 'Failed to publish form', 'error')
    } finally {
      setPublishing(false)
    }
  }

  // --- Delete Old Form & Reset From Templates Based on Current Needs ---
  const handleDeleteOldForm = async () => {
    setClearingOldForm(true)
    try {
      await api.delete(`/events/${eventId}/form`)
      setQuestions([])
      setIsDraft(true)
      setShowDeleteConfirmModal(false)
      showToast('Old form and questions cleared successfully. You can now build from scratch or choose a preset template.', 'success')
    } catch (err: any) {
      showToast(err.message || 'Failed to delete old form', 'error')
    } finally {
      setClearingOldForm(false)
    }
  }

  const handleApplyTemplate = async (templateKey: string) => {
    setApplyingTemplate(true)
    try {
      const res = await api.post(`/events/${eventId}/form/reset`, { template: templateKey })
      setQuestions(res.questions || [])
      if (res.title) setTitle(res.title)
      if (res.description) setDescription(res.description)
      setIsDraft(true)
      setShowTemplateModal(false)
      showToast(`Loaded "${res.template_name || templateKey}" template (${res.questions_count || (res.questions || []).length} questions) based on your requirements!`, 'success')
    } catch (err: any) {
      showToast(err.message || 'Failed to apply template', 'error')
    } finally {
      setApplyingTemplate(false)
    }
  }

  // --- Registration Controls ---
  const handleToggleRegistration = async (action: 'close' | 'open') => {
    setRegClosing(true)
    try {
      if (action === 'close') {
        await api.post(`/events/${eventId}/close-registrations`)
        showToast('Registrations closed successfully.')
      } else {
        await api.post(`/events/${eventId}/open-registrations`)
        showToast('Registrations re-opened successfully.')
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update registration status', 'error')
    } finally {
      setRegClosing(false)
    }
  }

  // --- Version History ---
  const handleOpenHistory = async () => {
    setShowHistory(true)
    setLoadingVersions(true)
    try {
      const data = await api.get(`/events/${eventId}/form/versions`)
      setVersions(data || [])
    } catch (err: any) {
      showToast(err.message || 'Failed to load version history', 'error')
    } finally {
      setLoadingVersions(false)
    }
  }

  const handleInspectHistoricalVersion = async (ver: number) => {
    setSelectedHistoryVersion(ver)
    try {
      const vForm = await api.get(`/events/${eventId}/form?version=${ver}`)
      setHistoryFormSchema(vForm)
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch historical version', 'error')
    }
  }

  // Available prerequisite questions for conditional logic
  const getPrerequisiteQuestions = (currentIdx: number) => {
    return questions.slice(0, currentIdx).filter(q =>
      ['dropdown', 'single_choice', 'yes_no', 'short_text'].includes(q.type)
    )
  }

  const requiredCount = questions.filter(q => q.required).length

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold flex items-center gap-2 ${
            toast.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/80 border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-200'
          }`}
        >
          {toast.type === 'success' ? <IconCheckCircle size={16} /> : <IconAlertTriangle size={16} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* TOP ACTION BAR */}
      <div className="card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border-t-4 border-t-purple-600">
        <div>
          <div className="flex items-center gap-2">
            <IconEdit size={18} className="text-purple-600 dark:text-purple-400" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Dynamic Form Studio</h2>
            {publishedVersion > 0 ? (
              <span className="badge badge-success text-xs">v{publishedVersion} Active</span>
            ) : (
              <span className="badge badge-neutral text-xs">Unpublished</span>
            )}
            {isDraft && <span className="badge badge-warning text-xs">Draft Changes</span>}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Design questions, validation rules, and conditional logic. Publishing increments the version immutably.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowTemplateModal(true)}
            className="btn px-3 py-1.5 rounded-xl text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 flex items-center gap-1.5 shadow-2xs hover:bg-purple-100 dark:hover:bg-purple-900/40 transition active:scale-98"
            title="Create new question schema based on current event needs"
          >
            <IconSparkles size={14} className="text-purple-600 dark:text-purple-400" />
            <span>Templates (Current Needs)</span>
          </button>
          <button
            type="button"
            onClick={() => setShowDeleteConfirmModal(true)}
            className="btn px-3 py-1.5 rounded-xl text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center gap-1.5 shadow-2xs hover:bg-rose-100 dark:hover:bg-rose-900/40 transition active:scale-98"
            title="Clear and delete old form questions"
          >
            <IconTrash size={14} className="text-rose-600 dark:text-rose-400" />
            <span>Delete Old Form</span>
          </button>
          <button
            type="button"
            onClick={handleOpenHistory}
            className="btn-outline btn-sm text-xs flex items-center gap-1.5"
            title="View all historical published versions"
          >
            <IconArchive size={14} />
            <span>History</span>
          </button>
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            className="btn-outline btn-sm text-xs flex items-center gap-1.5"
            title="Preview form as a student"
          >
            <IconEye size={14} />
            <span>Preview</span>
          </button>
          <button
            type="button"
            disabled={savingDraft}
            onClick={handleSaveDraft}
            className="btn-secondary btn-sm text-xs"
          >
            {savingDraft ? 'Saving…' : 'Save Draft'}
          </button>
          <button
            type="button"
            disabled={publishing}
            onClick={handlePublish}
            className="btn-primary btn-sm text-xs font-bold flex items-center gap-1.5"
          >
            <IconSparkles size={14} />
            <span>{publishing ? 'Publishing…' : `Publish v${publishedVersion + 1}`}</span>
          </button>
        </div>
      </div>

      {/* QUICK PRESETS & ACTIONS: CREATE NEW BASED ON CURRENT NEEDS & DELETE OLD */}
      <div className="card p-5 bg-gradient-to-r from-purple-50/70 via-blue-50/40 to-slate-50 dark:from-[#131122] dark:via-[#0F1420] dark:to-[#0D1017] border-2 border-purple-200 dark:border-purple-900/60 rounded-3xl shadow-xs space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-200/60 dark:border-purple-800/60 pb-3">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="text-base">⚡</span>
              <span>Create New Form Schema (Based on Current Needs)</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Select an institutional template to instantly generate industry-standard questions, or delete obsolete old questions to build from scratch.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowDeleteConfirmModal(true)}
            className="btn text-xs font-bold py-1.5 px-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 self-start sm:self-auto shadow-2xs active:scale-98 transition"
          >
            <IconTrash size={13} />
            <span>Delete Old / Clear Form</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <button
            type="button"
            disabled={applyingTemplate}
            onClick={() => handleApplyTemplate('hackathon')}
            className="p-3 rounded-2xl bg-white dark:bg-[#121520] border border-border-default hover:border-purple-500 hover:shadow-sm text-left transition group space-y-1"
          >
            <div className="flex items-center justify-between">
              <span className="text-lg">🚀</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-mono">7 Qs</span>
            </div>
            <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-purple-600 transition truncate">
              Hackathon / Pitch
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
              Tracks, GitHub repo, slide pitch deck, and college ID card.
            </p>
          </button>

          <button
            type="button"
            disabled={applyingTemplate}
            onClick={() => handleApplyTemplate('project_expo')}
            className="p-3 rounded-2xl bg-white dark:bg-[#121520] border border-border-default hover:border-blue-500 hover:shadow-sm text-left transition group space-y-1"
          >
            <div className="flex items-center justify-between">
              <span className="text-lg">🔬</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-mono">7 Qs</span>
            </div>
            <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition truncate">
              Project Expo
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
              Engineering branch, TRL maturity, stall power/equip, poster PPT.
            </p>
          </button>

          <button
            type="button"
            disabled={applyingTemplate}
            onClick={() => handleApplyTemplate('workshop')}
            className="p-3 rounded-2xl bg-white dark:bg-[#121520] border border-border-default hover:border-emerald-500 hover:shadow-sm text-left transition group space-y-1"
          >
            <div className="flex items-center justify-between">
              <span className="text-lg">💻</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono">5 Qs</span>
            </div>
            <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 transition truncate">
              Tech Workshop
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
              Academic year, prior experience, topic goals, laptop readiness.
            </p>
          </button>

          <button
            type="button"
            disabled={applyingTemplate}
            onClick={() => handleApplyTemplate('cultural')}
            className="p-3 rounded-2xl bg-white dark:bg-[#121520] border border-border-default hover:border-amber-500 hover:shadow-sm text-left transition group space-y-1"
          >
            <div className="flex items-center justify-between">
              <span className="text-lg">🎭</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-mono">5 Qs</span>
            </div>
            <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-amber-600 transition truncate">
              Cultural Fest
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
              Category, performance title, stage crew count, audio track link.
            </p>
          </button>

          <button
            type="button"
            disabled={applyingTemplate}
            onClick={() => handleApplyTemplate('standard')}
            className="p-3 rounded-2xl bg-white dark:bg-[#121520] border border-border-default hover:border-cyan-500 hover:shadow-sm text-left transition group space-y-1"
          >
            <div className="flex items-center justify-between">
              <span className="text-lg">📋</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-cyan-50 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 font-mono">4 Qs</span>
            </div>
            <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-cyan-600 transition truncate">
              Standard General
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
              WhatsApp phone, sem/sec, motivation, and college ID card proof.
            </p>
          </button>

          <button
            type="button"
            disabled={applyingTemplate}
            onClick={() => handleApplyTemplate('empty')}
            className="p-3 rounded-2xl bg-white dark:bg-[#121520] border border-dashed border-slate-300 dark:border-slate-700 hover:border-slate-500 hover:shadow-sm text-left transition group space-y-1"
          >
            <div className="flex items-center justify-between">
              <span className="text-lg">📄</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">Blank</span>
            </div>
            <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-slate-700 dark:group-hover:text-slate-300 transition truncate">
              Blank Canvas
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
              Clean slate with 0 questions to build custom schema from palette.
            </p>
          </button>
        </div>
      </div>

      {/* 3-PANE LAYOUT: LEFT PALETTE | CENTER CANVAS | RIGHT INSPECTOR */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* PANE 1: LEFT PALETTE (COL-SPAN-3) */}
        <div className="lg:col-span-3 space-y-4">
          <div className="card p-4 space-y-3 sticky top-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <IconLayers size={14} className="text-purple-600 dark:text-purple-400" />
                <span>Question Palette</span>
              </h3>
              <span className="text-[10px] text-slate-400">Click to add</span>
            </div>

            <div className="space-y-3">
              {/* Category: Text */}
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Inputs & Text
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['short_text', 'paragraph', 'email', 'phone', 'number', 'currency'] as QuestionType[]).map(t => {
                    const def = QUESTION_TYPE_DEFS[t]
                    const IconComp = def.icon
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => handleAddQuestion(t)}
                        className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 hover:border-purple-500 hover:bg-purple-50/50 dark:hover:bg-purple-950/20 text-left transition-all group"
                      >
                        <IconComp size={14} className="text-slate-500 group-hover:text-purple-600 dark:group-hover:text-purple-400 mb-1" />
                        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block truncate">
                          {def.label.split('/')[0].split('(')[0].trim()}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Category: Choices */}
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Choices & Selection
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['dropdown', 'single_choice', 'multiple_choice', 'yes_no'] as QuestionType[]).map(t => {
                    const def = QUESTION_TYPE_DEFS[t]
                    const IconComp = def.icon
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => handleAddQuestion(t)}
                        className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 hover:border-purple-500 hover:bg-purple-50/50 dark:hover:bg-purple-950/20 text-left transition-all group"
                      >
                        <IconComp size={14} className="text-slate-500 group-hover:text-purple-600 dark:group-hover:text-purple-400 mb-1" />
                        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block truncate">
                          {def.label.split('(')[0].trim()}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Category: Date, Files & Layout */}
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Dates, Files & Structure
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['date', 'time', 'file', 'url', 'section_heading', 'instruction'] as QuestionType[]).map(t => {
                    const def = QUESTION_TYPE_DEFS[t]
                    const IconComp = def.icon
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => handleAddQuestion(t)}
                        className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 hover:border-purple-500 hover:bg-purple-50/50 dark:hover:bg-purple-950/20 text-left transition-all group"
                      >
                        <IconComp size={14} className="text-slate-500 group-hover:text-purple-600 dark:group-hover:text-purple-400 mb-1" />
                        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block truncate">
                          {def.label.split('(')[0].trim()}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Quick Registration Status Toggle */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block">Registration Access:</span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  disabled={regClosing}
                  onClick={() => handleToggleRegistration('open')}
                  className="btn-outline btn-xs text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 flex items-center justify-center gap-1"
                >
                  <IconUnlock size={12} />
                  <span>Open</span>
                </button>
                <button
                  type="button"
                  disabled={regClosing}
                  onClick={() => handleToggleRegistration('close')}
                  className="btn-outline btn-xs text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-800 flex items-center justify-center gap-1"
                >
                  <IconLock size={12} />
                  <span>Close</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* PANE 2: CENTER LIVE CANVAS (COL-SPAN-6) */}
        <div className="lg:col-span-6 space-y-4">
          {/* Form Title & Description Card */}
          <div className="card p-5 space-y-3">
            <div>
              <label className="label">Form Title *</label>
              <input
                type="text"
                className="input w-full font-bold text-base"
                value={title}
                onChange={e => {
                  setTitle(e.target.value)
                  setIsDraft(true)
                }}
                placeholder="e.g. Hackathon 2026 Registration Form"
              />
            </div>
            <div>
              <label className="label">Form Description & Guidelines</label>
              <textarea
                rows={2}
                className="input w-full text-xs"
                value={description}
                onChange={e => {
                  setDescription(e.target.value)
                  setIsDraft(true)
                }}
                placeholder="Enter instructions, eligibility notes, or required materials..."
              />
            </div>
          </div>

          {/* Questions Stack */}
          {questions.length === 0 ? (
            <div className="card p-12 text-center space-y-3 border-dashed border-2 border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30">
              <IconEdit size={36} className="mx-auto text-slate-400 dark:text-slate-600" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Questions Added Yet</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Start building your event registration form by selecting question types from the palette on the left.
              </p>
              <button
                type="button"
                onClick={() => handleAddQuestion('short_text')}
                className="btn-primary btn-sm text-xs inline-flex items-center gap-1.5"
              >
                <IconPlus size={14} />
                <span>Add First Question</span>
              </button>
            </div>
          ) : (
            questions.map((q, idx) => {
              const prereqs = getPrerequisiteQuestions(idx)
              const def = QUESTION_TYPE_DEFS[q.type] || QUESTION_TYPE_DEFS.short_text
              const IconComp = def.icon

              return (
                <div
                  key={q.id || idx}
                  className="card p-5 space-y-4 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm transition-all"
                >
                  {/* Question Header & Order Controls */}
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800 dark:text-purple-300 uppercase tracking-wider font-mono">
                        #{idx + 1}
                      </span>
                      <span className="text-xs text-slate-300 dark:text-slate-700">|</span>
                      <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1.5">
                        <IconComp size={14} className="text-purple-600 dark:text-purple-400" />
                        <span>{def.label}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveQuestion(idx, 'up')}
                        className="btn-ghost btn-sm text-xs p-1 text-slate-500 disabled:opacity-30"
                        title="Move Up"
                      >
                        <IconChevronUp size={14} />
                      </button>
                      <button
                        type="button"
                        disabled={idx === questions.length - 1}
                        onClick={() => handleMoveQuestion(idx, 'down')}
                        className="btn-ghost btn-sm text-xs p-1 text-slate-500 disabled:opacity-30"
                        title="Move Down"
                      >
                        <IconChevronDown size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDuplicateQuestion(idx)}
                        className="btn-ghost btn-sm text-xs p-1 text-slate-600 dark:text-slate-400"
                        title="Duplicate Question"
                      >
                        <IconCopy size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteQuestion(idx)}
                        className="btn-ghost btn-sm text-xs p-1 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        title="Delete Question"
                      >
                        <IconTrash size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Question Title & Type Selector */}
                  <div className="grid sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="label">
                        {q.type === 'section_heading'
                          ? 'Section Title *'
                          : q.type === 'instruction'
                          ? 'Banner Heading *'
                          : 'Question Label / Title *'}
                      </label>
                      <input
                        type="text"
                        className="input w-full font-semibold"
                        value={q.title}
                        onChange={e => handleUpdateQuestion(idx, { title: e.target.value })}
                        placeholder="e.g. GitHub Repository URL"
                      />
                    </div>
                    <div>
                      <label className="label">Question Type</label>
                      <select
                        className="input w-full"
                        value={q.type}
                        onChange={e => {
                          const newType = e.target.value as QuestionType
                          const isChoice = ['dropdown', 'single_choice', 'multiple_choice'].includes(newType)
                          handleUpdateQuestion(idx, {
                            type: newType,
                            options: isChoice && (!q.options || q.options.length === 0) ? ['Option 1', 'Option 2'] : q.options,
                          })
                        }}
                      >
                        {Object.entries(QUESTION_TYPE_DEFS).map(([tKey, tVal]) => (
                          <option key={tKey} value={tKey}>
                            {tVal.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Description / Instructions */}
                  <div>
                    <label className="label">Help Text / Description (Optional)</label>
                    <input
                      type="text"
                      className="input w-full text-xs"
                      value={q.description || ''}
                      onChange={e => handleUpdateQuestion(idx, { description: e.target.value })}
                      placeholder="Guidance or context shown to the student"
                    />
                  </div>

                  {/* Placeholder for text inputs */}
                  {['short_text', 'paragraph', 'number', 'email', 'phone', 'url'].includes(q.type) && (
                    <div>
                      <label className="label">Placeholder Text</label>
                      <input
                        type="text"
                        className="input w-full text-xs font-mono"
                        value={q.placeholder || ''}
                        onChange={e => handleUpdateQuestion(idx, { placeholder: e.target.value })}
                        placeholder="Placeholder in input box..."
                      />
                    </div>
                  )}

                  {/* Choices Options List */}
                  {['dropdown', 'single_choice', 'multiple_choice'].includes(q.type) && (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                          Options / Choices
                        </label>
                        <button
                          type="button"
                          onClick={() => handleAddOption(idx)}
                          className="btn-outline btn-xs text-xs flex items-center gap-1"
                        >
                          <IconPlus size={12} />
                          <span>Add Option</span>
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        {(q.options || []).map((opt, optIdx) => (
                          <div key={optIdx} className="flex items-center gap-2">
                            <span className="text-xs text-slate-400 font-mono w-4">{optIdx + 1}.</span>
                            <input
                              type="text"
                              className="input text-xs flex-1 bg-white dark:bg-slate-900"
                              value={opt}
                              onChange={e => handleUpdateOption(idx, optIdx, e.target.value)}
                            />
                            <button
                              type="button"
                              onClick={() => handleDeleteOption(idx, optIdx)}
                              className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1"
                              title="Remove option"
                            >
                              <IconX size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* File Upload Settings */}
                  {q.type === 'file' && (
                    <div className="grid sm:grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
                      <div>
                        <label className="label">Allowed Extensions (Comma-separated)</label>
                        <input
                          type="text"
                          className="input font-mono text-xs bg-white dark:bg-slate-900"
                          value={(q.allowed_extensions || []).join(', ')}
                          onChange={e =>
                            handleUpdateQuestion(idx, {
                              allowed_extensions: e.target.value.split(',').map(s => s.trim().toLowerCase()).filter(Boolean),
                            })
                          }
                          placeholder="pdf, pptx, ppt, png, jpg"
                        />
                      </div>
                      <div>
                        <label className="label">Max File Size (MB)</label>
                        <input
                          type="number"
                          className="input text-xs bg-white dark:bg-slate-900"
                          value={q.max_size_mb || 15}
                          min={1}
                          max={100}
                          onChange={e => handleUpdateQuestion(idx, { max_size_mb: +e.target.value })}
                        />
                      </div>
                    </div>
                  )}

                  {/* Conditional Logic Accordion */}
                  {prereqs.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-700 dark:text-slate-300">Conditional Display Rules</span>
                        <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 dark:text-slate-400">
                          <input
                            type="checkbox"
                            checked={Boolean(q.conditional?.depends_on_question_id)}
                            onChange={e => {
                              if (e.target.checked) {
                                handleUpdateQuestion(idx, {
                                  conditional: {
                                    depends_on_question_id: prereqs[0].id,
                                    operator: 'equals',
                                    value: prereqs[0].options?.[0] || 'Yes',
                                  },
                                })
                              } else {
                                handleUpdateQuestion(idx, { conditional: undefined })
                              }
                            }}
                          />
                          <span>Enable Condition</span>
                        </label>
                      </div>

                      {q.conditional?.depends_on_question_id && (
                        <div className="grid sm:grid-cols-3 gap-2 p-2.5 rounded-lg bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                          <div>
                            <label className="label text-[10px]">When Question:</label>
                            <select
                              className="input text-xs bg-white dark:bg-slate-900"
                              value={q.conditional.depends_on_question_id}
                              onChange={e =>
                                handleUpdateQuestion(idx, {
                                  conditional: { ...q.conditional!, depends_on_question_id: e.target.value },
                                })
                              }
                            >
                              {prereqs.map(pq => (
                                <option key={pq.id} value={pq.id}>
                                  {pq.title}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="label text-[10px]">Condition:</label>
                            <select
                              className="input text-xs bg-white dark:bg-slate-900"
                              value={q.conditional.operator || 'equals'}
                              onChange={e =>
                                handleUpdateQuestion(idx, {
                                  conditional: { ...q.conditional!, operator: e.target.value as any },
                                })
                              }
                            >
                              <option value="equals">Equals</option>
                              <option value="not_equals">Does Not Equal</option>
                              <option value="contains">Contains</option>
                            </select>
                          </div>
                          <div>
                            <label className="label text-[10px]">Expected Value:</label>
                            <input
                              type="text"
                              className="input text-xs bg-white dark:bg-slate-900"
                              value={q.conditional.value || ''}
                              onChange={e =>
                                handleUpdateQuestion(idx, {
                                  conditional: { ...q.conditional!, value: e.target.value },
                                })
                              }
                              placeholder="Value to match"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Required Toggle Footer */}
                  {q.type !== 'section_heading' && q.type !== 'instruction' && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                      <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800 dark:text-slate-200">
                        <input
                          type="checkbox"
                          checked={Boolean(q.required)}
                          onChange={e => handleUpdateQuestion(idx, { required: e.target.checked })}
                          className="w-4 h-4 text-purple-600 rounded"
                        />
                        <span>Mandatory Question (Required for student submission)</span>
                      </label>
                      <span className="text-slate-400 font-mono text-[11px]">{q.id}</span>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* PANE 3: RIGHT INSPECTOR & STATS (COL-SPAN-3) */}
        <div className="lg:col-span-3 space-y-4">
          <div className="card p-4 space-y-4 sticky top-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <IconActivity size={14} className="text-purple-600 dark:text-purple-400" />
                <span>Form Health & Telemetry</span>
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Items</span>
                <span className="text-lg font-bold text-slate-900 dark:text-white mt-0.5 block">{questions.length}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Required</span>
                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block">{requiredCount}</span>
              </div>
            </div>

            {/* Status Checklist */}
            <div className="space-y-2 text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Validation Status
              </span>
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <IconCheckCircle size={14} className={title.trim() ? 'text-emerald-500' : 'text-slate-300'} />
                <span>Form title defined</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <IconCheckCircle size={14} className={questions.length > 0 ? 'text-emerald-500' : 'text-slate-300'} />
                <span>At least one question added</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <IconCheckCircle size={14} className={publishedVersion > 0 ? 'text-emerald-500' : 'text-amber-500'} />
                <span>{publishedVersion > 0 ? `Published (v${publishedVersion})` : 'Draft only (Unpublished)'}</span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <button
                type="button"
                onClick={() => setShowPreview(true)}
                className="btn-outline w-full text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <IconEye size={14} />
                <span>Simulate Student View</span>
              </button>
              <button
                type="button"
                disabled={publishing}
                onClick={handlePublish}
                className="btn-primary w-full text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <IconSparkles size={14} />
                <span>{publishing ? 'Publishing…' : `Publish v${publishedVersion + 1}`}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MULTI-FORM PREVIEW CONSOLE: PREVIEW ALL 3 FORMS (INDIVIDUAL, TEAM, CUSTOM) */}
      <MultiFormPreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        eventId={eventId}
        eventName={eventName}
        eventDescription={eventDescription}
        customFormTitle={title}
        customFormDescription={description}
        customQuestions={questions}
        publishedVersion={publishedVersion}
        isDraft={isDraft}
        initialTab="custom"
      />

      {/* MODAL: Version History */}
      {showHistory && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="card max-w-2xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <IconArchive size={18} className="text-purple-600 dark:text-purple-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Published Form Version History</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowHistory(false)
                  setSelectedHistoryVersion(null)
                  setHistoryFormSchema(null)
                }}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <IconX size={18} />
              </button>
            </div>

            {loadingVersions ? (
              <p className="text-xs text-slate-500 py-6 text-center">Loading version records…</p>
            ) : versions.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No published versions yet.</p>
            ) : (
              <div className="space-y-3">
                {versions.map(v => (
                  <div
                    key={v.version}
                    className={`p-4 rounded-xl border flex items-center justify-between ${
                      v.is_current
                        ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">Version {v.version}</span>
                        {v.is_current && <span className="badge badge-success text-[10px]">Active</span>}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Published:{' '}
                        {v.published_at ? new Date(v.published_at).toLocaleString() : 'Pre-existing'}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        <b>{v.questions_count}</b> questions · <b>{v.submissions_count}</b> submissions
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleInspectHistoricalVersion(v.version)}
                      className="btn-outline btn-sm text-xs"
                    >
                      Inspect Schema
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Historical Version Details Inspector */}
            {selectedHistoryVersion && historyFormSchema && (
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase">
                    Schema for Version {selectedHistoryVersion}
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedHistoryVersion(null)
                      setHistoryFormSchema(null)
                    }}
                    className="text-xs text-slate-500 hover:underline"
                  >
                    Close
                  </button>
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto text-xs">
                  {historyFormSchema.questions.map((hq, i) => (
                    <div key={i} className="p-2 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {i + 1}. {hq.title}
                      </span>
                      <span className="badge badge-neutral text-[10px]">{hq.type}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: DELETE OLD FORM CONFIRMATION */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="card max-w-md w-full p-6 space-y-4 bg-white dark:bg-[#0E1017] border border-border-default rounded-3xl shadow-2xl">
            <div className="flex items-center gap-3 border-b border-border-default pb-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <IconTrash size={20} />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Delete Old Form Questions?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Clear existing questions and start fresh</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to delete all <strong>{questions.length}</strong> questions in the current form? This will reset your draft canvas to empty so you can build new questions tailored to current requirements or choose a template preset.
            </p>

            <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-xl text-[11px] text-rose-800 dark:text-rose-300">
              Note: If prior submissions were recorded, their historical version snapshots remain safely preserved in the audit archive.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirmModal(false)}
                className="btn-outline text-xs px-4 py-2 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={clearingOldForm}
                onClick={handleDeleteOldForm}
                className="btn text-xs font-bold px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 shadow-sm active:scale-98 transition disabled:opacity-50"
              >
                <IconTrash size={14} />
                <span>{clearingOldForm ? 'Deleting Old Form…' : 'Yes, Delete Old Questions'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CHOOSE TEMPLATE BASED ON CURRENT NEEDS */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="card max-w-2xl w-full p-6 space-y-5 bg-white dark:bg-[#0E1017] border border-border-default rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border-default pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                  <IconSparkles size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">Choose Template for Current Needs</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Instantly generate standard questions for your event type</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTemplateModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <IconX size={20} />
              </button>
            </div>

            <div className="space-y-3">
              {[
                {
                  key: 'hackathon',
                  icon: '🚀',
                  title: 'Hackathon & Ideathon',
                  badge: '7 Questions',
                  desc: 'Includes Challenge Track dropdown, Project Title, Problem Statement, Target Tech Stack, GitHub Repo URL, Pitch Deck presentation file, and College Student ID card photo.',
                },
                {
                  key: 'project_expo',
                  icon: '🔬',
                  title: 'Project Expo & Prototype Showcase',
                  badge: '7 Questions',
                  desc: 'Includes Engineering Branch discipline, Prototype Maturity TRL (Concept / Working Prototype), Abstract, Stall Power & Equipment Needs (230V / 3-phase), Poster Slide Deck, and Demo Video Link.',
                },
                {
                  key: 'workshop',
                  icon: '💻',
                  title: 'Technical Workshop & Bootcamp',
                  badge: '5 Questions',
                  desc: 'Includes Academic Year & Semester, Prior Hands-on Experience Level, Learning Goals, Laptop Availability confirmation, and WhatsApp contact number.',
                },
                {
                  key: 'cultural',
                  icon: '🎭',
                  title: 'Cultural & Performing Arts Fest',
                  badge: '5 Questions',
                  desc: 'Includes Performance Category (Dance/Music/Theatre), Performance Piece Title, Number of Performers on Stage, Backing Audio Track Drive link, and Stage Prop requirements.',
                },
                {
                  key: 'standard',
                  icon: '📋',
                  title: 'Standard Institutional Registration',
                  badge: '4 Questions',
                  desc: 'Basic participant registration with Contact WhatsApp Mobile, Current Semester & Section, Statement of Motivation, and Student ID card verification upload.',
                },
                {
                  key: 'empty',
                  icon: '📄',
                  title: 'Clean Blank Canvas',
                  badge: '0 Questions',
                  desc: 'Completely clear all old questions so you can build custom fields from the palette one by one.',
                },
              ].map(tmpl => (
                <div
                  key={tmpl.key}
                  className="p-4 rounded-2xl border border-border-default hover:border-purple-500 bg-slate-50 dark:bg-[#121520] flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{tmpl.icon}</span>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">{tmpl.title}</h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-mono">
                        {tmpl.badge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 max-w-lg leading-relaxed">
                      {tmpl.desc}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={applyingTemplate}
                    onClick={() => handleApplyTemplate(tmpl.key)}
                    className="btn btn-primary px-4 py-2 text-xs font-bold self-start sm:self-auto shrink-0 shadow-2xs active:scale-98 transition"
                  >
                    {applyingTemplate ? 'Applying…' : 'Apply Template'}
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border-default">
              <span className="text-xs text-slate-400">Applying a template will overwrite current draft questions.</span>
              <button
                type="button"
                onClick={() => setShowTemplateModal(false)}
                className="btn-outline text-xs px-4 py-2 rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
