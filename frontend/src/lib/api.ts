import { ApiErrorSchema, type ApiErrorCode } from 'shared'

/**
 * HTTP client for the PotholeWatch backend.
 *
 * The dev server proxies `/api` to http://localhost:3001, and the session is an
 * httpOnly cookie (`pw_session`), so requests are same-origin and always sent
 * with credentials.
 *
 * Typed responses: the `shared` workspace package owns the wire contract, and
 * every endpoint passes the matching schema as the `Validator`.
 */

/** Function that turns an untrusted JSON payload into a typed value. */
export type Validator<T> = (value: unknown) => T

export interface ApiErrorDetail {
  code: ApiErrorCode
  message: string
  status: number
  /** Present when the backend sends `error.details`. */
  details: unknown
}

/** Error for any non-2xx response, with the backend's machine-readable code. */
export class ApiError extends Error {
  readonly status: number
  readonly statusText: string
  readonly code: ApiErrorCode
  readonly details: unknown

  constructor(status: number, statusText: string, code: ApiErrorCode, message: string, details: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.statusText = statusText
    this.code = code
    this.details = details
  }
}

/** True when `error` is a typed API failure (use to branch on `error.code`). */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

/** Transport-level failure (network down, proxy error) rather than an API 4xx/5xx. */
export class NetworkError extends Error {
  constructor(cause: unknown) {
    super('Could not reach the PotholeWatch service. Check your connection and try again.')
    this.name = 'NetworkError'
    this.cause = cause
  }
}

export class ApiClient {
  private readonly baseUrl: string

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl.replace(/\/+$/, '')
  }

  get<T>(path: string, validate: Validator<T>, init: RequestInit = {}): Promise<T> {
    return this.request<T>(path, { ...init, method: 'GET' }, validate)
  }

  post<T>(path: string, body?: unknown, validate?: Validator<T>, init: RequestInit = {}): Promise<T> {
    return this.request<T>(path, { ...init, method: 'POST', body: encodeBody(body) }, validate)
  }

  patch<T>(path: string, body?: unknown, validate?: Validator<T>, init: RequestInit = {}): Promise<T> {
    return this.request<T>(path, { ...init, method: 'PATCH', body: encodeBody(body) }, validate)
  }

  async request<T>(path: string, init: RequestInit = {}, validate?: Validator<T>): Promise<T> {
    let response: Response
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        credentials: 'include',
        ...init,
        headers: {
          Accept: 'application/json',
          ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...init.headers,
        },
      })
    } catch (error: unknown) {
      throw new NetworkError(error)
    }

    const payload = await readBody(response)

    if (!response.ok) {
      throw describeApiError(response.status, response.statusText, payload)
    }

    return validate ? validate(payload) : (payload as T)
  }
}

/**
 * Normalises any non-2xx into an ApiError, preferring the backend's
 * `{ error: { message, code } }` envelope and falling back to the HTTP status.
 */
function describeApiError(status: number, statusText: string, payload: unknown): ApiError {
  const parsed = ApiErrorSchema.safeParse(payload)
  if (parsed.success) {
    return new ApiError(status, statusText, parsed.data.error.code, parsed.data.error.message, parsed.data.error.details)
  }
  return new ApiError(status, statusText, fallbackCode(status), fallbackMessage(status, statusText), payload)
}

function fallbackCode(status: number): ApiErrorCode {
  if (status === 401) return 'UNAUTHORIZED'
  if (status === 403) return 'FORBIDDEN'
  if (status === 404) return 'NOT_FOUND'
  if (status === 429) return 'RATE_LIMITED'
  if (status === 503) return 'SERVICE_UNAVAILABLE'
  return 'INTERNAL'
}

function fallbackMessage(status: number, statusText: string): string {
  if (status === 401) return 'Your session has expired. Please sign in again.'
  if (status === 403) return 'You do not have access to do that.'
  if (status === 404) return 'That item could not be found.'
  if (status >= 500) return 'The service is having trouble right now. Try again shortly.'
  return `Request failed: ${status} ${statusText}`.trim()
}

function encodeBody(body: unknown): string | undefined {
  return body === undefined ? undefined : JSON.stringify(body)
}

async function readBody(response: Response): Promise<unknown> {
  const raw = await response.text()
  if (raw.length === 0) {
    return undefined
  }
  try {
    return JSON.parse(raw) as unknown
  } catch {
    return raw
  }
}

export const apiClient = new ApiClient('/api')
