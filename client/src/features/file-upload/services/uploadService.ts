import { FileEntity } from '../../../core/types/api'

export interface UploadProgress {
  loaded: number
  total: number
  percentage: number
}

/**
 * Upload a file with progress tracking
 */
export const uploadFile = async (file: File, onProgress?: (progress: UploadProgress) => void): Promise<FileEntity> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const formData = new FormData()
    formData.append('file', file)

    // Track upload progress
    if (onProgress) {
      xhr.upload.addEventListener('progress', event => {
        if (event.lengthComputable) {
          const progress: UploadProgress = {
            loaded: event.loaded,
            total: event.total,
            percentage: Math.round((event.loaded * 100) / event.total),
          }
          onProgress(progress)
        }
      })
    }

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText)
          if (response.success) {
            resolve(response.data)
          } else {
            reject(new Error(response.error || 'Upload failed'))
          }
        } catch (error) {
          reject(new Error('Invalid response from server'))
        }
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`))
      }
    })

    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload'))
    })

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload was cancelled'))
    })

    const isDevelopment = import.meta.env.DEV || window.location.hostname === 'localhost'
    const baseURL = isDevelopment && window.location.port !== '80' ? 'http://localhost:3001/api' : '/api'

    xhr.open('POST', `${baseURL}/upload`)
    xhr.send(formData)
  })
}

/**
 * Validate file before upload
 */
export const validateFile = (file: File): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []

  // Size validation (50MB)
  if (file.size > 50 * 1024 * 1024) {
    errors.push('File size cannot exceed 50MB')
  }

  // Type validation
  const allowedTypes = [
    'text/plain',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/tiff',
    'image/bmp',
  ]

  if (!allowedTypes.includes(file.type)) {
    errors.push(`File type ${file.type} is not supported`)
  }

  // Name validation
  if (!file.name || file.name.trim().length === 0) {
    errors.push('File name cannot be empty')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Get list of supported file formats
 */
export const getSupportedFormats = (): string[] => {
  return ['TXT', 'PDF', 'DOC', 'DOCX', 'Images (PNG, JPG, JPEG, TIFF, BMP, WebP)']
}

/**
 * Get HTML accept attribute for file input
 */
export const getAcceptAttribute = (): string => {
  return '.txt,.pdf,.doc,.docx,.jpg,.jpeg,.png,.tiff,.bmp,.webp'
}

/**
 * Check if file type is supported
 */
export const isFileTypeSupported = (fileType: string): boolean => {
  const allowedTypes = [
    'text/plain',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/tiff',
    'image/bmp',
  ]
  return allowedTypes.includes(fileType)
}

/**
 * Get maximum allowed file size in bytes
 */
export const getMaxFileSize = (): number => {
  return 50 * 1024 * 1024 // 50MB
}

/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Export all functions as a service object for compatibility
export const uploadService = {
  uploadFile,
  validateFile,
  getSupportedFormats,
  getAcceptAttribute,
  isFileTypeSupported,
  getMaxFileSize,
  formatFileSize,
} as const
