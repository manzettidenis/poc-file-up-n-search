import { apiClient } from '../../../core/providers/api/client'

/**
 * Delete a file by ID
 */
export const deleteFile = async (fileId: string): Promise<void> => {
  try {
    await apiClient.delete(`/files/${fileId}`)
  } catch (error) {
    console.error('Failed to delete file:', error)
    throw error
  }
}

/**
 * Get file view URL
 */
export const getFileViewUrl = (filename: string): string => {
  const isDevelopment = import.meta.env.DEV || window.location.hostname === 'localhost'
  const baseURL = isDevelopment && window.location.port !== '80' ? 'http://localhost:3001' : ''

  return `${baseURL}/uploads/${filename}`
}

/**
 * Format file size in human-readable format
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Format date string for display
 */
export const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return 'Invalid date'
  }
}

/**
 * Get file icon based on MIME type
 */
export const getFileIcon = (mimetype: string): string => {
  if (mimetype.startsWith('image/')) return '🖼️'
  if (mimetype === 'application/pdf') return '📄'
  if (mimetype.includes('word') || mimetype.includes('document')) return '📝'
  if (mimetype === 'text/plain') return '📄'
  return '📎'
}

/**
 * Get human-readable file type label
 */
export const getFileTypeLabel = (mimetype: string): string => {
  const typeMap: Record<string, string> = {
    'text/plain': 'Text Document',
    'application/pdf': 'PDF Document',
    'application/msword': 'Word Document',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word Document',
    'image/jpeg': 'JPEG Image',
    'image/png': 'PNG Image',
    'image/webp': 'WebP Image',
    'image/tiff': 'TIFF Image',
    'image/bmp': 'BMP Image',
  }

  return typeMap[mimetype] || mimetype
}

/**
 * Truncate text to specified length
 */
export const truncateText = (text: string, maxLength: number = 200): string => {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

/**
 * Check if file type is an image
 */
export const isImageFile = (mimetype: string): boolean => {
  return mimetype.startsWith('image/')
}

/**
 * Check if file type is a document
 */
export const isDocumentFile = (mimetype: string): boolean => {
  return (
    mimetype === 'application/pdf' ||
    mimetype.includes('word') ||
    mimetype.includes('document') ||
    mimetype === 'text/plain'
  )
}

/**
 * Get file extension from filename
 */
export const getFileExtension = (filename: string): string => {
  const lastDotIndex = filename.lastIndexOf('.')
  return lastDotIndex !== -1 ? filename.substring(lastDotIndex + 1).toLowerCase() : ''
}

/**
 * Generate download URL for file
 */
export const getDownloadUrl = (filename: string): string => {
  const isDevelopment = import.meta.env.DEV || window.location.hostname === 'localhost'
  const baseURL = isDevelopment && window.location.port !== '80' ? 'http://localhost:3001' : ''

  return `${baseURL}/api/files/download/${encodeURIComponent(filename)}`
}

/**
 * Calculate reading time estimate for text content
 */
export const estimateReadingTime = (text: string): string => {
  const wordsPerMinute = 200 // Average reading speed
  const wordCount = text.trim().split(/\s+/).length
  const minutes = Math.ceil(wordCount / wordsPerMinute)

  if (minutes < 1) return 'Less than 1 min'
  if (minutes === 1) return '1 min read'
  return `${minutes} min read`
}

// Export all functions as a service object for compatibility
export const fileService = {
  deleteFile,
  getFileViewUrl,
  formatFileSize,
  formatDate,
  getFileIcon,
  getFileTypeLabel,
  truncateText,
  isImageFile,
  isDocumentFile,
  getFileExtension,
  getDownloadUrl,
  estimateReadingTime,
} as const
