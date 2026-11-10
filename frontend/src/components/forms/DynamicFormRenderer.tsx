import React, { useState, useEffect } from 'react'
import { FormQuestion, EventFormData } from '../../types/form'
import { api } from '../../api'

interface DynamicFormRendererProps {
  eventId: number
  form: EventFormData | null
  initialAnswers?: Record<string, any>
  readOnly?: boolean
  previewMode?: boolean
  onSubmitSuccess?: (data: { id: number; registration_id: string; answers: Record<string, any> }) => void
}

export function isQuestionVisible(q: FormQuestion, answers: Record<string, any>): boolean {
  if (!q.conditional || !q.conditional.depends_on_question_id) {
    return true
  }
  const depId = q.conditional.depends_on_question_id
  const actualVal = answers[depId]
  const expectedVal = q.conditional.value
  const op = q.conditional.operator || 'equals'

  if (actualVal === undefined || actualVal === null || actualVal === '') {
    return false
  }

  if (op === 'equals') {
    return String(actualVal).trim().toLowerCase() === String(expectedVal).trim().toLowerCase()
  } else if (op === 'not_equals') {
    return String(actualVal).trim().toLowerCase() !== String(expectedVal).trim().toLowerCase()
  } else if (op === 'in') {
    if (Array.isArray(actualVal)) {
      return actualVal.some(x => String(x).trim().toLowerCase() === String(expectedVal).trim().toLowerCase())
    }
    return String(expectedVal).trim().toLowerCase().includes(String(actualVal).trim().toLowerCase())
  } else if (op === 'not_empty') {
    return Boolean(actualVal)
  }
  return true
}

