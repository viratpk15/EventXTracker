export type QuestionType =
  | 'short_text'
  | 'paragraph'
  | 'email'
  | 'phone'
  | 'number'
  | 'currency'
  | 'dropdown'
  | 'single_choice'
  | 'multiple_choice'
  | 'yes_no'
  | 'date'
  | 'time'
  | 'datetime'
  | 'url'
  | 'file'
  | 'rating'
  | 'section_heading'
  | 'instruction'

export interface FormCondition {
  depends_on_question_id: string
  operator: 'equals' | 'not_equals' | 'in' | 'not_empty'
  value?: string | string[]
}

export interface FormQuestion {
  id: string
  type: QuestionType
  title: string
  description?: string
  placeholder?: string
  required?: boolean
  section?: string
  order?: number
  options?: string[]
  min_length?: number
  max_length?: number
  min?: number
  max?: number
  allowed_extensions?: string[]
  max_size_mb?: number
  currency_symbol?: string
  rating_max?: number
  conditional?: FormCondition
}

export interface FormVersionInfo {
  version: number
  title: string
  published_at: string | null
  questions_count: number
  submissions_count: number
  is_current: boolean
}

export interface EventFormData {
  form_id: number | null
  title: string
  description: string
  version: number
  published_version: number
  published_at?: string | null
  has_draft?: boolean
  questions: FormQuestion[]
}

