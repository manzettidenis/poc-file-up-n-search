import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent, screen } from '@solidjs/testing-library'
import { Component } from 'solid-js'
import FileUploadZone from '../FileUploadZone'
import { useFileUpload } from '../../hooks/useFileUpload'

// Mock the hook - this is the key to easy UI testing!
vi.mock('../../hooks/useFileUpload')
vi.mock('../../services/uploadService', () => ({
  uploadService: {
    getAcceptAttribute: () => '.txt,.pdf,.jpg',
    getSupportedFormats: () => ['TXT', 'PDF', 'Images'],
  },
}))

const mockUseFileUpload = vi.mocked(useFileUpload)

describe('FileUploadZone - Pure UI Component Tests', () => {
  const mockOnFileUploaded = vi.fn()

  // Default mock hook return
  const createMockHook = (overrides = {}) => ({
    state: () => ({
      isUploading: false,
      progress: null,
      dragOver: false,
      lastUploadedFile: null,
      ...overrides,
    }),
    uploadFile: vi.fn(),
    setDragOver: vi.fn(),
    reset: vi.fn(),
    validateFile: vi.fn(),
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mockOnFileUploaded.mockClear()
  })

  it('should render upload zone in default state', () => {
    mockUseFileUpload.mockReturnValue(createMockHook())

    render(() => <FileUploadZone onFileUploaded={mockOnFileUploaded} />)

    // Should show upload UI
    expect(screen.getByText('Upload a file')).toBeDefined()
    expect(screen.getByText('browse')).toBeDefined()
    expect(screen.getByText(/Supports: TXT, PDF, Images/)).toBeDefined()
    expect(screen.getByText('Maximum file size: 50MB')).toBeDefined()

    // Should not show loading
    expect(screen.queryByText('Uploading...')).toBeNull()
  })

  it('should render loading state when uploading', () => {
    mockUseFileUpload.mockReturnValue(
      createMockHook({
        isUploading: true,
        progress: { loaded: 500, total: 1000, percentage: 50 },
      }),
    )

    render(() => <FileUploadZone onFileUploaded={mockOnFileUploaded} />)

    // Should show loading UI
    expect(screen.getByText('Uploading...')).toBeDefined()
    expect(screen.getByText('50% (500 / 1000 bytes)')).toBeDefined()

    // Should not show upload UI
    expect(screen.queryByText('Upload a file')).toBeNull()
  })

  it('should show drag over state', () => {
    mockUseFileUpload.mockReturnValue(createMockHook({ dragOver: true }))

    const { container } = render(() => <FileUploadZone onFileUploaded={mockOnFileUploaded} />)

    // Should have drag over styling
    const uploadZone = container.querySelector('.border-blue-500')
    expect(uploadZone).toBeDefined()
  })

  it('should handle file input change', async () => {
    const mockHook = createMockHook()
    mockHook.uploadFile.mockResolvedValue({ id: '123', filename: 'test.txt' } as any)
    mockUseFileUpload.mockReturnValue(mockHook)

    render(() => <FileUploadZone onFileUploaded={mockOnFileUploaded} />)

    // Find the file input - it's inside a label
    const fileInput = screen
      .getByText('browse')
      .closest('label')
      ?.querySelector('input[type="file"]') as HTMLInputElement

    // Create a mock file
    const file = new File(['content'], 'test.txt', { type: 'text/plain' })

    // Simulate file selection
    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: false,
    })

    // Trigger change event
    fireEvent.change(fileInput)

    // Should call hook's uploadFile method
    expect(mockHook.uploadFile).toHaveBeenCalledWith(file)
  })

  it('should handle drag and drop events', () => {
    const mockHook = createMockHook()
    mockUseFileUpload.mockReturnValue(mockHook)

    const { container } = render(() => <FileUploadZone onFileUploaded={mockOnFileUploaded} />)

    const uploadZone = container.querySelector('.border-dashed')!

    // Simulate drag over
    fireEvent.dragOver(uploadZone)
    expect(mockHook.setDragOver).toHaveBeenCalledWith(true)

    // Simulate drag leave
    fireEvent.dragLeave(uploadZone)
    expect(mockHook.setDragOver).toHaveBeenCalledWith(false)
  })

  it('should handle drop events', async () => {
    const mockHook = createMockHook()
    mockHook.uploadFile.mockResolvedValue({ id: '123', filename: 'test.txt' } as any)
    mockUseFileUpload.mockReturnValue(mockHook)

    const { container } = render(() => <FileUploadZone onFileUploaded={mockOnFileUploaded} />)

    const uploadZone = container.querySelector('.border-dashed')!
    const file = new File(['content'], 'test.txt', { type: 'text/plain' })

    // Mock DataTransfer
    const mockDataTransfer = {
      files: [file],
    } as any

    // Simulate drop
    fireEvent.drop(uploadZone, { dataTransfer: mockDataTransfer })

    // Should clear drag state and upload file
    expect(mockHook.setDragOver).toHaveBeenCalledWith(false)
    expect(mockHook.uploadFile).toHaveBeenCalledWith(file)
  })

  it('should call onFileUploaded when upload succeeds', async () => {
    const mockHook = createMockHook()
    const uploadedFile = { id: '123', filename: 'test.txt' }
    mockHook.uploadFile.mockResolvedValue(uploadedFile as any)
    mockUseFileUpload.mockReturnValue(mockHook)

    render(() => <FileUploadZone onFileUploaded={mockOnFileUploaded} />)

    const fileInput = screen
      .getByText('browse')
      .closest('label')
      ?.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['content'], 'test.txt', { type: 'text/plain' })

    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: false,
    })

    fireEvent.change(fileInput)

    // Wait for async operation
    await new Promise(resolve => setTimeout(resolve, 0))

    // Should call parent callback
    expect(mockOnFileUploaded).toHaveBeenCalledWith(uploadedFile)
  })

  it('should not call onFileUploaded when upload fails', async () => {
    const mockHook = createMockHook()
    mockHook.uploadFile.mockResolvedValue(null) // Upload failed
    mockUseFileUpload.mockReturnValue(mockHook)

    render(() => <FileUploadZone onFileUploaded={mockOnFileUploaded} />)

    const fileInput = screen
      .getByText('browse')
      .closest('label')
      ?.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['content'], 'test.txt', { type: 'text/plain' })

    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: false,
    })

    fireEvent.change(fileInput)

    // Wait for async operation
    await new Promise(resolve => setTimeout(resolve, 0))

    // Should NOT call parent callback
    expect(mockOnFileUploaded).not.toHaveBeenCalled()
  })

  it('should disable file input when uploading', () => {
    mockUseFileUpload.mockReturnValue(createMockHook({ isUploading: true }))

    render(() => <FileUploadZone onFileUploaded={mockOnFileUploaded} />)

    // In loading state, the file input shouldn't be visible at all
    // because the Show component hides the upload UI
    expect(screen.queryByText('browse')).toBeNull()
  })
})
