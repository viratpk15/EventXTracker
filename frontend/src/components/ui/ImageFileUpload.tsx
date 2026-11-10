import React, { useState, useRef } from 'react'
import { api } from '../../api'
import { IconPaperclip, IconX, IconCheckCircle, IconEye, IconAlertTriangle } from './Icons'

export interface ImageFileUploadProps {
  label?: string
  value?: string
  onChange: (url: string) => void
  accept?: string
  placeholder?: string
  required?: boolean
  helperText?: string
  maxSizeMb?: number
  uploadEndpoint?: string
  allowDirectUrl?: boolean
}

export const ImageFileUpload: React.FC<ImageFileUploadProps> = ({
  label,
  value,
  onChange,
  accept = 'image/*',
  placeholder = 'Click or drag image to upload',
  required = false,
  helperText,
  maxSizeMb = 15,
  uploadEndpoint = '/upload',
  allowDirectUrl = true,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [localPreview, setLocalPreview] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string>('')
  const [fileSize, setFileSize] = useState<number | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showUrlFallback, setShowUrlFallback] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)

  const isImage = (urlOrPreview: string) => {
    if (!urlOrPreview) return false
    return (
      urlOrPreview.startsWith('data:image/') ||
      urlOrPreview.match(/\.(jpeg|jpg|png|gif|webp|svg)($|\?)/i) ||
      urlOrPreview.includes('/files/download/')
    )
  }

  const handleFileChange = async (file: File) => {
    setError(null)

    // Check file size
    if (file.size > maxSizeMb * 1024 * 1024) {
      setError(`File size exceeds maximum allowed ${maxSizeMb}MB`)
      return
    }

    setFileName(file.name)
    setFileSize(file.size)

    // Generate local instant preview if image
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = e => {
        setLocalPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    } else {
      setLocalPreview(null)
    }

    // Upload to server
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await api.postForm(uploadEndpoint, formData)
      if (res && res.file_url) {
        onChange(res.file_url)
      } else {
        throw new Error('Upload succeeded but no file URL returned')
      }
    } catch (err: any) {
      setError(err.message || 'File upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleClear = () => {
    setLocalPreview(null)
    setFileName('')
    setFileSize(null)
    setError(null)
    onChange('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const currentDisplay = localPreview || value

  return (
    <div className="space-y-1.5 text-xs">
      {label && (
        <div className="flex items-center justify-between">
          <label className="label mb-0">
            {label} {required && <span className="text-coral-500 font-bold">*</span>}
          </label>
          {allowDirectUrl && (
            <button
              type="button"
              onClick={() => setShowUrlFallback(!showUrlFallback)}
              className="text-[10px] text-slate-500 hover:text-coral-600 dark:hover:text-lime-400 transition-colors"
            >
              {showUrlFallback ? '← Use File Upload' : 'Paste URL instead'}
            </button>
          )}
        </div>
      )}

      {showUrlFallback ? (
        <div className="space-y-1">
          <input
            className="input font-mono text-xs"
            placeholder="https://example.com/image.png"
            value={value || ''}
            onChange={e => onChange(e.target.value)}
          />
          <span className="text-[10px] text-slate-400 block">Direct URL linked</span>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Active Preview Card */}
          {currentDisplay ? (
            <div className="relative group p-3 rounded-xl border border-border-default bg-surface dark:bg-midnight-900 shadow-sm flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 overflow-hidden">
                {isImage(currentDisplay) ? (
                  <div className="w-14 h-14 rounded-lg overflow-hidden border border-border-default bg-cream-100 dark:bg-midnight-800 shrink-0 relative">
                    <img
                      src={currentDisplay}
                      alt="Uploaded preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-cream-200 dark:bg-midnight-800 flex items-center justify-center text-xl shrink-0 font-bold text-navy-700 dark:text-lime-400">
                    📄
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 dark:text-white truncate text-xs">
                    {fileName || (value ? value.split('/').pop() : 'Uploaded File')}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {fileSize && (
                      <span className="text-[10px] text-slate-400">
                        {(fileSize / 1024).toFixed(1)} KB
                      </span>
                    )}
                    {uploading ? (
                      <span className="text-[10px] text-coral-600 dark:text-lime-400 font-semibold animate-pulse flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-coral-500 dark:bg-lime-400 animate-ping" />
                        Uploading…
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <IconCheckCircle size={12} />
                        Uploaded & Ready
                      </span>
                    )}
                  </div>
                  {value && (
                    <a
                      href={value}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-coral-600 dark:text-lime-400 hover:underline flex items-center gap-1 mt-0.5 font-medium"
                    >
                      <IconEye size={11} />
                      View full file
                    </a>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-secondary btn-sm text-[11px] py-1 px-2.5"
                  disabled={uploading}
                >
                  Change
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                  title="Remove file"
                  disabled={uploading}
                >
                  <IconX size={15} />
                </button>
              </div>
            </div>
          ) : (
            /* Upload Dropzone Box */
            <div
              onDragOver={e => {
                e.preventDefault()
                setIsDragOver(true)
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={e => {
                e.preventDefault()
                setIsDragOver(false)
                const f = e.dataTransfer.files?.[0]
                if (f) handleFileChange(f)
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`p-5 rounded-xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-2 group ${
                isDragOver
                  ? 'border-coral-500 bg-coral-500/10 dark:border-lime-400 dark:bg-lime-400/10'
                  : 'border-border-default hover:border-coral-500/60 dark:hover:border-lime-400/60 bg-cream-50/50 dark:bg-midnight-900/60 hover:bg-cream-100/50 dark:hover:bg-midnight-800/60'
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-cream-200 dark:bg-midnight-800 text-slate-500 dark:text-slate-300 group-hover:text-coral-600 dark:group-hover:text-lime-400 group-hover:scale-110 flex items-center justify-center transition-all">
                <IconPaperclip size={18} />
              </div>
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                  {placeholder}
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                  Click to select file or drag & drop here (Max {maxSizeMb}MB)
                </p>
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={e => {
              const f = e.target.files?.[0]
              if (f) handleFileChange(f)
            }}
          />

          {error && (
            <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 text-[11px] font-medium pt-0.5">
              <IconAlertTriangle size={13} />
              <span>{error}</span>
            </div>
          )}

          {helperText && !error && (
            <p className="text-[10px] text-slate-400 dark:text-slate-500">{helperText}</p>
          )}
        </div>
      )}
    </div>
  )
}

export default ImageFileUpload

