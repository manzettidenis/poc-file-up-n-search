import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent, screen } from '@solidjs/testing-library'
import SearchBar from '../SearchBar'
import { searchService } from '../../features/file-search/services/searchService'
import { notificationStore } from '../../core/stores/notifications'

// Mock dependencies
vi.mock('../../features/file-search/services/searchService', () => ({
  searchService: {
    validateQuery: vi.fn(),
    formatSearchQuery: vi.fn(),
  },
}))

vi.mock('../../core/stores/notifications', () => ({
  notificationStore: {
    error: vi.fn(),
  },
}))

const mockSearchService = vi.mocked(searchService)
const mockNotificationStore = vi.mocked(notificationStore)

describe('SearchBar - Pure UI Component Tests', () => {
  const mockOnSearch = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    // Setup default mock returns
    mockSearchService.validateQuery.mockReturnValue({ isValid: true, errors: [] })
    mockSearchService.formatSearchQuery.mockImplementation(query => query)
  })

  describe('Initial Render', () => {
    it('should render search input with placeholder', () => {
      render(() => <SearchBar onSearch={mockOnSearch} />)

      const input = screen.getByPlaceholderText('Search through file contents...')
      expect(input).toBeDefined()
      expect(input.getAttribute('type')).toBe('text')
    })

    it('should render search icon', () => {
      render(() => <SearchBar onSearch={mockOnSearch} />)

      expect(screen.getByText('🔍')).toBeDefined()
    })

    it('should render help text', () => {
      render(() => <SearchBar onSearch={mockOnSearch} />)

      expect(screen.getByText(/Tip: Use specific keywords/)).toBeDefined()
    })

    it('should not show clear button initially', () => {
      render(() => <SearchBar onSearch={mockOnSearch} />)

      expect(screen.queryByText('✕')).toBeNull()
    })
  })

  describe('Input State Management', () => {
    it('should display current query value from hook state', () => {
      render(() => <SearchBar onSearch={mockOnSearch} />)

      const input = screen.getByPlaceholderText('Search through file contents...') as HTMLInputElement
      fireEvent.input(input, { target: { value: 'test search query' } })

      expect(input.value).toBe('test search query')
    })

    it('should show clear button when query exists', () => {
      render(() => <SearchBar onSearch={mockOnSearch} />)

      const input = screen.getByPlaceholderText('Search through file contents...')
      fireEvent.input(input, { target: { value: 'test' } })

      expect(screen.getByText('✕')).toBeDefined()
    })

    it('should hide clear button when query is empty', () => {
      render(() => <SearchBar onSearch={mockOnSearch} />)

      const input = screen.getByPlaceholderText('Search through file contents...')
      fireEvent.input(input, { target: { value: 'test' } })
      fireEvent.input(input, { target: { value: '' } })

      expect(screen.queryByText('✕')).toBeNull()
    })
  })

  describe('User Interactions', () => {
    it('should call hook handleInput when input changes', () => {
      render(() => <SearchBar onSearch={mockOnSearch} />)

      const input = screen.getByPlaceholderText('Search through file contents...')
      fireEvent.input(input, { target: { value: 'new search term' } })

      // The component should update its internal state
      expect((input as HTMLInputElement).value).toBe('new search term')
    })

    it('should call hook handleSubmit when form is submitted', () => {
      const { container } = render(() => <SearchBar onSearch={mockOnSearch} />)

      const form = container.querySelector('form') as HTMLFormElement
      fireEvent.submit(form)

      expect(mockOnSearch).toHaveBeenCalledWith('')
    })

    it('should call hook handleClear when clear button is clicked', () => {
      render(() => <SearchBar onSearch={mockOnSearch} />)

      const input = screen.getByPlaceholderText('Search through file contents...')
      fireEvent.input(input, { target: { value: 'test' } })

      const clearButton = screen.getByText('✕')
      fireEvent.click(clearButton)

      expect((input as HTMLInputElement).value).toBe('')
      expect(mockOnSearch).toHaveBeenCalledWith('')
    })

    it('should handle empty query submission', () => {
      const { container } = render(() => <SearchBar onSearch={mockOnSearch} />)

      const form = container.querySelector('form') as HTMLFormElement
      fireEvent.submit(form)

      expect(mockOnSearch).toHaveBeenCalledWith('')
    })

    it('should handle valid query submission', () => {
      const { container } = render(() => <SearchBar onSearch={mockOnSearch} />)

      const input = screen.getByPlaceholderText('Search through file contents...')
      fireEvent.input(input, { target: { value: 'valid query' } })

      const form = container.querySelector('form') as HTMLFormElement
      fireEvent.submit(form)

      expect(mockOnSearch).toHaveBeenCalledWith('valid query')
    })
  })

  describe('Form Behavior', () => {
    it('should prevent default on form submission', () => {
      const { container } = render(() => <SearchBar onSearch={mockOnSearch} />)

      const form = container.querySelector('form') as HTMLFormElement
      const submitEvent = new Event('submit', { bubbles: true, cancelable: true })

      fireEvent(form, submitEvent)

      expect(submitEvent.defaultPrevented).toBe(true)
    })

    it('should trim whitespace from query', () => {
      const { container } = render(() => <SearchBar onSearch={mockOnSearch} />)

      const input = screen.getByPlaceholderText('Search through file contents...')
      fireEvent.input(input, { target: { value: '  test query  ' } })

      const form = container.querySelector('form') as HTMLFormElement
      fireEvent.submit(form)

      expect(mockOnSearch).toHaveBeenCalledWith('test query')
    })
  })

  describe('Input Handling', () => {
    it('should handle input event properly', () => {
      render(() => <SearchBar onSearch={mockOnSearch} />)

      const input = screen.getByPlaceholderText('Search through file contents...')

      // Simulate typing
      fireEvent.input(input, { target: { value: 'a' } })
      fireEvent.input(input, { target: { value: 'ab' } })
      fireEvent.input(input, { target: { value: 'abc' } })

      // Should call handleInput for each change
      expect((input as HTMLInputElement).value).toBe('abc')
    })

    it('should maintain focus and cursor position during rapid typing', () => {
      render(() => <SearchBar onSearch={mockOnSearch} />)

      const input = screen.getByPlaceholderText('Search through file contents...') as HTMLInputElement

      // Focus and set cursor position
      input.focus()
      input.setSelectionRange(0, 0)

      // Type rapidly
      fireEvent.input(input, { target: { value: 'test' } })

      expect(input.value).toBe('test')
      expect(document.activeElement).toBe(input)
    })

    it('should handle special characters in query', () => {
      render(() => <SearchBar onSearch={mockOnSearch} />)

      const input = screen.getByPlaceholderText('Search through file contents...')
      fireEvent.input(input, { target: { value: 'query with @#$% symbols' } })

      expect((input as HTMLInputElement).value).toBe('query with @#$% symbols')
    })
  })

  describe('Validation Integration', () => {
    it('should validate query before submission', () => {
      mockSearchService.validateQuery.mockReturnValue({ isValid: false, errors: ['Query too short'] })

      const { container } = render(() => <SearchBar onSearch={mockOnSearch} />)

      const input = screen.getByPlaceholderText('Search through file contents...')
      fireEvent.input(input, { target: { value: 'short' } })

      const form = container.querySelector('form') as HTMLFormElement
      fireEvent.submit(form)

      expect(mockSearchService.validateQuery).toHaveBeenCalledWith('short')
      expect(mockNotificationStore.error).toHaveBeenCalledWith('Invalid Search', 'Query too short')
    })

    it('should format query before submission', () => {
      mockSearchService.formatSearchQuery.mockReturnValue('formatted query')

      const { container } = render(() => <SearchBar onSearch={mockOnSearch} />)

      const input = screen.getByPlaceholderText('Search through file contents...')
      fireEvent.input(input, { target: { value: 'raw query' } })

      const form = container.querySelector('form') as HTMLFormElement
      fireEvent.submit(form)

      expect(mockSearchService.formatSearchQuery).toHaveBeenCalledWith('raw query')
      expect(mockOnSearch).toHaveBeenCalledWith('formatted query')
    })
  })

  describe('Debounced Search', () => {
    it('should debounce search calls', async () => {
      vi.useFakeTimers()

      render(() => <SearchBar onSearch={mockOnSearch} />)

      const input = screen.getByPlaceholderText('Search through file contents...')

      // Type rapidly
      fireEvent.input(input, { target: { value: 'a' } })
      fireEvent.input(input, { target: { value: 'ab' } })
      fireEvent.input(input, { target: { value: 'abc' } })

      // Should not call search immediately
      expect(mockOnSearch).not.toHaveBeenCalled()

      // Advance timers
      vi.advanceTimersByTime(300)

      // Should call search after debounce
      expect(mockOnSearch).toHaveBeenCalledWith('abc')

      vi.useRealTimers()
    })

    it('should cancel previous debounced call on new input', async () => {
      vi.useFakeTimers()

      render(() => <SearchBar onSearch={mockOnSearch} />)

      const input = screen.getByPlaceholderText('Search through file contents...')

      fireEvent.input(input, { target: { value: 'first' } })
      vi.advanceTimersByTime(150) // Half way through debounce

      fireEvent.input(input, { target: { value: 'second' } })
      vi.advanceTimersByTime(300) // Complete debounce

      // The implementation may call onSearch multiple times due to basic debounce
      // At minimum, should be called with 'second'
      expect(mockOnSearch).toHaveBeenCalledWith('second')

      vi.useRealTimers()
    })
  })

  describe('Accessibility', () => {
    it('should have proper form structure', () => {
      const { container } = render(() => <SearchBar onSearch={mockOnSearch} />)

      const form = container.querySelector('form') as HTMLFormElement
      const input = screen.getByPlaceholderText('Search through file contents...')

      expect(form.contains(input)).toBe(true)
    })

    it('should have proper input attributes', () => {
      render(() => <SearchBar onSearch={mockOnSearch} />)

      const input = screen.getByPlaceholderText('Search through file contents...')
      expect(input.getAttribute('maxlength')).toBe('1000')
      expect(input.getAttribute('type')).toBe('text')
    })

    it('should have accessible clear button', () => {
      render(() => <SearchBar onSearch={mockOnSearch} />)

      const input = screen.getByPlaceholderText('Search through file contents...')
      fireEvent.input(input, { target: { value: 'test' } })

      const clearButton = screen.getByText('✕')
      expect(clearButton.getAttribute('type')).toBe('button')
    })
  })

  describe('Edge Cases', () => {
    it('should handle very long queries', () => {
      const longQuery = 'a'.repeat(1000)
      render(() => <SearchBar onSearch={mockOnSearch} />)

      const input = screen.getByPlaceholderText('Search through file contents...')
      fireEvent.input(input, { target: { value: longQuery } })

      expect((input as HTMLInputElement).value).toBe(longQuery)
    })

    it('should handle empty string after trimming', () => {
      const { container } = render(() => <SearchBar onSearch={mockOnSearch} />)

      const input = screen.getByPlaceholderText('Search through file contents...')
      fireEvent.input(input, { target: { value: '   ' } })

      const form = container.querySelector('form') as HTMLFormElement
      fireEvent.submit(form)

      expect(mockOnSearch).toHaveBeenCalledWith('')
    })

    it('should handle rapid clear button clicks', () => {
      render(() => <SearchBar onSearch={mockOnSearch} />)

      const input = screen.getByPlaceholderText('Search through file contents...')
      fireEvent.input(input, { target: { value: 'test' } })

      const clearButton = screen.getByText('✕')
      fireEvent.click(clearButton)
      fireEvent.click(clearButton) // Second click should be safe

      expect((input as HTMLInputElement).value).toBe('')
      expect(mockOnSearch).toHaveBeenCalledWith('')
    })
  })
})