export const DynamicFormRenderer: React.FC<DynamicFormRendererProps> = ({
  eventId,
  form,
  initialAnswers = {},
  readOnly = false,
  previewMode = false,
  onSubmitSuccess,
}) => {
  const [answers, setAnswers] = useState<Record<string, any>>(initialAnswers)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [uploadingField, setUploadingField] = useState<string | null>(null)
  const [submissionSuccess, setSubmissionSuccess] = useState<{ id: number; registration_id: string } | null>(null)

  useEffect(() => {
    if (initialAnswers) {
      setAnswers(initialAnswers)
    }
  }, [initialAnswers])

  const questions = form?.questions || []

  const handleAnswerChange = (questionId: string, value: any) => {
    if (readOnly) return
    setAnswers(prev => ({
      ...prev,
      [questionId]: value,
    }))
    // Clear field error if value is entered
    if (errors[questionId]) {
      setErrors(prev => {
        const next = { ...prev }
        delete next[questionId]
        return next
      })
    }
  }

  const handleCheckboxToggle = (questionId: string, option: string) => {
    if (readOnly) return
    const currentList: string[] = Array.isArray(answers[questionId]) ? answers[questionId] : []
    let updated: string[]
    if (currentList.includes(option)) {
      updated = currentList.filter(item => item !== option)
    } else {
      updated = [...currentList, option]
    }
    handleAnswerChange(questionId, updated)
  }

  const handleFileUpload = async (questionId: string, file: File, allowedExts?: string[], maxMb?: number) => {
    if (readOnly) return
    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    if (allowedExts && allowedExts.length > 0 && !allowedExts.includes(ext)) {
      setErrors(prev => ({ ...prev, [questionId]: `Allowed file formats: ${allowedExts.join(', ')}` }))
      return
    }
    const maxBytes = (maxMb || 15) * 1024 * 1024
    if (file.size > maxBytes) {
      setErrors(prev => ({ ...prev, [questionId]: `File size exceeds ${maxMb || 15}MB limit` }))
      return
    }

    setUploadingField(questionId)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await api.postForm(`/events/${eventId}/upload`, formData)
      handleAnswerChange(questionId, {
        file_url: res.file_url,
        filename: res.filename,
        size_bytes: res.size_bytes,
        content_type: res.content_type,
      })
    } catch (err: any) {
      setErrors(prev => ({ ...prev, [questionId]: err.message || 'File upload failed' }))
    } finally {
      setUploadingField(null)
    }
  }

  const validateAll = (): boolean => {
    const newErrors: Record<string, string> = {}

    for (const q of questions) {
      if (['section_heading', 'instruction'].includes(q.type)) continue
      if (!isQuestionVisible(q, answers)) continue

      const val = answers[q.id]

      if (q.required) {
        if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
          newErrors[q.id] = `${q.title} is required`
          continue
        }
      }

      if (val !== undefined && val !== null && val !== '') {
        if (q.type === 'email') {
          if (!String(val).includes('@') || !String(val).includes('.')) {
            newErrors[q.id] = 'Please enter a valid email address'
          }
        } else if (q.type === 'phone') {
          const digits = String(val).replace(/\D/g, '')
          if (digits.length < 10 || digits.length > 15) {
            newErrors[q.id] = 'Phone number must be between 10 and 15 digits'
          }
        } else if (q.type === 'url') {
          if (!String(val).startsWith('http://') && !String(val).startsWith('https://')) {
            newErrors[q.id] = 'URL must start with http:// or https://'
          }
        } else if (q.type === 'number' || q.type === 'currency') {
          const num = Number(val)
          if (isNaN(num)) {
            newErrors[q.id] = 'Must be a valid number'
          } else {
            if (q.min !== undefined && q.min !== null && num < q.min) {
              newErrors[q.id] = `Minimum value is ${q.min}`
            }
            if (q.max !== undefined && q.max !== null && num > q.max) {
              newErrors[q.id] = `Maximum value is ${q.max}`
            }
          }
        } else if (q.type === 'short_text' || q.type === 'paragraph') {
          const str = String(val)
          if (q.min_length && str.length < q.min_length) {
            newErrors[q.id] = `Must be at least ${q.min_length} characters`
          }
          if (q.max_length && str.length > q.max_length) {
            newErrors[q.id] = `Maximum allowed is ${q.max_length} characters`
          }
        }
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (readOnly) return

    if (previewMode) {
      if (validateAll()) {
        alert('Form validation passed! Preview mode active (no server record written).')
      }
      return
    }

    if (!validateAll()) {
      return
    }

    // Clean answers to omit hidden questions
    const cleanAnswers: Record<string, any> = {}
    for (const q of questions) {
      if (['section_heading', 'instruction'].includes(q.type)) continue
      if (isQuestionVisible(q, answers) && answers[q.id] !== undefined) {
        cleanAnswers[q.id] = answers[q.id]
      }
    }

    setSubmitting(true)
    try {
      const res = await api.post(`/events/${eventId}/register`, {
        answers: cleanAnswers,
      })
      setSubmissionSuccess({
        id: res.id,
        registration_id: res.registration_id,
      })
      if (onSubmitSuccess) {
        onSubmitSuccess({
          id: res.id,
          registration_id: res.registration_id,
          answers: cleanAnswers,
        })
      }
    } catch (err: any) {
      setErrors(prev => ({ ...prev, _form: err.message || 'Registration failed' }))
    } finally {
      setSubmitting(false)
    }
  }

  if (submissionSuccess) {
    return (
      <div className="card max-w-xl mx-auto p-8 text-center space-y-4 border-2 border-emerald-500 bg-emerald-50/20">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
          ✓
        </div>
        <h3 className="text-xl font-bold text-slate-900">Registration Confirmed!</h3>
        <p className="text-sm text-slate-600">
          Your response has been recorded under form version <b>v{form?.version || 1}</b>.
        </p>
        <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 inline-block">
          <span className="text-xs text-slate-500 uppercase font-semibold">Registration ID</span>
          <p className="text-lg font-mono font-bold text-coral-600 dark:text-purple-400">{submissionSuccess.registration_id}</p>
        </div>
        <p className="text-xs text-slate-500">
          You can track your event status from your Student Dashboard.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl mx-auto">
      {/* Form Header */}
      <div className="card border-t-4 border-t-coral-500 dark:border-t-purple-500 space-y-2 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">{form?.title || 'Event Registration'}</h2>
          <span className="badge badge-neutral text-xs">Version: v{form?.version || 1}</span>
        </div>
        {form?.description && (
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{form.description}</p>
        )}
        <p className="text-xs text-rose-600 pt-1">* Indicates required question</p>
      </div>

      {errors._form && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium">
          {errors._form}
        </div>
      )}

      {/* Render Questions List */}
      <div className="space-y-4">
        {questions.map((q, idx) => {
          const visible = isQuestionVisible(q, answers)
          if (!visible) return null

          // Section Heading Card
          if (q.type === 'section_heading') {
            return (
              <div key={q.id || idx} className="card bg-slate-100 dark:bg-slate-900 border-l-4 border-l-coral-500 dark:border-l-purple-500 p-5 mt-6">
                <h3 className="text-lg font-bold text-slate-900">{q.title}</h3>
                {q.description && (
                  <p className="text-xs text-slate-600 mt-1 whitespace-pre-wrap">{q.description}</p>
                )}
              </div>
            )
          }

          // Descriptive Instruction Card
          if (q.type === 'instruction') {
            return (
              <div key={q.id || idx} className="p-4 rounded-xl bg-blue-50/80 border border-blue-200 text-blue-900 flex items-start gap-3">
                <span className="text-blue-600 text-base font-bold">ℹ️</span>
                <div className="space-y-0.5">
                  <h4 className="text-sm font-semibold">{q.title}</h4>
                  {q.description && <p className="text-xs text-blue-800 leading-relaxed">{q.description}</p>}
                </div>
              </div>
            )
          }

          const errorMsg = errors[q.id]
          const val = answers[q.id]

          return (
            <div
              key={q.id || idx}
              className={`card p-5 space-y-3 transition-all ${
                errorMsg ? 'border-rose-400 ring-1 ring-rose-300' : 'hover:border-slate-300'
              }`}
            >
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-800 flex items-start justify-between">
                  <span>
                    {q.title}
                    {q.required && <span className="text-rose-500 font-bold ml-1">*</span>}
                  </span>
                  {q.section && (
                    <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                      {q.section}
                    </span>
                  )}
                </label>
                {q.description && <p className="text-xs text-slate-500">{q.description}</p>}
              </div>

              {/* Controls by Question Type */}
              <div className="pt-1">
                {/* 1. Short Text */}
                {q.type === 'short_text' && (
                  <input
                    type="text"
                    disabled={readOnly}
                    placeholder={q.placeholder || 'Your answer'}
                    className="input w-full"
                    value={val || ''}
                    maxLength={q.max_length}
                    onChange={e => handleAnswerChange(q.id, e.target.value)}
                  />
                )}

                {/* 2. Paragraph / Long Text */}
                {q.type === 'paragraph' && (
                  <textarea
                    disabled={readOnly}
                    rows={4}
                    placeholder={q.placeholder || 'Type your detailed answer...'}
                    className="input w-full text-xs"
                    value={val || ''}
                    maxLength={q.max_length}
                    onChange={e => handleAnswerChange(q.id, e.target.value)}
                  />
                )}

                {/* 3. Email */}
                {q.type === 'email' && (
                  <input
                    type="email"
                    disabled={readOnly}
                    placeholder={q.placeholder || 'student@vvce.ac.in'}
                    className="input w-full"
                    value={val || ''}
                    onChange={e => handleAnswerChange(q.id, e.target.value)}
                  />
                )}

                {/* 4. Phone */}
                {q.type === 'phone' && (
                  <input
                    type="tel"
                    disabled={readOnly}
                    placeholder={q.placeholder || '10-digit mobile number'}
                    className="input w-full"
                    value={val || ''}
                    onChange={e => handleAnswerChange(q.id, e.target.value)}
                  />
                )}

                {/* 5. Number */}
                {q.type === 'number' && (
                  <input
                    type="number"
                    step="any"
                    disabled={readOnly}
                    min={q.min}
                    max={q.max}
                    placeholder={q.placeholder || 'Enter numeric value'}
                    className="input w-full"
                    value={val !== undefined ? val : ''}
                    onChange={e => handleAnswerChange(q.id, e.target.value)}
                  />
                )}

                {/* 6. Currency */}
                {q.type === 'currency' && (
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 font-bold text-sm">
                      {q.currency_symbol || '₹'}
                    </span>
                    <input
                      type="number"
                      step="any"
                      disabled={readOnly}
                      min={q.min}
                      max={q.max}
                      placeholder={q.placeholder || '0.00'}
                      className="input w-full pl-8"
                      value={val !== undefined ? val : ''}
                      onChange={e => handleAnswerChange(q.id, e.target.value)}
                    />
                  </div>
                )}

                {/* 7. Dropdown */}
                {q.type === 'dropdown' && (
                  <select
                    disabled={readOnly}
                    className="input w-full"
                    value={val || ''}
                    onChange={e => handleAnswerChange(q.id, e.target.value)}
                  >
                    <option value="">{q.placeholder || 'Select an option'}</option>
                    {(q.options || []).map((opt, oIdx) => (
                      <option key={oIdx} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                )}

                {/* 8. Single Choice Radio */}
                {q.type === 'single_choice' && (
                  <div className="space-y-2">
                    {(q.options || []).map((opt, oIdx) => (
                      <label
                        key={oIdx}
                        className={`flex items-center gap-3 p-3 rounded-lg border text-xs cursor-pointer transition-colors ${
                          val === opt
                            ? 'border-coral-500 bg-coral-50/50 dark:border-purple-500 dark:bg-purple-950/20 font-semibold text-coral-900 dark:text-purple-200'
                            : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name={q.id}
                          disabled={readOnly}
                          checked={val === opt}
                          onChange={() => handleAnswerChange(q.id, opt)}
                          className="text-coral-500 dark:text-purple-400 focus:ring-coral-500"
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                )}

                {/* 9. Multiple Choice Checkboxes */}
                {q.type === 'multiple_choice' && (
                  <div className="space-y-2">
                    {(q.options || []).map((opt, oIdx) => {
                      const isChecked = Array.isArray(val) && val.includes(opt)
                      return (
                        <label
                          key={oIdx}
                          className={`flex items-center gap-3 p-3 rounded-lg border text-xs cursor-pointer transition-colors ${
                            isChecked
                              ? 'border-coral-500 bg-coral-50/50 dark:border-purple-500 dark:bg-purple-950/20 font-semibold text-coral-900 dark:text-purple-200'
                              : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            disabled={readOnly}
                            checked={isChecked}
                            onChange={() => handleCheckboxToggle(q.id, opt)}
                            className="rounded text-coral-500 dark:text-purple-400 focus:ring-coral-500"
                          />
                          <span>{opt}</span>
                        </label>
                      )
                    })}
                  </div>
                )}

                {/* 10. Yes/No Toggle */}
                {q.type === 'yes_no' && (
                  <div className="flex items-center gap-3">
                    {['Yes', 'No'].map(choice => (
                      <button
                        key={choice}
                        type="button"
                        disabled={readOnly}
                        onClick={() => handleAnswerChange(q.id, choice)}
                        className={`px-5 py-2 rounded-lg font-semibold text-xs border transition-colors ${
                          val === choice
                            ? choice === 'Yes'
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-rose-600 text-white border-rose-600'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {choice}
                      </button>
                    ))}
                  </div>
                )}

                {/* 11. Date */}
                {q.type === 'date' && (
                  <input
                    type="date"
                    disabled={readOnly}
                    className="input w-full sm:w-64"
                    value={val || ''}
                    onChange={e => handleAnswerChange(q.id, e.target.value)}
                  />
                )}

                {/* 12. Time */}
                {q.type === 'time' && (
                  <input
                    type="time"
                    disabled={readOnly}
                    className="input w-full sm:w-48"
                    value={val || ''}
                    onChange={e => handleAnswerChange(q.id, e.target.value)}
                  />
                )}

                {/* 13. Datetime */}
                {q.type === 'datetime' && (
                  <input
                    type="datetime-local"
                    disabled={readOnly}
                    className="input w-full sm:w-72"
                    value={val || ''}
                    onChange={e => handleAnswerChange(q.id, e.target.value)}
                  />
                )}

                {/* 14. URL */}
                {q.type === 'url' && (
                  <input
                    type="url"
                    disabled={readOnly}
                    placeholder={q.placeholder || 'https://github.com/...'}
                    className="input w-full"
                    value={val || ''}
                    onChange={e => handleAnswerChange(q.id, e.target.value)}
                  />
                )}

                {/* 15. Rating / Scale */}
                {q.type === 'rating' && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {Array.from({ length: q.rating_max || 5 }).map((_, rIdx) => {
                      const score = rIdx + 1
                      const isSelected = Number(val) === score
                      return (
                        <button
                          key={score}
                          type="button"
                          disabled={readOnly}
                          onClick={() => handleAnswerChange(q.id, score)}
                          className={`w-10 h-10 rounded-xl font-bold text-xs flex items-center justify-center border transition-all ${
                            isSelected
                              ? 'bg-coral-500 dark:bg-purple-600 text-white border-coral-500 dark:border-purple-600 shadow-sm scale-105'
                              : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
                          }`}
                        >
                          {score}
                        </button>
                      )
                    })}
                    <span className="text-xs text-slate-400 ml-2">
                      (1 = Poor, {q.rating_max || 5} = Excellent)
                    </span>
                  </div>
                )}

                {/* 16. File Upload */}
                {q.type === 'file' && (
                  <div className="space-y-2">
                    {val && (val.filename || val.file_url) ? (
                      <div className="p-3 bg-surface dark:bg-midnight-900 border border-border-default rounded-xl flex items-center justify-between gap-3 shadow-xs">
                        <div className="flex items-center gap-3 overflow-hidden">
                          {val.content_type?.startsWith('image/') || val.file_url?.match(/\.(jpeg|jpg|png|gif|webp)($|\?)/i) ? (
                            <div className="w-12 h-12 rounded-lg overflow-hidden border border-border-default bg-cream-100 dark:bg-midnight-800 shrink-0">
                              <img
                                src={val.file_url}
                                alt="Uploaded preview"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-cream-200 dark:bg-midnight-800 flex items-center justify-center text-lg shrink-0 text-coral-600">
                              📄
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className="text-xs font-semibold text-slate-900 dark:text-white truncate block">
                              {val.filename || 'Uploaded Document'}
                            </span>
                            <div className="flex items-center gap-2 mt-0.5">
                              {val.size_bytes && (
                                <span className="text-[10px] text-slate-400">
                                  ({(val.size_bytes / 1024).toFixed(1)} KB)
                                </span>
                              )}
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                ✓ Uploaded
                              </span>
                            </div>
                            {val.file_url && (
                              <a
                                href={val.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-coral-600 dark:text-coral-400 hover:underline mt-0.5 inline-block"
                              >
                                View full file ↗
                              </a>
                            )}
                          </div>
                        </div>
                        {!readOnly && (
                          <button
                            type="button"
                            onClick={() => handleAnswerChange(q.id, null)}
                            className="btn-secondary btn-sm text-[11px] text-rose-600 hover:text-rose-700"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <label
                          className={`p-4 rounded-xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-1.5 ${
                            uploadingField === q.id
                              ? 'border-coral-500 bg-coral-500/10'
                              : 'border-border-default hover:border-coral-500/60 bg-cream-50/60 dark:bg-midnight-900/60 hover:bg-cream-100/50'
                          }`}
                        >
                          <div className="w-9 h-9 rounded-full bg-cream-200 dark:bg-midnight-800 text-slate-600 dark:text-slate-300 flex items-center justify-center text-sm font-bold">
                            📷
                          </div>
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                            {uploadingField === q.id ? 'Uploading image...' : 'Click to select picture or file'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Allowed: {q.allowed_extensions?.join(', ') || 'png, jpg, jpeg, pdf'} (Max {q.max_size_mb || 15}MB)
                          </span>
                          <input
                            type="file"
                            disabled={readOnly || uploadingField === q.id}
                            className="hidden"
                            accept={q.allowed_extensions ? q.allowed_extensions.map(e => `.${e}`).join(',') : 'image/*,.pdf'}
                            onChange={e => {
                              const f = e.target.files?.[0]
                              if (f) handleFileUpload(q.id, f, q.allowed_extensions, q.max_size_mb)
                            }}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Error Message */}
              {errorMsg && <p className="text-xs font-semibold text-rose-600 pt-0.5">{errorMsg}</p>}
            </div>
          )
        })}
      </div>

      {/* Action Buttons */}
      {!readOnly && (
        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          {previewMode ? (
            <button type="submit" className="btn-primary text-xs">
              Test Form Submission (Preview Only)
            </button>
          ) : (
            <button type="submit" disabled={submitting} className="btn-primary text-xs">
              {submitting ? 'Submitting Registration…' : 'Submit Event Registration'}
            </button>
          )}
        </div>
      )}
    </form>
  )
}

