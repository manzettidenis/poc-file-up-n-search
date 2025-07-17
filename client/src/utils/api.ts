// API configuration - environment aware
const isDevelopment = import.meta.env.DEV || window.location.hostname === 'localhost'
const API_BASE_URL =
  isDevelopment && window.location.port !== '80'
    ? 'http://localhost:3001/api' // Local development
    : '/api' // Docker/Production (nginx proxy)

// API response interface
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Custom error class for API errors
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// Generic API request handler
export async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  try {
    const url = `${API_BASE_URL}${endpoint}`

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })

    if (!response.ok) {
      throw new ApiError(`HTTP ${response.status}: ${response.statusText}`, response.status)
    }

    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      throw new ApiError(
        'Backend server not reachable or returned invalid response. Make sure the backend is running on port 3001.',
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

    // Network or other errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new ApiError('Cannot connect to backend server. Make sure the backend is running on port 3001.')
    }

    throw new ApiError(error instanceof Error ? error.message : 'Network error occurred')
  }
}

// File upload with proper error handling
export async function uploadFile(file: File): Promise<any> {
  try {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      throw new ApiError(`Upload failed: ${response.statusText}`, response.status)
    }

    const data: ApiResponse<any> = await response.json()

    if (!data.success) {
      throw new ApiError(data.error || 'Upload failed')
    }

    return data.data
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }

    throw new ApiError(error instanceof Error ? error.message : 'Upload failed')
  }
}

// Search files
export async function searchFiles(query: string): Promise<any> {
  return apiRequest(`/search?q=${encodeURIComponent(query)}`)
}

// Get all files
export async function getFiles(): Promise<any> {
  return apiRequest('/files')
}

// Delete file
export async function deleteFile(id: string): Promise<void> {
  return apiRequest(`/files/${id}`, {
    method: 'DELETE',
  })
}
