import React, { useState } from 'react'
import { FormQuestion } from '../../types/form'
import { DynamicFormRenderer } from './DynamicFormRenderer'
import {
  IconX,
  IconUserCheck,
  IconUsers,
  IconLayers,
  IconDownload,
  IconPaperclip,
  IconShield,
  IconSparkles,
  IconEye,
  IconExternalLink
} from '../ui/Icons'

interface MultiFormPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  eventId?: number
  eventName?: string
  eventDescription?: string
  eventCategory?: string
  minTeamSize?: number
  maxTeamSize?: number
  pptTemplateUrl?: string
  requireIdProof?: boolean
  ideaPptRequired?: boolean
  customFormTitle?: string
  customFormDescription?: string
  customQuestions?: FormQuestion[]
  publishedVersion?: number
  isDraft?: boolean
  initialTab?: 'individual' | 'team' | 'custom'
}

export const MultiFormPreviewModal: React.FC<MultiFormPreviewModalProps> = ({
  isOpen,
  onClose,
  eventId = 1,
  eventName = 'Campus Technical Event',
  eventDescription = '',
  eventCategory = 'Technical',
  minTeamSize = 2,
  maxTeamSize = 4,
  pptTemplateUrl,
  requireIdProof = true,
  ideaPptRequired = true,
  customFormTitle,
  customFormDescription,
  customQuestions = [],
  publishedVersion = 0,
  isDraft = false,
  initialTab = 'custom'
}) => {
  const [activeFormTab, setActiveFormTab] = useState<'individual' | 'team' | 'custom'>(initialTab)
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'mobile'>('desktop')

  // Simulation state for individual preview
  const [indivPreview, setIndivPreview] = useState({
    phone: '9876543210',
    project_title: 'Smart Campus IoT Traffic Management',
    abstract: 'An autonomous computer vision and edge IoT system to optimize campus traffic junctions and parking availability.',
    pitch_deck_url: 'https://storage.vvce.ac.in/decks/team-pitch.pdf',
    id_proof_url: 'https://storage.vvce.ac.in/proofs/id.jpg'
  })

  // Simulation state for team preview
  const [teamPreview, setTeamPreview] = useState({
    team_name: 'CyberKnights',
    project_title: 'Autonomous Campus UAV Surveillance',
    problem_statement: 'Manual surveillance of university premises during large events has significant latency and blind spots.',
    proposed_solution: 'Automated drone patrol with edge AI detection for emergency crowd monitoring and perimeter security.',
    tech_stack: 'ROS2, PyTorch, YOLOv8, FastAPI, WebRTC',
    pitch_deck_url: 'https://storage.vvce.ac.in/decks/cyberknights-pitch.pdf',
    id_proof_url: 'https://storage.vvce.ac.in/proofs/leader-id.jpg',
    member_usns: '1VV23CSE015, 1VV23CSE042'
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div className={`bg-white dark:bg-[#0E1017] rounded-3xl border border-border-default shadow-2xl flex flex-col max-h-[92vh] w-full transition-all duration-300 ${
        deviceMode === 'mobile' ? 'max-w-md' : 'max-w-4xl'
      }`}>
        {/* Top Header Bar */}
        <div className="p-4 sm:p-5 border-b border-border-default flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 bg-slate-50/50 dark:bg-[#121520]/50 rounded-t-3xl">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold text-sm">
                <IconEye size={15} />
              </span>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                All 3 Forms Preview Console
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 font-mono">
                Simulation Mode
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Interactive preview of Default Individual, Default Team, and Custom Dynamic Form specifications.
            </p>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            {/* Viewport switch */}
            <div className="p-1 rounded-xl bg-slate-200 dark:bg-slate-800 flex items-center gap-1 text-xs">
              <button
                type="button"
                onClick={() => setDeviceMode('desktop')}
                className={`px-2.5 py-1 rounded-lg font-bold transition ${
                  deviceMode === 'desktop'
                    ? 'bg-white dark:bg-[#0E1017] text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Desktop View"
              >
                💻 Desktop
              </button>
              <button
                type="button"
                onClick={() => setDeviceMode('mobile')}
                className={`px-2.5 py-1 rounded-lg font-bold transition ${
                  deviceMode === 'mobile'
                    ? 'bg-white dark:bg-[#0E1017] text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Mobile View"
              >
                📱 Mobile
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 flex items-center justify-center transition active:scale-95"
              title="Close Preview"
            >
              <IconX size={16} />
            </button>
          </div>
        </div>

        {/* 3 Form Tabs Switcher */}
        <div className="p-2 sm:px-5 bg-slate-100 dark:bg-[#0B0D13] border-b border-border-default flex overflow-x-auto gap-1.5 scrollbar-none shrink-0">
          <button
            type="button"
            onClick={() => setActiveFormTab('individual')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
              activeFormTab === 'individual'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
            }`}
          >
            <IconUserCheck size={14} />
            <span>1. Default Individual Form</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              activeFormTab === 'individual' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}>
              Default
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFormTab('team')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
              activeFormTab === 'team'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
            }`}
          >
            <IconUsers size={14} />
            <span>2. Default Team Form</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              activeFormTab === 'team' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}>
              {minTeamSize}-{maxTeamSize}p
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFormTab('custom')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
              activeFormTab === 'custom'
                ? 'bg-purple-600 text-white shadow-sm shadow-purple-900/30'
                : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
            }`}
          >
            <IconLayers size={14} />
            <span>3. Custom Dynamic Form</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              activeFormTab === 'custom' ? 'bg-white/20 text-white' : 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
            }`}>
              {isDraft ? 'Draft' : publishedVersion > 0 ? `v${publishedVersion}` : 'Custom'}
            </span>
          </button>
        </div>

        {/* Scrollable Preview Content */}
        <div className="p-4 sm:p-7 overflow-y-auto space-y-5 flex-1">
          {/* TAB 1: DEFAULT INDIVIDUAL FORM */}
          {activeFormTab === 'individual' && (
            <div className="space-y-5 max-w-2xl mx-auto animate-in fade-in">
              <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 space-y-1">
                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
                  Form 1 Preview · Individual Contestant Entry
                </span>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                  {eventName} — Individual Registration
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {eventDescription || 'Fill in contact details, project abstract, pitch presentation, and student verification.'}
                </p>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
                    Contact Mobile / WhatsApp Number *
                  </label>
                  <input
                    type="tel"
                    className="input w-full font-mono py-2.5 rounded-xl"
                    value={indivPreview.phone}
                    onChange={e => setIndivPreview({ ...indivPreview, phone: e.target.value })}
                    placeholder="e.g. 9876543210"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Used for official coordinating WhatsApp communications.</span>
                </div>

                {ideaPptRequired && (
                  <>
                    <div>
                      <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
                        Project / Idea Title *
                      </label>
                      <input
                        className="input w-full py-2.5 rounded-xl font-medium"
                        value={indivPreview.project_title}
                        onChange={e => setIndivPreview({ ...indivPreview, project_title: e.target.value })}
                        placeholder="Title of your project or presentation"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
                        Problem Statement / Abstract *
                      </label>
                      <textarea
                        rows={3}
                        className="input w-full py-2 rounded-xl"
                        value={indivPreview.abstract}
                        onChange={e => setIndivPreview({ ...indivPreview, abstract: e.target.value })}
                        placeholder="Summary of your solution..."
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">
                        Presentation Slide Deck / Proposal URL *
                      </label>
                      <input
                        className="input w-full font-mono py-2.5 rounded-xl"
                        value={indivPreview.pitch_deck_url}
                        onChange={e => setIndivPreview({ ...indivPreview, pitch_deck_url: e.target.value })}
                        placeholder="https://storage.vvce.ac.in/decks/individual-pitch.pdf"
                      />

                      {pptTemplateUrl && (
                        <div className="p-3 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                            <span className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">📥</span>
                            <span className="font-semibold">Official Faculty Coordinator PPT Template Attached</span>
                          </div>
                          <a
                            href={pptTemplateUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition flex items-center gap-1 shadow-2xs"
                          >
                            <IconDownload size={13} />
                            <span>Download Template</span>
                          </a>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {requireIdProof && (
                  <div>
                    <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
                      Student College ID Card Photo Proof *
                    </label>
                    <div className="p-4 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-center space-y-1.5">
                      <span className="text-xl">🪪</span>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Student ID Card Upload Simulation</p>
                      <p className="text-[11px] text-slate-400">Accepts PNG, JPG or PDF under 10 MB.</p>
                      {indivPreview.id_proof_url && (
                        <span className="inline-block px-3 py-1 rounded-lg bg-white dark:bg-slate-900 border border-border-default text-slate-600 dark:text-slate-300 text-[11px] font-mono">
                          {indivPreview.id_proof_url}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="button"
                    className="btn btn-primary w-full py-3 text-xs sm:text-sm font-bold uppercase tracking-wider shadow-md shadow-blue-500/20"
                    onClick={() => alert('This is a preview simulation. Form inputs validate and behave exactly like the live participant portal.')}
                  >
                    Submit Individual Registration (Preview)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DEFAULT TEAM REGISTRATION FORM */}
          {activeFormTab === 'team' && (
            <div className="space-y-5 max-w-2xl mx-auto animate-in fade-in">
              <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 space-y-1">
                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
                  Form 2 Preview · Team Registration Workspace
                </span>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                  {eventName} — Form a Team ({minTeamSize} – {maxTeamSize} Members)
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Every invited member must accept their invite before shortlisting. Single-purpose registration policy active.
                </p>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
                    Team Name *
                  </label>
                  <input
                    className="input w-full font-bold py-2.5 rounded-xl"
                    value={teamPreview.team_name}
                    onChange={e => setTeamPreview({ ...teamPreview, team_name: e.target.value })}
                    placeholder="e.g. CyberKnights"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
                    Project / Idea Title
                  </label>
                  <input
                    className="input w-full py-2.5 rounded-xl font-medium"
                    value={teamPreview.project_title}
                    onChange={e => setTeamPreview({ ...teamPreview, project_title: e.target.value })}
                    placeholder="e.g. Smart Campus Traffic AI"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
                    Problem Statement
                  </label>
                  <textarea
                    rows={2}
                    className="input w-full py-2 rounded-xl"
                    value={teamPreview.problem_statement}
                    onChange={e => setTeamPreview({ ...teamPreview, problem_statement: e.target.value })}
                    placeholder="What problem does this project solve?"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
                    Proposed Solution
                  </label>
                  <textarea
                    rows={2}
                    className="input w-full py-2 rounded-xl"
                    value={teamPreview.proposed_solution}
                    onChange={e => setTeamPreview({ ...teamPreview, proposed_solution: e.target.value })}
                    placeholder="Technical approach, architecture, or workflow..."
                  />
                </div>

                <div>
                  <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
                    Technology Stack / Tools
                  </label>
                  <input
                    className="input w-full py-2.5 rounded-xl font-mono"
                    value={teamPreview.tech_stack}
                    onChange={e => setTeamPreview({ ...teamPreview, tech_stack: e.target.value })}
                    placeholder="e.g. React, FastAPI, PyTorch, ESP32"
                  />
                </div>

                {ideaPptRequired && (
                  <div className="space-y-2">
                    <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">
                      Pitch Deck (PPT/PDF URL or Upload Link) *
                    </label>
                    <input
                      className="input w-full font-mono py-2.5 rounded-xl"
                      value={teamPreview.pitch_deck_url}
                      onChange={e => setTeamPreview({ ...teamPreview, pitch_deck_url: e.target.value })}
                      placeholder="https://storage.vvce.ac.in/decks/team-pitch.pdf"
                    />

                    {pptTemplateUrl && (
                      <div className="p-3 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                          <span className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">📥</span>
                          <span className="font-semibold">Official Presentation Template Available</span>
                        </div>
                        <a
                          href={pptTemplateUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition flex items-center gap-1 shadow-2xs"
                        >
                          <IconDownload size={13} />
                          <span>Download Template</span>
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {requireIdProof && (
                  <div>
                    <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
                      Team Leader College ID Proof URL *
                    </label>
                    <input
                      className="input w-full font-mono py-2.5 rounded-xl"
                      value={teamPreview.id_proof_url}
                      onChange={e => setTeamPreview({ ...teamPreview, id_proof_url: e.target.value })}
                      placeholder="https://storage.vvce.ac.in/proofs/id.jpg"
                    />
                  </div>
                )}

                <div>
                  <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
                    Invite Member USNs (Comma separated)
                  </label>
                  <input
                    className="input w-full font-mono py-2.5 rounded-xl"
                    value={teamPreview.member_usns}
                    onChange={e => setTeamPreview({ ...teamPreview, member_usns: e.target.value })}
                    placeholder="1VV23CSE002, 1VV23CSE003"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Team limit: {minTeamSize} to {maxTeamSize} members including team leader.
                  </span>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    className="btn btn-primary w-full py-3 text-xs sm:text-sm font-bold uppercase tracking-wider shadow-md shadow-blue-500/20"
                    onClick={() => alert('This is a preview simulation. In live execution, team members receive instant portal invitations.')}
                  >
                    Submit Team Registration & Dispatch Invitations (Preview)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CUSTOM DYNAMIC FORM */}
          {activeFormTab === 'custom' && (
            <div className="space-y-5 max-w-2xl mx-auto animate-in fade-in">
              <div className="p-4 rounded-2xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                    Form 3 Preview · Dynamic Form Schema
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 font-mono">
                    {isDraft ? 'Draft Canvas Preview' : publishedVersion > 0 ? `v${publishedVersion} Active` : 'Custom Schema'}
                  </span>
                </div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                  {customFormTitle || eventName}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {customFormDescription || 'Custom questions tailored by the Faculty Coordinator using the Dynamic Form Studio.'}
                </p>
              </div>

              {customQuestions.length === 0 ? (
                <div className="p-12 text-center space-y-3 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
                  <span className="text-3xl block">📋</span>
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">No custom questions added yet</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Use the question palette on the left or select an institutional template (Hackathon, Project Expo, Workshop) to populate custom fields.
                  </p>
                </div>
              ) : (
                <DynamicFormRenderer
                  eventId={eventId || 1}
                  form={{
                    form_id: 1,
                    version: publishedVersion || 1,
                    published_version: publishedVersion || 1,
                    title: customFormTitle || eventName,
                    description: customFormDescription || eventDescription,
                    questions: customQuestions,
                  }}
                  previewMode={true}
                  onSubmitSuccess={(subData) => {
                    alert(`Preview validation passed! Form submitted successfully with answers: ${JSON.stringify(subData.answers, null, 2)}`)
                  }}
                />
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-border-default flex items-center justify-between bg-slate-50 dark:bg-[#121520] rounded-b-3xl text-xs text-slate-500">
          <span>Viewing: <b>{activeFormTab === 'individual' ? 'Default Individual Form' : activeFormTab === 'team' ? 'Default Team Form' : 'Custom Dynamic Form'}</b></span>
          <button
            type="button"
            onClick={onClose}
            className="btn-outline px-4 py-1.5 rounded-xl font-bold text-xs"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  )
}
export default MultiFormPreviewModal