import validator from 'validator'
import DOMPurify from 'isomorphic-dompurify'

export class InputSanitizer {
  /**
   * Sanitizes search query to prevent injection attacks
   */
  static sanitizeSearchQuery(query: string): string {
    if (!query || typeof query !== 'string') {
      return ''
    }

    // Remove null bytes
    let sanitized = query.replace(/\0/g, '')

    // Limit length
    sanitized = sanitized.substring(0, 500)

    // Escape special regex characters for safe use in search
    sanitized = sanitized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

    // Trim whitespace
    sanitized = sanitized.trim()

    return sanitized
  }

  /**
   * Sanitizes HTML content to prevent XSS
   */
  static sanitizeHtml(input: string): string {
    if (!input || typeof input !== 'string') {
      return ''
    }

    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
    })
  }

  /**
   * Sanitizes filename for display (removes potential XSS)
   */
  static sanitizeFilename(filename: string): string {
    if (!filename || typeof filename !== 'string') {
      return 'unknown_file'
    }

    // HTML encode to prevent XSS
    let sanitized = validator.escape(filename)

    // Limit length for display
    if (sanitized.length > 255) {
      const ext = sanitized.substring(sanitized.lastIndexOf('.'))
      sanitized = sanitized.substring(0, 255 - ext.length) + '...' + ext
    }

    return sanitized
  }

  /**
   * Validates and sanitizes pagination parameters
   */
  static sanitizePagination(page?: string, limit?: string): { page: number; limit: number } {
    const defaultPage = 1
    const defaultLimit = 10
    const maxLimit = 100

    let sanitizedPage = defaultPage
    let sanitizedLimit = defaultLimit

    if (page && validator.isInt(page, { min: 1, max: 10000 })) {
      sanitizedPage = parseInt(page, 10)
    }

    if (limit && validator.isInt(limit, { min: 1, max: maxLimit })) {
      sanitizedLimit = parseInt(limit, 10)
    }

    return { page: sanitizedPage, limit: sanitizedLimit }
  }

  /**
   * Validates UUID format
   */
  static validateUUID(id: string): boolean {
    return validator.isUUID(id, 4)
  }

  /**
   * Sanitizes file metadata to prevent XSS
   */
  static sanitizeFileMetadata(metadata: any): any {
    if (!metadata || typeof metadata !== 'object') {
      return {}
    }

    const sanitized: any = {}

    for (const [key, value] of Object.entries(metadata)) {
      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeHtml(value)
      } else if (typeof value === 'number') {
        sanitized[key] = value
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map(v => (typeof v === 'string' ? this.sanitizeHtml(v) : v))
      }
    }

    return sanitized
  }

  /**
   * Rate limiting token generation for requests
   */
  static generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2)}`
  }

  /**
   * Validates request origin for CSRF protection
   */
  static validateOrigin(origin: string, allowedOrigins: string[]): boolean {
    return allowedOrigins.includes(origin)
  }
}
