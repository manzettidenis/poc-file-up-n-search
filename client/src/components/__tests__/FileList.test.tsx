import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent, screen } from '@solidjs/testing-library'
import FileList from '../FileList'
import { FileEntity } from '../../core/types/api'
import { fileService } from '../../features/file-management/services/fileService'

// Mock dependencies
vi.mock('../../features/file-management/services/fileService', () => ({
  fileService: {
    getFileIcon: vi.fn(),
    getFileTypeLabel: vi.fn(),
    formatFileSize: vi.fn(),
    formatDate: vi.fn(),
    truncateText: vi.fn(),
    getFileViewUrl: vi.fn(),
  },
}))

vi.mock('../../shared/components/LoadingSpinner', () => ({
  default: (props: any) => (
    <div data-testid="loading-spinner">
      Loading: {props.text} {props.center ? '(centered)' : ''}
    </div>
  ),
}))

vi.mock('../../shared/components/EmptyState', () => ({
  default: (props: any) => (
    <div data-testid="empty-state">
      <div data-testid="empty-icon">{props.icon}</div>
      <div data-testid="empty-title">{props.title}</div>
      <div data-testid="empty-description">{props.description}</div>
    </div>
  ),
}))

const mockFileService = vi.mocked(fileService)

describe('FileList Component', () => {
  const mockFile: FileEntity = {
    id: '1',
    filename: 'test.txt',
    originalName: 'test.txt',
    mimetype: 'text/plain',
    size: 1024,
    path: '/uploads/test.txt',
    extractedText: 'This is the extracted text content from the file.',
    metadata: { wordCount: 8 },
    uploadedAt: '2023-12-01T10:00:00Z',
    lastModified: '2023-12-01T10:00:00Z',
  }

  const mockOnDelete = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup default mock returns
    mockFileService.getFileIcon.mockReturnValue('📄')
    mockFileService.getFileTypeLabel.mockReturnValue('Text Document')
    mockFileService.formatFileSize.mockReturnValue('1 KB')
    mockFileService.formatDate.mockReturnValue('Dec 1, 2023 10:00 AM')
    mockFileService.truncateText.mockReturnValue('This is the extracted text...')
    mockFileService.getFileViewUrl.mockReturnValue('/uploads/test.txt')
  })

  describe('Loading State', () => {
    it('should show loading spinner when loading and no files', () => {
      render(() => <FileList files={[]} loading={true} onDelete={mockOnDelete} />)

      expect(screen.getByTestId('loading-spinner')).toBeDefined()
      expect(screen.getByText('Loading: Loading files... (centered)')).toBeDefined()
    })

    it('should not show loading spinner when loading but files exist', () => {
      render(() => <FileList files={[mockFile]} loading={true} onDelete={mockOnDelete} />)

      expect(screen.queryByTestId('loading-spinner')).toBeNull()
    })
  })

  describe('Empty State', () => {
    it('should show empty state when not loading and no files', () => {
      render(() => <FileList files={[]} loading={false} onDelete={mockOnDelete} />)

      expect(screen.getByTestId('empty-state')).toBeDefined()
      expect(screen.getByTestId('empty-icon').textContent).toBe('📂')
      expect(screen.getByTestId('empty-title').textContent).toBe('No files uploaded yet')
      expect(screen.getByTestId('empty-description').textContent).toContain('Upload your first file to get started!')
    })

    it('should show search empty state when no files found for search query', () => {
      render(() => <FileList files={[]} loading={false} onDelete={mockOnDelete} searchQuery="test query" />)

      expect(screen.getByTestId('empty-state')).toBeDefined()
      expect(screen.getByTestId('empty-title').textContent).toBe('No files found')
      expect(screen.getByTestId('empty-description').textContent).toContain('No files found matching "test query"')
    })

    it('should not show empty state when files exist', () => {
      render(() => <FileList files={[mockFile]} loading={false} onDelete={mockOnDelete} />)

      expect(screen.queryByTestId('empty-state')).toBeNull()
    })
  })

  describe('File Display', () => {
    it('should render file information correctly', () => {
      render(() => <FileList files={[mockFile]} loading={false} onDelete={mockOnDelete} />)

      // Check file name
      expect(screen.getByText('test.txt')).toBeDefined()

      // Check file metadata
      expect(screen.getByText('Text Document')).toBeDefined()
      expect(screen.getByText('1 KB')).toBeDefined()
      expect(screen.getByText('Uploaded: Dec 1, 2023 10:00 AM')).toBeDefined()

      // Check word count
      expect(screen.getByText('8 words')).toBeDefined()

      // Check extracted text
      expect(screen.getByText('This is the extracted text...')).toBeDefined()

      // Verify service calls
      expect(mockFileService.getFileIcon).toHaveBeenCalledWith('text/plain')
      expect(mockFileService.getFileTypeLabel).toHaveBeenCalledWith('text/plain')
      expect(mockFileService.formatFileSize).toHaveBeenCalledWith(1024)
      expect(mockFileService.formatDate).toHaveBeenCalledWith('2023-12-01T10:00:00Z')
      expect(mockFileService.truncateText).toHaveBeenCalledWith('This is the extracted text content from the file.')
    })

    it('should render multiple files', () => {
      const files = [mockFile, { ...mockFile, id: '2', originalName: 'file2.pdf', mimetype: 'application/pdf' }]

      mockFileService.getFileIcon.mockImplementation(mimetype => (mimetype === 'text/plain' ? '📄' : '📋'))
      mockFileService.getFileTypeLabel.mockImplementation(mimetype =>
        mimetype === 'text/plain' ? 'Text Document' : 'PDF Document',
      )

      render(() => <FileList files={files} loading={false} onDelete={mockOnDelete} />)

      expect(screen.getByText('test.txt')).toBeDefined()
      expect(screen.getByText('file2.pdf')).toBeDefined()
      expect(screen.getByText('Text Document')).toBeDefined()
      expect(screen.getByText('PDF Document')).toBeDefined()
    })

    it('should handle file without word count', () => {
      const fileWithoutWordCount = { ...mockFile, metadata: {} }

      render(() => <FileList files={[fileWithoutWordCount]} loading={false} onDelete={mockOnDelete} />)

      expect(screen.queryByText(/words/)).toBeNull()
    })

    it('should handle file without extracted text', () => {
      const fileWithoutText = { ...mockFile, extractedText: '' }

      render(() => <FileList files={[fileWithoutText]} loading={false} onDelete={mockOnDelete} />)

      expect(mockFileService.truncateText).not.toHaveBeenCalled()
    })
  })

  describe('User Interactions', () => {
    it('should call onDelete when delete button is clicked', () => {
      render(() => <FileList files={[mockFile]} loading={false} onDelete={mockOnDelete} />)

      const deleteButton = screen.getByText('Delete')
      fireEvent.click(deleteButton)

      expect(mockOnDelete).toHaveBeenCalledWith('1')
    })

    it('should call onDelete for correct file when multiple files exist', () => {
      const files = [mockFile, { ...mockFile, id: '2', originalName: 'file2.txt' }]

      render(() => <FileList files={files} loading={false} onDelete={mockOnDelete} />)

      const deleteButtons = screen.getAllByText('Delete')
      fireEvent.click(deleteButtons[1]) // Click second delete button

      expect(mockOnDelete).toHaveBeenCalledWith('2')
    })

    it('should show hover effects on file items', () => {
      const { container } = render(() => <FileList files={[mockFile]} loading={false} onDelete={mockOnDelete} />)

      const fileItem = container.querySelector('.hover\\:shadow-md')
      expect(fileItem).toBeDefined()
    })
  })

  describe('Responsive Design', () => {
    it('should apply responsive classes', () => {
      const { container } = render(() => <FileList files={[mockFile]} loading={false} onDelete={mockOnDelete} />)

      // Check for responsive classes
      const fileContainer = container.querySelector('.space-y-3')
      expect(fileContainer).toBeDefined()

      const fileItem = container.querySelector('.flex.items-center.justify-between')
      expect(fileItem).toBeDefined()
    })
  })

  describe('Accessibility', () => {
    it('should have proper button roles for delete actions', () => {
      render(() => <FileList files={[mockFile]} loading={false} onDelete={mockOnDelete} />)

      const deleteButton = screen.getByRole('button')
      expect(deleteButton).toBeDefined()
      expect(deleteButton.textContent).toBe('Delete')
    })

    it('should have proper semantic structure', () => {
      render(() => <FileList files={[mockFile]} loading={false} onDelete={mockOnDelete} />)

      // File name should be in a heading
      const heading = screen.getByRole('heading', { level: 3 })
      expect(heading.textContent).toBe('test.txt')
    })
  })

  describe('Edge Cases', () => {
    it('should handle null/undefined files array', () => {
      render(() => <FileList files={null as any} loading={false} onDelete={mockOnDelete} />)

      expect(screen.getByTestId('empty-state')).toBeDefined()
    })

    it('should handle files with missing properties gracefully', () => {
      const incompleteFile = {
        id: '1',
        originalName: 'incomplete.txt',
        mimetype: 'text/plain',
        filename: 'incomplete.txt',
        size: 0,
        path: '/uploads/incomplete.txt',
        extractedText: '',
        metadata: {},
        uploadedAt: '2023-12-01T10:00:00Z',
        lastModified: '2023-12-01T10:00:00Z',
      } as FileEntity

      render(() => <FileList files={[incompleteFile]} loading={false} onDelete={mockOnDelete} />)

      expect(screen.getByText('incomplete.txt')).toBeDefined()
    })
  })
})
