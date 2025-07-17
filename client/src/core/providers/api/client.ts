import { ApiResponse, ApiError } from '../../types/api'

// API configuration
const isDevelopment = import.meta.env.DEV || window.location.hostname === 'localhost'
const API_BASE_URL = isDevelopment && window.location.port !== '80' ? 'http://localhost:3001/api' : '/api'

export interface RequestConfig extends RequestInit {
  timeout?: number
}

export class ApiClient {
  private baseURL: string
  private defaultTimeout: number

  constructor(baseURL: string = API_BASE_URL, timeout: number = 30000) {
    this.baseURL = baseURL
    this.defaultTimeout = timeout
  }

  async request<T>(endpoint: string, config: RequestConfig = {}): Promise<T> {
    const { timeout = this.defaultTimeout, ...fetchConfig } = config
    const url = `${this.baseURL}${endpoint}`

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const response = await fetch(url, {
        ...fetchConfig,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...fetchConfig.headers,
        },
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new ApiError(`HTTP ${response.status}: ${response.statusText}`, response.status)
      }

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        throw new ApiError(
          'Backend server not reachable or returned invalid response. Make sure the backend is running.',
        )
      }

      const data: ApiResponse<T> = await response.json()

      if (!data.success) {
        throw new ApiError(data.error || 'API request failed')
      }

      return data.data as T
    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new ApiError('Request timeout')
        }
        if (error.message.includes('fetch')) {
          throw new ApiError('Cannot connect to backend server. Make sure the backend is running.')
        }
        throw new ApiError(error.message)
      }

      throw new ApiError('Network error occurred')
    }
  }

  async get<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'GET' })
  }

  async post<T>(endpoint: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async postFormData<T>(endpoint: string, formData: FormData, config?: RequestConfig): Promise<T> {
    const { headers, ...restConfig } = config || {}
    const cleanHeaders: Record<string, string> = {}

    // Copy headers except Content-Type (let browser set it with boundary for FormData)
    if (headers) {
      Object.entries(headers).forEach(([key, value]) => {
        if (key !== 'Content-Type' && typeof value === 'string') {
          cleanHeaders[key] = value
        }
      })
    }

    return this.request<T>(endpoint, {
      ...restConfig,
      method: 'POST',
      body: formData,
      headers: cleanHeaders,
    })
  }

  async delete<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' })
  }
}

// Default client instance
export const apiClient = new ApiClient()
