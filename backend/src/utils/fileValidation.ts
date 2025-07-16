import fs from 'fs/promises'
import path from 'path'

// Magic bytes for file type validation
const FILE_SIGNATURES = {
  'text/plain': [],
  'application/pdf': [0x25, 0x50, 0x44, 0x46], // %PDF
  'image/jpeg': [0xff, 0xd8, 0xff],
  'image/png': [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  'application/msword': [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [0x50, 0x4b, 0x03, 0x04],
}

const ALLOWED_EXTENSIONS = ['.txt', '.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png']
const ALLOWED_MIME_TYPES = [
  'text/plain',
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

const DANGEROUS_EXTENSIONS = [
  '.exe',
  '.bat',
  '.cmd',
  '.com',
  '.pif',
  '.scr',
  '.vbs',
  '.js',
  '.jar',
  '.sh',
  '.py',
  '.pl',
  '.php',
  '.asp',
  '.aspx',
  '.jsp',
  '.ps1',
]

interface FileValidationResult {
  isValid: boolean
  error?: string
  sanitizedName?: string
}

export class FileValidator {
  /**
   * Validates file extension against allowed types
   */
  static validateExtension(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase()
    return ALLOWED_EXTENSIONS.includes(ext) && !DANGEROUS_EXTENSIONS.includes(ext)
  }

  /**
   * Validates MIME type against allowed types
   */
  static validateMimeType(mimetype: string): boolean {
    return ALLOWED_MIME_TYPES.includes(mimetype)
  }

  /**
   * Validates file magic bytes against expected signature
   */
  static async validateMagicBytes(filePath: string, expectedMimeType: string): Promise<boolean> {
    try {
      const expectedSignature = FILE_SIGNATURES[expectedMimeType as keyof typeof FILE_SIGNATURES]

      // Text files don't have magic bytes
      if (expectedMimeType === 'text/plain') {
        return await this.validateTextFile(filePath)
      }

      if (!expectedSignature || expectedSignature.length === 0) {
        return true // Skip validation for unsupported types
      }

      const buffer = await fs.readFile(filePath)
      const fileSignature = Array.from(buffer.slice(0, expectedSignature.length))

      return expectedSignature.every((byte, index) => byte === fileSignature[index])
    } catch (error) {
      console.error('Error validating magic bytes:', error)
      return false
    }
  }

  /**
   * Validates text files are actually text (not binary)
   */
  static async validateTextFile(filePath: string): Promise<boolean> {
    try {
      const buffer = await fs.readFile(filePath)
      const sample = buffer.slice(0, 1024) // Check first 1KB

      // Check for null bytes (common in binary files)
      for (let i = 0; i < sample.length; i++) {
        if (sample[i] === 0) {
          return false
        }
      }

      // Try to decode as UTF-8
      const text = sample.toString('utf-8')
      const reEncoded = Buffer.from(text, 'utf-8')

      // If re-encoding produces different bytes, it's likely binary
      return sample.equals(reEncoded.slice(0, sample.length))
    } catch (error) {
      return false
    }
  }

  /**
   * Sanitizes filename to prevent path traversal and other attacks
   */
  static sanitizeFilename(filename: string): string {
    // Remove path separators and dangerous characters
    let sanitized = filename.replace(/[/\\:*?"<>|]/g, '_')

    // Remove leading/trailing dots and spaces
    sanitized = sanitized.replace(/^[.\s]+|[.\s]+$/g, '')

    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '')

    // Limit length
    const ext = path.extname(sanitized)
    const name = path.basename(sanitized, ext)
    const maxNameLength = 100

    if (name.length > maxNameLength) {
      sanitized = name.substring(0, maxNameLength) + ext
    }

    // Ensure it's not empty or just an extension
    if (!sanitized || sanitized === ext) {
      sanitized = `file_${Date.now()}${ext}`
    }

    return sanitized
  }

  /**
   * Validates file size
   */
  static validateFileSize(size: number, maxSize: number = 50 * 1024 * 1024): boolean {
    return size > 0 && size <= maxSize
  }

  /**
   * Comprehensive file validation
   */
  static async validateFile(
    filePath: string,
    originalName: string,
    mimetype: string,
    size: number,
  ): Promise<FileValidationResult> {
    // 1. Validate file size
    if (!this.validateFileSize(size)) {
      return {
        isValid: false,
        error: 'File size exceeds maximum allowed size (50MB)',
      }
    }

    // 2. Sanitize filename
    const sanitizedName = this.sanitizeFilename(originalName)

    // 3. Validate extension
    if (!this.validateExtension(sanitizedName)) {
      return {
        isValid: false,
        error: 'File type not supported or potentially dangerous',
      }
    }

    // 4. Validate MIME type
    if (!this.validateMimeType(mimetype)) {
      return {
        isValid: false,
        error: 'MIME type not supported',
      }
    }

    // 5. Validate magic bytes
    const magicBytesValid = await this.validateMagicBytes(filePath, mimetype)
    if (!magicBytesValid) {
      return {
        isValid: false,
        error: 'File content does not match declared type',
      }
    }

    return {
      isValid: true,
      sanitizedName,
    }
  }
}
