import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  uploadFile,
  validateFile,
  getSupportedFormats,
  getAcceptAttribute,
  isFileTypeSupported,
  getMaxFileSize,
  formatFileSize,
  uploadService,
  UploadProgress,
} from '../uploadService'
import { FileEntity } from '../../../../core/types/api'

// Mock XMLHttpRequest
const mockXMLHttpRequest = {
  open: vi.fn(),
  send: vi.fn(),
  setRequestHeader: vi.fn(),
  upload: {
    addEventListener: vi.fn(),
  },
  addEventListener: vi.fn(),
  status: 200,
  responseText: '',
}

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

describe('uploadServiceFunctional', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock XMLHttpRequest constructor
    global.XMLHttpRequest = vi.fn(() => mockXMLHttpRequest) as any
  })

  describe('uploadFile', () => {
    const mockFile = new File(['test content'], 'test.txt', {
      type: 'text/plain',
    })

    const mockFileEntity: FileEntity = {
      id: '1',
      filename: 'test.txt',
      originalName: 'test.txt',
      mimetype: 'text/plain',
      size: 100,
      path: '/uploads/test.txt',
      uploadedAt: '2023-01-01T00:00:00Z',
      lastModified: '2023-01-01T00:00:00Z',
      extractedText: 'test content',
      metadata: {},
    }

    it('should upload file successfully', async () => {
      mockXMLHttpRequest.responseText = JSON.stringify({
        success: true,
        data: mockFileEntity,
      })

      // Mock successful response
      setTimeout(() => {
        const loadEvent = { target: mockXMLHttpRequest }
        mockXMLHttpRequest.addEventListener.mock.calls.find(call => call[0] === 'load')[1](loadEvent)
      }, 0)

      const result = await uploadFile(mockFile)

      expect(result).toEqual(mockFileEntity)
      expect(mockXMLHttpRequest.open).toHaveBeenCalledWith('POST', 'http://localhost:3001/api/upload')
      expect(mockXMLHttpRequest.send).toHaveBeenCalled()
    })

    it('should track upload progress', async () => {
      const onProgress = vi.fn()
      let progressCallback: (event: any) => void

      mockXMLHttpRequest.upload.addEventListener.mockImplementation((event, callback) => {
        if (event === 'progress') {
          progressCallback = callback
        }
      })

      mockXMLHttpRequest.responseText = JSON.stringify({
        success: true,
        data: mockFileEntity,
      })

      // Start upload
      const uploadPromise = uploadFile(mockFile, onProgress)

      // Simulate progress event
      progressCallback!({
        lengthComputable: true,
        loaded: 50,
        total: 100,
      })

      // Simulate completion
      setTimeout(() => {
        const loadEvent = { target: mockXMLHttpRequest }
        mockXMLHttpRequest.addEventListener.mock.calls.find(call => call[0] === 'load')[1](loadEvent)
      }, 0)

      await uploadPromise

      expect(onProgress).toHaveBeenCalledWith({
        loaded: 50,
        total: 100,
        percentage: 50,
      })
    })

    it('should handle upload errors', async () => {
      mockXMLHttpRequest.status = 500

      setTimeout(() => {
        const loadEvent = { target: mockXMLHttpRequest }
        mockXMLHttpRequest.addEventListener.mock.calls.find(call => call[0] === 'load')[1](loadEvent)
      }, 0)

      await expect(uploadFile(mockFile)).rejects.toThrow('Upload failed with status 500')
    })

    it('should handle network errors', async () => {
      setTimeout(() => {
        mockXMLHttpRequest.addEventListener.mock.calls.find(call => call[0] === 'error')[1]()
      }, 0)

      await expect(uploadFile(mockFile)).rejects.toThrow('Network error during upload')
    })

    it('should handle upload cancellation', async () => {
      setTimeout(() => {
        mockXMLHttpRequest.addEventListener.mock.calls.find(call => call[0] === 'abort')[1]()
      }, 0)

      await expect(uploadFile(mockFile)).rejects.toThrow('Upload was cancelled')
    })

    it('should handle invalid server response', () => {
      const mockFile = new File(['content'], 'test.txt', { type: 'text/plain' })

      // Mock XMLHttpRequest
      const mockXHR = {
        open: vi.fn(),
        send: vi.fn(),
        addEventListener: vi.fn(),
        status: 500,
        responseText: 'Invalid JSON',
      }

      global.XMLHttpRequest = vi.fn(() => mockXHR) as any

      // Simulate response
      setTimeout(() => {
        const loadListener = mockXHR.addEventListener.mock.calls.find(call => call[0] === 'load')?.[1]
        if (loadListener) {
          loadListener()
        }
      }, 0)

      expect(uploadFile(mockFile)).rejects.toThrow('Upload failed with status 500')
    })

    it('should handle server error response', () => {
      const mockFile = new File(['content'], 'test.txt', { type: 'text/plain' })

      // Mock XMLHttpRequest
      const mockXHR = {
        open: vi.fn(),
        send: vi.fn(),
        addEventListener: vi.fn(),
        status: 500,
        responseText: '{"error": "Server error"}',
      }

      global.XMLHttpRequest = vi.fn(() => mockXHR) as any

      // Simulate response
      setTimeout(() => {
        const loadListener = mockXHR.addEventListener.mock.calls.find(call => call[0] === 'load')?.[1]
        if (loadListener) {
          loadListener()
        }
      }, 0)

      expect(uploadFile(mockFile)).rejects.toThrow('Upload failed with status 500')
    })
  })

  describe('validateFile', () => {
    it('should validate valid files', () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' })
      const result = validateFile(file)

      expect(result).toEqual({ isValid: true, errors: [] })
    })

    it('should reject files exceeding size limit', () => {
      const largeContent = 'x'.repeat(51 * 1024 * 1024) // 51MB
      const file = new File([largeContent], 'large.txt', { type: 'text/plain' })
      const result = validateFile(file)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('File size cannot exceed 50MB')
    })

    it('should reject unsupported file types', () => {
      const file = new File(['content'], 'test.exe', { type: 'application/exe' })
      const result = validateFile(file)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('File type application/exe is not supported')
    })

    it('should reject files with empty names', () => {
      const file = new File(['content'], '', { type: 'text/plain' })
      const result = validateFile(file)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('File name cannot be empty')
    })

    it('should reject files with whitespace-only names', () => {
      const file = new File(['content'], '   ', { type: 'text/plain' })
      const result = validateFile(file)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('File name cannot be empty')
    })

    it('should handle multiple validation errors', () => {
      const largeContent = 'x'.repeat(51 * 1024 * 1024)
      const file = new File([largeContent], '', { type: 'application/exe' })
      const result = validateFile(file)

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(3)
      expect(result.errors).toContain('File size cannot exceed 50MB')
      expect(result.errors).toContain('File type application/exe is not supported')
      expect(result.errors).toContain('File name cannot be empty')
    })

    it('should validate all supported file types', () => {
      const supportedTypes = [
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

      supportedTypes.forEach(type => {
        const file = new File(['content'], 'test.file', { type })
        const result = validateFile(file)
        expect(result.isValid).toBe(true)
      })
    })
  })

  describe('getSupportedFormats', () => {
    it('should return list of supported formats', () => {
      const formats = getSupportedFormats()

      expect(formats).toEqual(['TXT', 'PDF', 'DOC', 'DOCX', 'Images (PNG, JPG, JPEG, TIFF, BMP, WebP)'])
    })
  })

  describe('getAcceptAttribute', () => {
    it('should return accept attribute for file inputs', () => {
      const accept = getAcceptAttribute()

      expect(accept).toBe('.txt,.pdf,.doc,.docx,.jpg,.jpeg,.png,.tiff,.bmp,.webp')
    })
  })

  describe('isFileTypeSupported', () => {
    it('should return true for supported types', () => {
      const supportedTypes = ['text/plain', 'application/pdf', 'image/jpeg', 'image/png']

      supportedTypes.forEach(type => {
        expect(isFileTypeSupported(type)).toBe(true)
      })
    })

    it('should return false for unsupported types', () => {
      const unsupportedTypes = ['application/exe', 'video/mp4', 'audio/mp3', 'application/zip']

      unsupportedTypes.forEach(type => {
        expect(isFileTypeSupported(type)).toBe(false)
      })
    })
  })

  describe('getMaxFileSize', () => {
    it('should return maximum file size in bytes', () => {
      expect(getMaxFileSize()).toBe(50 * 1024 * 1024) // 50MB
    })
  })

  describe('formatFileSize', () => {
    it('should format file sizes correctly', () => {
      expect(formatFileSize(0)).toBe('0 Bytes')
      expect(formatFileSize(1024)).toBe('1 KB')
      expect(formatFileSize(1024 * 1024)).toBe('1 MB')
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB')
      expect(formatFileSize(1536)).toBe('1.5 KB') // 1.5 KB
    })

    it('should handle decimal places', () => {
      expect(formatFileSize(1234)).toBe('1.21 KB')
      expect(formatFileSize(1234567)).toBe('1.18 MB')
    })
  })

  describe('uploadService object', () => {
    it('should export all functions', () => {
      expect(uploadService).toEqual({
        uploadFile,
        validateFile,
        getSupportedFormats,
        getAcceptAttribute,
        isFileTypeSupported,
        getMaxFileSize,
        formatFileSize,
      })
    })

    it('should maintain function references', () => {
      expect(typeof uploadService.uploadFile).toBe('function')
      expect(typeof uploadService.validateFile).toBe('function')
      expect(typeof uploadService.getSupportedFormats).toBe('function')
      expect(typeof uploadService.getAcceptAttribute).toBe('function')
      expect(typeof uploadService.isFileTypeSupported).toBe('function')
      expect(typeof uploadService.getMaxFileSize).toBe('function')
      expect(typeof uploadService.formatFileSize).toBe('function')
    })
  })

  describe('integration scenarios', () => {
    it('should validate then upload a file', async () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' })

      // Validate first
      const validation = validateFile(file)
      expect(validation.isValid).toBe(true)

      // Mock successful upload
      mockXMLHttpRequest.status = 200
      mockXMLHttpRequest.responseText = JSON.stringify({
        success: true,
        data: {
          id: '1',
          filename: 'test.txt',
          originalName: 'test.txt',
          mimetype: 'text/plain',
          size: 100,
          path: '/uploads/test.txt',
          uploadedAt: '2023-01-01T00:00:00Z',
          lastModified: '2023-01-01T00:00:00Z',
          extractedText: 'content',
          metadata: {},
        },
      })

      setTimeout(() => {
        const loadEvent = { target: mockXMLHttpRequest }
        mockXMLHttpRequest.addEventListener.mock.calls.find(call => call[0] === 'load')[1](loadEvent)
      }, 0)

      const result = await uploadFile(file)
      expect(result.originalName).toBe('test.txt')
    })

    it('should handle validation rejection workflow', () => {
      const file = new File(['content'], 'test.exe', { type: 'application/exe' })

      const validation = validateFile(file)
      expect(validation.isValid).toBe(false)

      // Should not proceed to upload if validation fails
      expect(validation.errors.length).toBeGreaterThan(0)
    })

    it('should format file size for display', () => {
      const file = new File(['x'.repeat(1024)], 'test.txt', { type: 'text/plain' })
      const formattedSize = formatFileSize(file.size)

      expect(formattedSize).toBe('1 KB')
    })
  })
})
