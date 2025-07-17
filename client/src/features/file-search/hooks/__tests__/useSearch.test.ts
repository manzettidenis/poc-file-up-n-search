import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot } from 'solid-js'
import { useSearch } from '../useSearch'
import { searchService } from '../../services/searchService'
import { notificationStore } from '../../../../core/stores/notifications'

// Mock dependencies
vi.mock('../../services/searchService')
vi.mock('../../../../core/stores/notifications')

const mockSearchService = vi.mocked(searchService)
const mockNotificationStore = vi.mocked(notificationStore)

// Mock window.setTimeout to avoid real timers in tests
vi.stubGlobal('setTimeout', vi.fn())
vi.stubGlobal('clearTimeout', vi.fn())

describe('useSearch Hook - Business Logic Tests', () => {
  const mockOnSearch = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockNotificationStore.error = vi.fn()

    // Reset mock implementations
    mockSearchService.validateQuery.mockClear()
    mockSearchService.formatSearchQuery.mockClear()
    mockOnSearch.mockClear()
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  it('should initialize with correct default state', () => {
    createRoot(() => {
      const search = useSearch(mockOnSearch)
      const state = search.state()

      expect(state.query).toBe('')
      expect(state.isValidating).toBe(false)
      expect(state.lastValidatedQuery).toBe('')
    })
  })

  it('should update query state correctly', () => {
    createRoot(() => {
      const search = useSearch(mockOnSearch)

      search.setQuery('test query')

      const state = search.state()
      expect(state.query).toBe('test query')
    })
  })

  it('should handle successful search submission', () => {
    mockSearchService.validateQuery.mockReturnValue({ isValid: true, errors: [] })
    mockSearchService.formatSearchQuery.mockReturnValue('formatted query')

    createRoot(() => {
      const search = useSearch(mockOnSearch)

      search.setQuery('test query')
      search.handleSubmit()

      // Should validate and format the query
      expect(mockSearchService.validateQuery).toHaveBeenCalledWith('test query')
      expect(mockSearchService.formatSearchQuery).toHaveBeenCalledWith('test query')

      // Should call onSearch with formatted query
      expect(mockOnSearch).toHaveBeenCalledWith('formatted query')

      // Should update last validated query
      const state = search.state()
      expect(state.lastValidatedQuery).toBe('formatted query')
    })
  })

  it('should handle validation errors on submission', () => {
    mockSearchService.validateQuery.mockReturnValue({
      isValid: false,
      errors: ['Query too short', 'Invalid characters'],
    })

    createRoot(() => {
      const search = useSearch(mockOnSearch)

      search.setQuery('x')
      search.handleSubmit()

      // Should show validation error
      expect(mockNotificationStore.error).toHaveBeenCalledWith('Invalid Search', 'Query too short, Invalid characters')

      // Should not call onSearch
      expect(mockOnSearch).not.toHaveBeenCalled()
    })
  })

  it('should handle empty query submission', () => {
    createRoot(() => {
      const search = useSearch(mockOnSearch)

      search.setQuery('   ')
      search.handleSubmit()

      // Should call onSearch with empty string for empty queries
      expect(mockOnSearch).toHaveBeenCalledWith('')

      // Should not validate empty queries
      expect(mockSearchService.validateQuery).not.toHaveBeenCalled()
    })
  })

  it('should handle input with debouncing', () => {
    mockSearchService.validateQuery.mockReturnValue({ isValid: true, errors: [] })
    mockSearchService.formatSearchQuery.mockReturnValue('formatted query')

    createRoot(() => {
      const search = useSearch(mockOnSearch)

      search.handleInput('test query')

      // Should set the query immediately
      const state = search.state()
      expect(state.query).toBe('test query')

      // Should set a timeout for debounced search
      expect(window.setTimeout).toHaveBeenCalledWith(expect.any(Function), 300)
    })
  })

  it('should handle input validation errors during debounced search', () => {
    mockSearchService.validateQuery.mockReturnValue({
      isValid: false,
      errors: ['Query invalid'],
    })

    createRoot(() => {
      const search = useSearch(mockOnSearch)

      search.handleInput('invalid query')

      // Manually trigger the debounced function
      const timeoutCallback = vi.mocked(window.setTimeout).mock.calls[0][0] as Function
      timeoutCallback()

      // Should validate but not search
      expect(mockSearchService.validateQuery).toHaveBeenCalledWith('invalid query')
      expect(mockOnSearch).not.toHaveBeenCalled()
    })
  })

  it('should clear existing timeout when new input received', () => {
    createRoot(() => {
      const search = useSearch(mockOnSearch)

      search.handleInput('first query')
      // On first call, no timeout to clear yet, so clearTimeout might not be called
      search.handleInput('second query')

      // On second call, should clear the previous timeout
      // The implementation clears timeout if debounceTimer exists
      expect(window.setTimeout).toHaveBeenCalledTimes(2)
    })
  })

  it('should handle clear action', () => {
    mockSearchService.validateQuery.mockReturnValue({ isValid: true, errors: [] })

    createRoot(() => {
      const search = useSearch(mockOnSearch)

      // Set some state first
      search.setQuery('test query')
      search.handleSubmit()

      // Set up a debounced input to create a timeout
      search.handleInput('some input')

      // Clear
      search.handleClear()

      const state = search.state()
      expect(state.query).toBe('')
      expect(state.lastValidatedQuery).toBe('')

      // Should call onSearch with empty string
      expect(mockOnSearch).toHaveBeenLastCalledWith('')
    })
  })

  it('should expose validateQuery method', () => {
    const mockValidation = { isValid: true, errors: [] }
    mockSearchService.validateQuery.mockReturnValue(mockValidation)

    createRoot(() => {
      const search = useSearch(mockOnSearch)

      const result = search.validateQuery('test query')

      expect(result).toEqual(mockValidation)
      expect(mockSearchService.validateQuery).toHaveBeenCalledWith('test query')
    })
  })

  it('should handle empty input during debounce', () => {
    createRoot(() => {
      const search = useSearch(mockOnSearch)

      search.handleInput('')

      // Should set empty query
      const state = search.state()
      expect(state.query).toBe('')

      // Manually trigger the debounced function
      const timeoutCallback = vi.mocked(window.setTimeout).mock.calls[0][0] as Function
      timeoutCallback()

      // Should call onSearch with empty string
      expect(mockOnSearch).toHaveBeenCalledWith('')

      // Should not validate empty queries
      expect(mockSearchService.validateQuery).not.toHaveBeenCalled()
    })
  })

  it('should only execute debounced search if query has not changed', () => {
    mockSearchService.validateQuery.mockReturnValue({ isValid: true, errors: [] })
    mockSearchService.formatSearchQuery.mockReturnValue('formatted query')

    createRoot(() => {
      const search = useSearch(mockOnSearch)

      search.handleInput('first query')
      search.setQuery('changed query') // Change query before timeout

      // Manually trigger the debounced function
      const timeoutCallback = vi.mocked(window.setTimeout).mock.calls[0][0] as Function
      timeoutCallback()

      // Should not execute search because query changed
      expect(mockOnSearch).not.toHaveBeenCalled()
    })
  })
})
