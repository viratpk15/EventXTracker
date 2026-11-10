const rawEnvBase = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '').trim()
const BASE = rawEnvBase
  ? (rawEnvBase.endsWith('/api/v1') ? rawEnvBase : `${rawEnvBase.replace(/\/+$/, '')}/api/v1`)
  : '/api/v1'

export function getApiBaseUrl(): string {
  return BASE
}

export function resolveFileUrl(url: string | null | undefined): string {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url
  }
  if (BASE.startsWith('http://') || BASE.startsWith('https://')) {
    const origin = BASE.replace(/\/api\/v1\/?$/, '')
    const cleanUrl = url.startsWith('/') ? url : `/${url}`
    return `${origin}${cleanUrl}`
  }
  return url
}

export function getToken(): string | null {
  return localStorage.getItem('ex_token')
}

export function getAccountType(): string | null {
  return localStorage.getItem('ex_type')
}

export function determineLoginPath(role?: string | null): string {
  const clean = (role || '').toUpperCase()
  if (clean === 'FACULTY') return '/faculty/login'
  if (clean === 'AUTHORITY') return '/authority/login'
  return '/student/login'
}

async function req(path: string, opts: RequestInit = {}): Promise<any> {
  const token = getToken()
  const isFormData = opts.body instanceof FormData

  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(opts.headers as Record<string, string> || {}),
  }
  if (!isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(BASE + path, {
    ...opts,
    headers,
  })

  if (res.status === 401) {
    const target = determineLoginPath(localStorage.getItem('ex_type'))
    localStorage.removeItem('ex_token')
    localStorage.removeItem('ex_type')
    try { sessionStorage.clear() } catch {}
    window.location.replace(`${window.location.origin}${target}`)
    throw new Error('Unauthorized')
  }

  if (!res.ok) {
    let detail = res.statusText
    try {
      const errData = await res.json()
      detail = errData.detail || detail
    } catch {
      /* ignore non-json error */
    }
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail))
  }

  // Check if response is a blob/file
  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('application/pdf') || contentType.includes('text/csv')) {
    return res.blob()
  }

  return res.json()
}

export const api = {
  get: (p: string) => req(p),
  post: (p: string, body?: any) => req(p, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  put: (p: string, body?: any) => req(p, { method: 'PUT', body: JSON.stringify(body ?? {}) }),
  patch: (p: string, body?: any) => req(p, { method: 'PATCH', body: JSON.stringify(body ?? {}) }),
  del: (p: string) => req(p, { method: 'DELETE' }),
  delete: (p: string) => req(p, { method: 'DELETE' }),

  postForm: async (p: string, formData: FormData) => {
    return req(p, { method: 'POST', body: formData })
  },

  login: async (email: string, password: string) => {
    const r = await req('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    localStorage.setItem('ex_token', r.access_token)
    localStorage.setItem('ex_type', r.account_type)
    return r
  },

  studentLogin: async (email: string, password: string) => {
    const r = await req('/auth/student/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    localStorage.setItem('ex_token', r.access_token)
    localStorage.setItem('ex_type', 'STUDENT')
    return r
  },

  facultyLogin: async (email: string, password: string) => {
    const r = await req('/auth/faculty/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    localStorage.setItem('ex_token', r.access_token)
    localStorage.setItem('ex_type', 'FACULTY')
    return r
  },

  authorityLogin: async (email: string, password: string) => {
    const r = await req('/authority/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    localStorage.setItem('ex_token', r.access_token)
    localStorage.setItem('ex_type', 'AUTHORITY')
    return r
  },

  download: async (path: string, filename: string) => {
    const blob = await req(path)
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(url)
  },

  logout: (navigateFn?: (path: string) => void) => {
    const role = localStorage.getItem('ex_type')
    const target = determineLoginPath(role)
    localStorage.removeItem('ex_token')
    localStorage.removeItem('ex_type')
    try {
      sessionStorage.clear()
    } catch {}

    if (typeof navigateFn === 'function') {
      try {
        navigateFn(target)
      } catch {}
    }
    window.location.replace(`${window.location.origin}${target}`)
  },

  getDemoCredentials: () => req('/demo/credentials'),
  getDemoStatus: () => req('/authority/demo-status'),
  purgeDemoData: () => req('/authority/purge-seed-data', { method: 'POST' }),
  reseedDemoData: () => req('/authority/reseed-demo-data', { method: 'POST' }),

  resolveFileUrl,
  getBaseUrl: getApiBaseUrl,
}
