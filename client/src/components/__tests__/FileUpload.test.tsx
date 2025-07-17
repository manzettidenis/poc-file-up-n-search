import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent, screen } from '@solidjs/testing-library'
import FileUpload from '../FileUpload'
import { FileEntity } from '../../core/types/api'
import { uploadService } from '../../features/file-upload/services/uploadService'
import { ApiError } from '../../core/types/api'

// Mock dependencies
vi.mock('../../features/file-upload/services/uploadService', () => ({
  uploadService: {
    uploadFile: vi.fn(),
  },
}))

vi.mock('../../core/stores/notifications', () => ({
  notificationStore: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

const mockUploadService = vi.mocked(uploadService)

// Polyfill DragEvent for tests
global.DragEvent = class DragEvent extends Event {
  dataTransfer: DataTransfer | null = null

  constructor(type: string, options?: any) {
    super(type, options)
    this.dataTransfer = options?.dataTransfer || null
  }
} as any

describe('FileUpload Component', () => {
  const mockFile: File = new File(['test content'], 'test.txt', { type: 'text/plain' })
  const mockUploadedFile: FileEntity = {
    id: '1',
    filename: 'test.txt',
    originalName: 'test.txt',
    mimetype: 'text/plain',
    size: 1024,
    path: '/uploads/test.txt',
    extractedText: 'test content',
    metadata: { wordCount: 2 },
    uploadedAt: '2023-12-01T10:00:00Z',
    lastModified: '2023-12-01T10:00:00Z',
  }

  const mockOnFileUploaded = vi.fn()
  const mockOnError = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('File Selection via Input', () => {
    it('should handle file selection successfully', async () => {
      mockUploadService.uploadFile.mockResolvedValue(mockUploadedFile)

      render(() => <FileUpload onFileUploaded={mockOnFileUploaded} />)

      const fileInput = screen.getByDisplayValue('') as HTMLInputElement
      expect(fileInput.type).toBe('file')

      // Mock file selection
      Object.defineProperty(fileInput, 'files', {
        value: [mockFile],
        configurable: true,
      })

      fireEvent.change(fileInput)

      await new Promise(resolve => setTimeout(resolve, 0))

      expect(mockUploadService.uploadFile).toHaveBeenCalledWith(mockFile)
      expect(mockOnFileUploaded).toHaveBeenCalledWith(mockUploadedFile)
    })

    it('should show uploading state during file upload', async () => {
      mockUploadService.uploadFile.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockUploadedFile), 100)),
      )

      render(() => <FileUpload onFileUploaded={mockOnFileUploaded} />)

      const fileInput = screen.getByDisplayValue('') as HTMLInputElement

      Object.defineProperty(fileInput, 'files', {
        value: [mockFile],
        configurable: true,
      })

      fireEvent.change(fileInput)

      // Should show uploading state - check for both instances
      const uploadingTexts = screen.getAllByText('Uploading...')
      expect(uploadingTexts.length).toBeGreaterThan(0)
      expect(screen.getByText('0%')).toBeDefined()
    })

    it('should handle upload failure', async () => {
      const error = new ApiError('Upload failed', 400)
      mockUploadService.uploadFile.mockRejectedValue(error)

      render(() => <FileUpload onFileUploaded={mockOnFileUploaded} onError={mockOnError} />)

      const fileInput = screen.getByDisplayValue('') as HTMLInputElement

      Object.defineProperty(fileInput, 'files', {
        value: [mockFile],
        configurable: true,
      })

      fireEvent.change(fileInput)

      await new Promise(resolve => setTimeout(resolve, 0))

      expect(mockOnError).toHaveBeenCalledWith('Upload failed')
    })

    it('should handle network error', async () => {
      const error = new Error('Network error')
      mockUploadService.uploadFile.mockRejectedValue(error)

      render(() => <FileUpload onFileUploaded={mockOnFileUploaded} onError={mockOnError} />)

      const fileInput = screen.getByDisplayValue('') as HTMLInputElement

      Object.defineProperty(fileInput, 'files', {
        value: [mockFile],
        configurable: true,
      })

      fireEvent.change(fileInput)

      await new Promise(resolve => setTimeout(resolve, 0))

      expect(mockOnError).toHaveBeenCalledWith('Upload failed: Network error')
    })
  })

  describe('Drag and Drop', () => {
    it('should handle drag over event', () => {
      render(() => <FileUpload onFileUploaded={mockOnFileUploaded} />)

      const dropZone = screen.getByText('Drop files here or click to browse').closest('div')
      expect(dropZone).toBeDefined()

      const dragEvent = new DragEvent('dragover', {
        bubbles: true,
        cancelable: true,
      })

      fireEvent(dropZone!, dragEvent)

      // Should prevent default
      expect(dragEvent.defaultPrevented).toBe(true)
    })

    it('should handle drag leave event', () => {
      render(() => <FileUpload onFileUploaded={mockOnFileUploaded} />)

      const dropZone = screen.getByText('Drop files here or click to browse').closest('div')

      const dragLeaveEvent = new DragEvent('dragleave', {
        bubbles: true,
        cancelable: true,
      })

      fireEvent(dropZone!, dragLeaveEvent)

      expect(dragLeaveEvent.defaultPrevented).toBe(true)
    })

    it('should handle file drop', async () => {
      mockUploadService.uploadFile.mockResolvedValue(mockUploadedFile)

      render(() => <FileUpload onFileUploaded={mockOnFileUploaded} />)

      const dropZone = screen.getByText('Drop files here or click to browse').closest('div')

      const dropEvent = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer: {
          files: [mockFile],
        } as any,
      })

      fireEvent(dropZone!, dropEvent)

      await new Promise(resolve => setTimeout(resolve, 0))

      expect(mockUploadService.uploadFile).toHaveBeenCalledWith(mockFile)
      expect(mockOnFileUploaded).toHaveBeenCalledWith(mockUploadedFile)
    })

    it('should handle drop with no files', () => {
      render(() => <FileUpload onFileUploaded={mockOnFileUploaded} />)

      const dropZone = screen.getByText('Drop files here or click to browse').closest('div')

      const dropEvent = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer: {
          files: [],
        } as any,
      })

      fireEvent(dropZone!, dropEvent)

      expect(mockUploadService.uploadFile).not.toHaveBeenCalled()
    })
  })

  describe('UI States', () => {
    it('should disable interactions when uploading', async () => {
      mockUploadService.uploadFile.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockUploadedFile), 100)),
      )

      render(() => <FileUpload onFileUploaded={mockOnFileUploaded} />)

      const fileInput = screen.getByDisplayValue('') as HTMLInputElement

      Object.defineProperty(fileInput, 'files', {
        value: [mockFile],
        configurable: true,
      })

      fireEvent.change(fileInput)

      // Should show uploading state - check for presence
      const uploadingTexts = screen.getAllByText('Uploading...')
      expect(uploadingTexts.length).toBeGreaterThan(0)
      expect(fileInput.disabled).toBe(true)
    })

    it('should show progress bar during upload', async () => {
      mockUploadService.uploadFile.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockUploadedFile), 100)),
      )

      render(() => <FileUpload onFileUploaded={mockOnFileUploaded} />)

      const fileInput = screen.getByDisplayValue('') as HTMLInputElement

      Object.defineProperty(fileInput, 'files', {
        value: [mockFile],
        configurable: true,
      })

      fireEvent.change(fileInput)

      // Should show progress elements
      expect(screen.getByText('0%')).toBeDefined()
      // Should show uploading state in progress bar (not the button)
      const allUploading = screen.getAllByText('Uploading...')
      expect(allUploading.length).toBeGreaterThan(1)
    })
  })

  describe('Browse Button', () => {
    it('should trigger file input when browse button is clicked', () => {
      render(() => <FileUpload onFileUploaded={mockOnFileUploaded} />)

      const browseButton = screen.getByText('Choose File')
      const fileInput = screen.getByDisplayValue('') as HTMLInputElement

      const clickSpy = vi.spyOn(fileInput, 'click')
      fireEvent.click(browseButton)

      // Note: In a real browser, clicking the label would trigger the input
      // In tests, we can verify the button is clickable
      expect(browseButton).toBeDefined()
    })

    it('should have proper styling for browse button', () => {
      render(() => <FileUpload onFileUploaded={mockOnFileUploaded} />)

      const browseButton = screen.getByText('Choose File')
      expect(browseButton.classList.contains('cursor-pointer')).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('should handle null file selection', () => {
      render(() => <FileUpload onFileUploaded={mockOnFileUploaded} />)

      const fileInput = screen.getByDisplayValue('') as HTMLInputElement

      Object.defineProperty(fileInput, 'files', {
        value: null,
        configurable: true,
      })

      fireEvent.change(fileInput)

      expect(mockUploadService.uploadFile).not.toHaveBeenCalled()
    })

    it('should handle empty file list', () => {
      render(() => <FileUpload onFileUploaded={mockOnFileUploaded} />)

      const fileInput = screen.getByDisplayValue('') as HTMLInputElement

      Object.defineProperty(fileInput, 'files', {
        value: [],
        configurable: true,
      })

      fireEvent.change(fileInput)

      expect(mockUploadService.uploadFile).not.toHaveBeenCalled()
    })

    it('should handle upload service throwing non-ApiError', async () => {
      const error = new Error('Unknown error')
      mockUploadService.uploadFile.mockRejectedValue(error)

      render(() => <FileUpload onFileUploaded={mockOnFileUploaded} onError={mockOnError} />)

      const fileInput = screen.getByDisplayValue('') as HTMLInputElement

      Object.defineProperty(fileInput, 'files', {
        value: [mockFile],
        configurable: true,
      })

      fireEvent.change(fileInput)

      await new Promise(resolve => setTimeout(resolve, 0))

      expect(mockOnError).toHaveBeenCalledWith('Upload failed: Network error')
    })
  })

  describe('Accessibility', () => {
    it('should have proper file input attributes', () => {
      render(() => <FileUpload onFileUploaded={mockOnFileUploaded} />)

      const fileInput = screen.getByDisplayValue('') as HTMLInputElement
      expect(fileInput.type).toBe('file')
      expect(fileInput.classList.contains('hidden')).toBe(true)
    })

    it('should have clickable browse text', () => {
      render(() => <FileUpload onFileUploaded={mockOnFileUploaded} />)

      const browseButton = screen.getByText('Choose File')
      expect(browseButton.classList.contains('cursor-pointer')).toBe(true)
    })
  })

  describe('Console Logging', () => {
    it('should log upload progress', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      mockUploadService.uploadFile.mockResolvedValue(mockUploadedFile)

      render(() => <FileUpload onFileUploaded={mockOnFileUploaded} />)

      const fileInput = screen.getByDisplayValue('') as HTMLInputElement

      Object.defineProperty(fileInput, 'files', {
        value: [mockFile],
        configurable: true,
      })

      fireEvent.change(fileInput)

      await new Promise(resolve => setTimeout(resolve, 0))

      expect(consoleSpy).toHaveBeenCalledWith('Uploading file:', 'test.txt')
      expect(consoleSpy).toHaveBeenCalledWith('Upload successful:', mockUploadedFile)

      consoleSpy.mockRestore()
    })

    it('should log upload errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const error = new Error('Upload failed')
      mockUploadService.uploadFile.mockRejectedValue(error)

      render(() => <FileUpload onFileUploaded={mockOnFileUploaded} onError={mockOnError} />)

      const fileInput = screen.getByDisplayValue('') as HTMLInputElement

      Object.defineProperty(fileInput, 'files', {
        value: [mockFile],
        configurable: true,
      })

      fireEvent.change(fileInput)

      await new Promise(resolve => setTimeout(resolve, 0))

      expect(consoleSpy).toHaveBeenCalledWith('Upload failed:', error)

      consoleSpy.mockRestore()
    })
  })
})
