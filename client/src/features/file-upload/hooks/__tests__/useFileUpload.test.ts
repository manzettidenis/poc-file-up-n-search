import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createRoot, createSignal } from 'solid-js'
import { useFileUpload } from '../useFileUpload'
import { uploadService } from '../../services/uploadService'
import { notificationStore } from '../../../../core/stores/notifications'

// Mock dependencies
vi.mock('../../services/uploadService')
vi.mock('../../../../core/stores/notifications')

const mockUploadService = vi.mocked(uploadService)
const mockNotificationStore = vi.mocked(notificationStore)

describe('useFileUpload Hook - Business Logic Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset notification store state
    mockNotificationStore.error = vi.fn()
    mockNotificationStore.success = vi.fn()
  })

  it('should initialize with correct default state', () => {
    createRoot(() => {
      const upload = useFileUpload()
      const state = upload.state()

      expect(state.isUploading).toBe(false)
      expect(state.progress).toBe(null)
      expect(state.dragOver).toBe(false)
      expect(state.lastUploadedFile).toBe(null)
    })
  })

  it('should handle file validation failure', async () => {
    // Mock invalid file validation
    mockUploadService.validateFile.mockReturnValue({
      isValid: false,
      errors: ['File too large', 'Invalid format'],
    })

    createRoot(async () => {
      const upload = useFileUpload()
      const mockFile = new File(['content'], 'test.txt', { type: 'text/plain' })

      const result = await upload.uploadFile(mockFile)

      // Should return null on validation failure
      expect(result).toBe(null)

      // Should show error notification
      expect(mockNotificationStore.error).toHaveBeenCalledWith('Upload Failed', 'File too large, Invalid format')

      // Should not call upload service
      expect(mockUploadService.uploadFile).not.toHaveBeenCalled()

      // State should remain unchanged
      expect(upload.state().isUploading).toBe(false)
    })
  })

  it('should handle successful file upload with progress tracking', async () => {
    const mockUploadedFile = {
      id: '123',
      filename: 'test.txt',
      originalName: 'test.txt',
      mimetype: 'text/plain',
      size: 1000,
      path: '/uploads/test.txt',
      extractedText: 'content',
      metadata: {},
      uploadedAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
    }

    // Mock successful validation
    mockUploadService.validateFile.mockReturnValue({
      isValid: true,
      errors: [],
    })

    // Mock successful upload with progress
    mockUploadService.uploadFile.mockImplementation(async (file, onProgress) => {
      // Simulate progress updates
      if (onProgress) {
        onProgress({ loaded: 500, total: 1000, percentage: 50 })
        onProgress({ loaded: 1000, total: 1000, percentage: 100 })
      }
      return mockUploadedFile
    })

    createRoot(async () => {
      const upload = useFileUpload()
      const mockFile = new File(['content'], 'test.txt', { type: 'text/plain' })

      // Track state changes
      const stateChanges: any[] = []
      const [_, setState] = createSignal(upload.state())

      // Monitor state changes
      const unsubscribe = upload.state

      const result = await upload.uploadFile(mockFile)

      // Should return uploaded file
      expect(result).toEqual(mockUploadedFile)

      // Should show success notification
      expect(mockNotificationStore.success).toHaveBeenCalledWith('Upload Successful', 'test.txt uploaded successfully')

      // Final state should be correct
      const finalState = upload.state()
      expect(finalState.isUploading).toBe(false)
      expect(finalState.progress).toBe(null)
      expect(finalState.lastUploadedFile).toEqual(mockUploadedFile)
    })
  })

  it('should handle upload error gracefully', async () => {
    // Mock successful validation but failed upload
    mockUploadService.validateFile.mockReturnValue({
      isValid: true,
      errors: [],
    })

    mockUploadService.uploadFile.mockRejectedValue(new Error('Network error'))

    createRoot(async () => {
      const upload = useFileUpload()
      const mockFile = new File(['content'], 'test.txt', { type: 'text/plain' })

      const result = await upload.uploadFile(mockFile)

      // Should return null on upload failure
      expect(result).toBe(null)

      // Should show error notification
      expect(mockNotificationStore.error).toHaveBeenCalledWith('Upload Failed', 'Network error')

      // State should be reset
      const state = upload.state()
      expect(state.isUploading).toBe(false)
      expect(state.progress).toBe(null)
    })
  })

  it('should manage drag state correctly', () => {
    createRoot(() => {
      const upload = useFileUpload()

      // Initial state
      expect(upload.state().dragOver).toBe(false)

      // Set drag over
      upload.setDragOver(true)
      expect(upload.state().dragOver).toBe(true)

      // Clear drag over
      upload.setDragOver(false)
      expect(upload.state().dragOver).toBe(false)
    })
  })

  it('should reset state correctly', () => {
    createRoot(() => {
      const upload = useFileUpload()

      // Modify state
      upload.setDragOver(true)

      // Reset
      upload.reset()

      const state = upload.state()
      expect(state.isUploading).toBe(false)
      expect(state.progress).toBe(null)
      expect(state.dragOver).toBe(false)
      expect(state.lastUploadedFile).toBe(null)
    })
  })

  it('should expose validation method', () => {
    const mockValidationResult = { isValid: true, errors: [] }
    mockUploadService.validateFile.mockReturnValue(mockValidationResult)

    createRoot(() => {
      const upload = useFileUpload()
      const mockFile = new File(['content'], 'test.txt', { type: 'text/plain' })

      const result = upload.validateFile(mockFile)

      expect(result).toEqual(mockValidationResult)
      expect(mockUploadService.validateFile).toHaveBeenCalledWith(mockFile)
    })
  })
})
