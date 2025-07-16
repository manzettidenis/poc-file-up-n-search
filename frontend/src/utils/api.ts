export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public statusText?: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export const handleApiResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    let errorMessage = `Request failed: ${response.status} ${response.statusText}`

    try {
      const errorData = await response.json()
      if (errorData.error) {
        errorMessage = errorData.error
      }
    } catch {
      // If we can't parse JSON, use the default error message
    }

    throw new ApiError(errorMessage, response.status, response.statusText)
  }

  const data = await response.json()

  if (!data.success) {
    throw new ApiError(data.error || 'Operation failed')
  }

  return data.data
}

export const checkNetworkConnection = async (): Promise<boolean> => {
  try {
    const response = await fetch('http://localhost:3001/health', {
      method: 'GET',
      cache: 'no-cache',
    })
    return response.ok
  } catch {
    return false
  }
}

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof ApiError) {
    return error.message
  }

  if (error instanceof Error) {
    if (error.message.includes('fetch')) {
      return 'Network connection failed. Please check if the server is running.'
    }
    return error.message
  }

  return 'An unknown error occurred'
}
