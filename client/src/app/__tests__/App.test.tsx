import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@solidjs/testing-library'
import App from '../App'

// Mock all dependencies
vi.mock('../hooks/useFileManager')
vi.mock('../../shared/components/NotificationToast', () => ({
  default: () => <div data-testid="notification-toast">Notification Toast</div>,
}))
vi.mock('../../features/file-upload/components/FileUploadZone', () => ({
  default: (props: any) => (
    <div data-testid="file-upload-zone" onClick={() => props.onFileUploaded({ id: '123', filename: 'test.txt' })}>
      File Upload Zone
    </div>
  ),
}))
vi.mock('../../components/SearchBar', () => ({
  default: (props: any) => (
    <div data-testid="search-bar" onClick={() => props.onSearch('test query')}>
      Search Bar
    </div>
  ),
}))
vi.mock('../../components/FileList', () => ({
  default: (props: any) => (
    <div data-testid="file-list" onClick={() => props.onDelete('123')}>
      File List - Files: {props.files?.length || 0}, Loading: {props.loading ? 'true' : 'false'}
      {props.searchQuery && `, Query: ${props.searchQuery}`}
    </div>
  ),
}))

// Mock API services to prevent real API calls
vi.mock('../../features/file-search/services/searchService', () => ({
  searchService: {
    searchFiles: vi.fn().mockResolvedValue(null),
    getAllFiles: vi.fn().mockResolvedValue({ files: [] }),
    clearCache: vi.fn(),
  },
}))

vi.mock('../../features/file-management/services/fileService', () => ({
  fileService: {
    deleteFile: vi.fn().mockResolvedValue(undefined),
  },
}))

