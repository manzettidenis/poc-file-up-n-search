import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiClient } from '../../../../core/api/client'
import {
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
  fileService,
} from '../fileService'

// Mock the API client
vi.mock('../../../../core/api/client', () => ({
  apiClient: {
    delete: vi.fn(),
  },
}))

const mockApiClient = vi.mocked(apiClient)

// Mock environment
Object.defineProperty(import.meta, 'env', {
  value: {
    DEV: true,
  },
  configurable: true,
})

Object.defineProperty(window, 'location', {
  value: {
    hostname: 'localhost',
    port: '3000',
  },
  configurable: true,
})

describe('fileService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      mockApiClient.delete.mockResolvedValue(undefined)

      await deleteFile('test-file-id')

      expect(mockApiClient.delete).toHaveBeenCalledWith('/files/test-file-id')
    })

    it('should handle delete errors', async () => {
      const error = new Error('Delete failed')
      mockApiClient.delete.mockRejectedValue(error)
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await expect(deleteFile('test-file-id')).rejects.toThrow('Delete failed')
      expect(consoleSpy).toHaveBeenCalledWith('Failed to delete file:', error)

      consoleSpy.mockRestore()
    })
  })

  describe('getFileViewUrl', () => {
    it('should generate view URL for development environment', () => {
      const url = getFileViewUrl('test.txt')
      expect(url).toBe('http://localhost:3001/uploads/test.txt')
    })

    it('should generate view URL for production environment', () => {
      // Mock production environment
      Object.defineProperty(import.meta, 'env', {
        value: { DEV: false },
        configurable: true,
      })
      Object.defineProperty(window, 'location', {
        value: { hostname: 'example.com', port: '80' },
        configurable: true,
      })

      const url = getFileViewUrl('test.txt')
      expect(url).toBe('/uploads/test.txt')

      // Restore
      Object.defineProperty(import.meta, 'env', {
        value: { DEV: true },
        configurable: true,
      })
      Object.defineProperty(window, 'location', {
        value: { hostname: 'localhost', port: '3000' },
        configurable: true,
      })
    })
  })

  describe('formatFileSize', () => {
    it('should format zero bytes', () => {
      expect(formatFileSize(0)).toBe('0 Bytes')
    })

    it('should format bytes', () => {
      expect(formatFileSize(512)).toBe('512 Bytes')
    })

    it('should format kilobytes', () => {
      expect(formatFileSize(1024)).toBe('1 KB')
      expect(formatFileSize(1536)).toBe('1.5 KB')
    })

    it('should format megabytes', () => {
      expect(formatFileSize(1024 * 1024)).toBe('1 MB')
      expect(formatFileSize(1.5 * 1024 * 1024)).toBe('1.5 MB')
    })

    it('should format gigabytes', () => {
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB')
      expect(formatFileSize(2.5 * 1024 * 1024 * 1024)).toBe('2.5 GB')
    })

    it('should handle decimal precision', () => {
      expect(formatFileSize(1234)).toBe('1.21 KB')
      expect(formatFileSize(1234567)).toBe('1.18 MB')
    })
  })

  describe('formatDate', () => {
    it('should format valid date strings', () => {
      const date = '2023-01-15T10:30:00Z'
      const formatted = formatDate(date)

      // The exact format may vary by locale, but should contain basic date elements
      expect(formatted).toMatch(/2023/)
      expect(formatted).toMatch(/Jan/)
      expect(formatted).toMatch(/15/)
    })

    it('should handle invalid date strings', () => {
      // JavaScript Date constructor doesn't throw for invalid dates
      // It creates an invalid Date object that returns "Invalid Date" when formatted
      const invalidDate = new Date('invalid-date')
      expect(invalidDate.toString()).toContain('Invalid Date')

      // The actual formatDate function will try to format it and may return something unexpected
      // Let's test with a more realistic invalid date scenario
      expect(formatDate('')).toBe('Invalid Date')
      expect(formatDate('not-a-date')).toBe('Invalid Date')

      // For truly invalid dates, JavaScript Date constructor creates an invalid Date
      // which when formatted with toLocaleDateString returns "Invalid Date"
      const result = formatDate('invalid-date')
      expect(result).toBe('Invalid Date')
    })

    it('should format edge case dates', () => {
      const leapYear = '2024-02-29T12:00:00Z'
      const formatted = formatDate(leapYear)
      expect(formatted).toMatch(/2024/)
      expect(formatted).toMatch(/Feb/)
      expect(formatted).toMatch(/29/)
    })
  })

  describe('getFileIcon', () => {
    it('should return correct icons for different file types', () => {
      expect(getFileIcon('image/jpeg')).toBe('🖼️')
      expect(getFileIcon('image/png')).toBe('🖼️')
      expect(getFileIcon('application/pdf')).toBe('📄')
      expect(getFileIcon('application/msword')).toBe('📝')
      expect(getFileIcon('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe('📝')
      expect(getFileIcon('text/plain')).toBe('📄')
      expect(getFileIcon('application/unknown')).toBe('📎')
    })

    it('should handle edge cases', () => {
      expect(getFileIcon('')).toBe('📎')
      expect(getFileIcon('invalid')).toBe('📎')
      expect(getFileIcon('image/')).toBe('🖼️') // partial match
    })
  })

  describe('getFileTypeLabel', () => {
    it('should return human-readable labels for known types', () => {
      expect(getFileTypeLabel('text/plain')).toBe('Text Document')
      expect(getFileTypeLabel('application/pdf')).toBe('PDF Document')
      expect(getFileTypeLabel('application/msword')).toBe('Word Document')
      expect(getFileTypeLabel('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe(
        'Word Document',
      )
      expect(getFileTypeLabel('image/jpeg')).toBe('JPEG Image')
      expect(getFileTypeLabel('image/png')).toBe('PNG Image')
      expect(getFileTypeLabel('image/webp')).toBe('WebP Image')
      expect(getFileTypeLabel('image/tiff')).toBe('TIFF Image')
      expect(getFileTypeLabel('image/bmp')).toBe('BMP Image')
    })

    it('should return the mimetype for unknown types', () => {
      expect(getFileTypeLabel('application/unknown')).toBe('application/unknown')
      expect(getFileTypeLabel('video/mp4')).toBe('video/mp4')
    })
  })

  describe('truncateText', () => {
    it('should not truncate short text', () => {
      const shortText = 'This is a short text'
      expect(truncateText(shortText)).toBe(shortText)
      expect(truncateText(shortText, 100)).toBe(shortText)
    })

    it('should truncate long text with default length', () => {
      const longText = 'x'.repeat(250)
      const result = truncateText(longText)
      expect(result).toBe('x'.repeat(200) + '...')
      expect(result.length).toBe(203) // 200 + '...'
    })

    it('should truncate with custom length', () => {
      const longText = 'This is a very long text that should be truncated'
      const result = truncateText(longText, 10)
      expect(result).toBe('This is a ...')
      expect(result.length).toBe(13) // 10 + '...'
    })

    it('should handle edge cases', () => {
      expect(truncateText('', 10)).toBe('')
      expect(truncateText('short', 10)).toBe('short')
      expect(truncateText('exactly ten', 10)).toBe('exactly te...')
    })
  })

  describe('isImageFile', () => {
    it('should identify image files correctly', () => {
      expect(isImageFile('image/jpeg')).toBe(true)
      expect(isImageFile('image/png')).toBe(true)
      expect(isImageFile('image/gif')).toBe(true)
      expect(isImageFile('image/webp')).toBe(true)
      expect(isImageFile('image/svg+xml')).toBe(true)
    })

    it('should reject non-image files', () => {
      expect(isImageFile('text/plain')).toBe(false)
      expect(isImageFile('application/pdf')).toBe(false)
      expect(isImageFile('video/mp4')).toBe(false)
      expect(isImageFile('audio/mp3')).toBe(false)
    })

    it('should handle edge cases', () => {
      expect(isImageFile('')).toBe(false)
      expect(isImageFile('image')).toBe(false) // incomplete type
      expect(isImageFile('image/')).toBe(true) // starts with image/
    })
  })

  describe('isDocumentFile', () => {
    it('should identify document files correctly', () => {
      expect(isDocumentFile('application/pdf')).toBe(true)
      expect(isDocumentFile('application/msword')).toBe(true)
      expect(isDocumentFile('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe(true)
      expect(isDocumentFile('text/plain')).toBe(true)
    })

    it('should reject non-document files', () => {
      expect(isDocumentFile('image/jpeg')).toBe(false)
      expect(isDocumentFile('video/mp4')).toBe(false)
      expect(isDocumentFile('audio/mp3')).toBe(false)
      expect(isDocumentFile('application/zip')).toBe(false)
    })

    it('should handle partial matches', () => {
      expect(isDocumentFile('application/vnd.ms-word')).toBe(true) // contains 'word'
      expect(isDocumentFile('application/document-something')).toBe(true) // contains 'document'
    })
  })

  describe('getFileExtension', () => {
    it('should extract extensions correctly', () => {
      expect(getFileExtension('test.txt')).toBe('txt')
      expect(getFileExtension('document.pdf')).toBe('pdf')
      expect(getFileExtension('image.jpeg')).toBe('jpeg')
      expect(getFileExtension('archive.tar.gz')).toBe('gz') // last extension
    })

    it('should handle files without extensions', () => {
      expect(getFileExtension('README')).toBe('')
      expect(getFileExtension('file-without-extension')).toBe('')
    })

    it('should handle edge cases', () => {
      expect(getFileExtension('')).toBe('')
      expect(getFileExtension('.')).toBe('')
      expect(getFileExtension('.hidden')).toBe('hidden')
      expect(getFileExtension('file.')).toBe('')
    })

    it('should normalize to lowercase', () => {
      expect(getFileExtension('file.TXT')).toBe('txt')
      expect(getFileExtension('document.PDF')).toBe('pdf')
      expect(getFileExtension('image.JPEG')).toBe('jpeg')
    })
  })

  describe('getDownloadUrl', () => {
    it('should generate download URL for development', () => {
      const url = getDownloadUrl('test file.txt')
      expect(url).toBe('http://localhost:3001/api/files/download/test%20file.txt')
    })

    it('should generate download URL for production', () => {
      // Mock production environment
      Object.defineProperty(import.meta, 'env', {
        value: { DEV: false },
        configurable: true,
      })
      Object.defineProperty(window, 'location', {
        value: { hostname: 'example.com', port: '80' },
        configurable: true,
      })

      const url = getDownloadUrl('test file.txt')
      expect(url).toBe('/api/files/download/test%20file.txt')

      // Restore
      Object.defineProperty(import.meta, 'env', {
        value: { DEV: true },
        configurable: true,
      })
      Object.defineProperty(window, 'location', {
        value: { hostname: 'localhost', port: '3000' },
        configurable: true,
      })
    })

    it('should encode special characters', () => {
      const url = getDownloadUrl('file with spaces & symbols.txt')
      expect(url).toContain('file%20with%20spaces%20%26%20symbols.txt')
    })
  })

  describe('estimateReadingTime', () => {
    it('should estimate reading time correctly', () => {
      const shortText = 'This is a short text with ten words here.'
      // With 10 words at 200 wpm, it's 0.05 minutes, which rounds up to 1 minute
      expect(estimateReadingTime(shortText)).toBe('1 min read')

      const mediumText = 'word '.repeat(200) // 200 words
      expect(estimateReadingTime(mediumText)).toBe('1 min read')

      const longText = 'word '.repeat(400) // 400 words
      expect(estimateReadingTime(longText)).toBe('2 min read')
    })

    it('should handle edge cases', () => {
      // Empty string: 0 words, rounds up to 1 minute
      expect(estimateReadingTime('')).toBe('1 min read')
      // Whitespace only: 0 words, rounds up to 1 minute
      expect(estimateReadingTime('   ')).toBe('1 min read')
      // Single word: 1 word, rounds up to 1 minute
      expect(estimateReadingTime('single')).toBe('1 min read')
    })

    it('should handle different text formats', () => {
      const textWithPunctuation = 'This is a sentence. This is another sentence! And this is a third sentence?'
      // 15 words, rounds up to 1 minute
      expect(estimateReadingTime(textWithPunctuation)).toBe('1 min read')

      const textWithNewlines = 'Line one.\nLine two.\nLine three.'
      // 6 words, rounds up to 1 minute
      expect(estimateReadingTime(textWithNewlines)).toBe('1 min read')
    })
  })

  describe('fileService object', () => {
    it('should export all functions', () => {
      expect(fileService).toEqual({
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
      })
    })

    it('should maintain function references', () => {
      expect(typeof fileService.deleteFile).toBe('function')
      expect(typeof fileService.getFileViewUrl).toBe('function')
      expect(typeof fileService.formatFileSize).toBe('function')
      expect(typeof fileService.formatDate).toBe('function')
      expect(typeof fileService.getFileIcon).toBe('function')
      expect(typeof fileService.getFileTypeLabel).toBe('function')
      expect(typeof fileService.truncateText).toBe('function')
      expect(typeof fileService.isImageFile).toBe('function')
      expect(typeof fileService.isDocumentFile).toBe('function')
      expect(typeof fileService.getFileExtension).toBe('function')
      expect(typeof fileService.getDownloadUrl).toBe('function')
      expect(typeof fileService.estimateReadingTime).toBe('function')
    })
  })

  describe('integration scenarios', () => {
    it('should format file information for display', () => {
      const fileSize = 1024 * 1024 // 1MB
      const uploadDate = '2023-01-15T10:30:00Z'
      const filename = 'document.pdf'

      const formattedSize = formatFileSize(fileSize)
      const formattedDate = formatDate(uploadDate)
      const icon = getFileIcon('application/pdf')
      const typeLabel = getFileTypeLabel('application/pdf')
      const extension = getFileExtension(filename)

      expect(formattedSize).toBe('1 MB')
      expect(formattedDate).toMatch(/2023/)
      expect(icon).toBe('📄')
      expect(typeLabel).toBe('PDF Document')
      expect(extension).toBe('pdf')
    })

    it('should handle file type categorization', () => {
      const imageFile = 'image/jpeg'
      const documentFile = 'application/pdf'
      const unknownFile = 'application/unknown'

      expect(isImageFile(imageFile)).toBe(true)
      expect(isDocumentFile(imageFile)).toBe(false)

      expect(isImageFile(documentFile)).toBe(false)
      expect(isDocumentFile(documentFile)).toBe(true)

      expect(isImageFile(unknownFile)).toBe(false)
      expect(isDocumentFile(unknownFile)).toBe(false)
    })

    it('should prepare file for display with all utilities', () => {
      const filename = 'My Document.pdf'
      const size = 2.5 * 1024 * 1024 // 2.5MB
      const content = 'word '.repeat(500) // 500 words
      const mimetype = 'application/pdf'
      const uploadDate = '2023-01-15T10:30:00Z'

      const displayInfo = {
        icon: getFileIcon(mimetype),
        typeLabel: getFileTypeLabel(mimetype),
        formattedSize: formatFileSize(size),
        formattedDate: formatDate(uploadDate),
        extension: getFileExtension(filename),
        readingTime: estimateReadingTime(content),
        truncatedContent: truncateText(content, 100),
        viewUrl: getFileViewUrl(filename),
        downloadUrl: getDownloadUrl(filename),
        isImage: isImageFile(mimetype),
        isDocument: isDocumentFile(mimetype),
      }

      expect(displayInfo.icon).toBe('📄')
      expect(displayInfo.typeLabel).toBe('PDF Document')
      expect(displayInfo.formattedSize).toBe('2.5 MB')
      expect(displayInfo.extension).toBe('pdf')
      expect(displayInfo.readingTime).toBe('3 min read')
      expect(displayInfo.truncatedContent.length).toBeLessThanOrEqual(103) // 100 + '...'
      expect(displayInfo.viewUrl).toContain('My Document.pdf')
      expect(displayInfo.downloadUrl).toContain('My%20Document.pdf')
      expect(displayInfo.isImage).toBe(false)
      expect(displayInfo.isDocument).toBe(true)
    })
  })
})