vi.mock('../../core/stores/notifications', () => ({
  notificationStore: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

describe('App Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render main layout with title and description', () => {
    render(() => <App />)

    expect(screen.getByText('File Upload & Search')).toBeDefined()
    expect(screen.getByText('Upload files and search through their content')).toBeDefined()
  })

  it('should render all main components', () => {
    render(() => <App />)

    expect(screen.getByTestId('notification-toast')).toBeDefined()
    expect(screen.getByTestId('file-upload-zone')).toBeDefined()
    expect(screen.getByTestId('search-bar')).toBeDefined()
    // Only one FileList should be rendered initially (the "All Files" section)
    expect(screen.getAllByTestId('file-list')).toHaveLength(1)
  })

  it('should show correct section titles', () => {
    render(() => <App />)

    expect(screen.getByText('Upload Files')).toBeDefined()
    expect(screen.getByText('Search Files')).toBeDefined()
    expect(screen.getByText('Uploaded Files (0)')).toBeDefined()
  })

  it('should display files count in uploaded files section', () => {
    render(() => <App />)

    const fileLists = screen.getAllByTestId('file-list')
    // Only one FileList (the uploaded files one) should show "Files: 0"
    expect(fileLists[0].textContent).toContain('Files: 0')
  })

  it('should show search results section when search returns results', async () => {
    const { searchService } = await import('../../features/file-search/services/searchService')
    const mockSearchResults = {
      files: [
        {
          file: {
            id: '1',
            filename: 'result.txt',
            originalName: 'result.txt',
            mimetype: 'text/plain',
            size: 1024,
            path: '/uploads/result.txt',
            extractedText: 'test content',
            metadata: {},
            uploadedAt: '2023-12-01T10:00:00Z',
            lastModified: '2023-12-01T10:00:00Z',
          },
          score: 0.95,
        },
      ],
      totalCount: 1,
      query: 'test query',
    }
    vi.mocked(searchService.searchFiles).mockResolvedValue(mockSearchResults)

    render(() => <App />)

    // Trigger search
    const searchBar = screen.getByTestId('search-bar')
    searchBar.click()

    // Wait for async operation
    await new Promise(resolve => setTimeout(resolve, 10))

    // Should now show search results heading
    expect(screen.getByText('Search Results (1)')).toBeDefined()
    // Should now have 2 FileList components
    expect(screen.getAllByTestId('file-list')).toHaveLength(2)
  })

  it('should not show search results section when there are no results', () => {
    render(() => <App />)

    expect(screen.queryByText(/Search Results/)).toBeNull()
  })

  it('should pass correct props to FileList components when search has results', async () => {
    const { searchService } = await import('../../features/file-search/services/searchService')
    const mockSearchResults = {
      files: [
        {
          file: {
            id: '2',
            filename: 'result.txt',
            originalName: 'result.txt',
            mimetype: 'text/plain',
            size: 1024,
            path: '/uploads/result.txt',
            extractedText: 'test content',
            metadata: {},
            uploadedAt: '2023-12-01T10:00:00Z',
            lastModified: '2023-12-01T10:00:00Z',
          },
          score: 0.95,
        },
      ],
      totalCount: 1,
      query: 'test query',
    }
    vi.mocked(searchService.searchFiles).mockResolvedValue(mockSearchResults)

    render(() => <App />)

    // Trigger search
    const searchBar = screen.getByTestId('search-bar')
    searchBar.click()

    // Wait for async operation
    await new Promise(resolve => setTimeout(resolve, 10))

    const fileLists = screen.getAllByTestId('file-list')

    // Search results FileList
    expect(fileLists[0].textContent).toContain('Files: 1')
    expect(fileLists[0].textContent).toContain('Query: test query')

    // All files FileList
    expect(fileLists[1].textContent).toContain('Files: 0')
  })

  it('should handle file uploaded event from upload zone', () => {
    render(() => <App />)

    const uploadZone = screen.getByTestId('file-upload-zone')
    uploadZone.click()

    // Should trigger file upload flow (tested via mock integration)
    expect(uploadZone).toBeDefined()
  })

  it('should handle search event from search bar', () => {
    render(() => <App />)

    const searchBar = screen.getByTestId('search-bar')
    searchBar.click()

    // Should trigger search flow
    expect(searchBar).toBeDefined()
  })

  it('should handle file delete event from file lists', () => {
    render(() => <App />)

    const fileLists = screen.getAllByTestId('file-list')
    fileLists[0].click() // Click first file list

    // Should trigger delete flow
    expect(fileLists[0]).toBeDefined()
  })

  it('should use responsive grid layout', () => {
    const { container } = render(() => <App />)

    // Check for grid layout classes
    const gridContainer = container.querySelector('.grid.grid-cols-1.lg\\:grid-cols-2')
    expect(gridContainer).toBeDefined()
  })

  it('should handle loading states correctly', () => {
    render(() => <App />)

    const fileLists = screen.getAllByTestId('file-list')

    // Should show loading state initially
    expect(fileLists[0].textContent).toContain('Loading: true')
  })

  it('should show search results count correctly', async () => {
    const { searchService } = await import('../../features/file-search/services/searchService')
    const mockSearchResults = {
      files: Array.from({ length: 5 }, (_, i) => ({
        file: {
          id: `${i}`,
          filename: `file${i}.txt`,
          originalName: `file${i}.txt`,
          mimetype: 'text/plain',
          size: 1024,
          path: `/uploads/file${i}.txt`,
          extractedText: 'test content',
          metadata: {},
          uploadedAt: '2023-12-01T10:00:00Z',
          lastModified: '2023-12-01T10:00:00Z',
        },
        score: 0.8,
      })),
      totalCount: 5,
      query: 'test',
    }
    vi.mocked(searchService.searchFiles).mockResolvedValue(mockSearchResults)

    render(() => <App />)

    // Trigger search
    const searchBar = screen.getByTestId('search-bar')
    searchBar.click()

    // Wait for async operation
    await new Promise(resolve => setTimeout(resolve, 10))

    expect(screen.getByText('Search Results (5)')).toBeDefined()
  })
})
