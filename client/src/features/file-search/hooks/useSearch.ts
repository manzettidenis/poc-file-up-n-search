import { createSignal } from 'solid-js'
import { searchService } from '../services/searchService'
import { notificationStore } from '../../../core/stores/notifications'

export interface UseSearchState {
  query: string
  isValidating: boolean
  lastValidatedQuery: string
}

export interface UseSearchActions {
  setQuery: (query: string) => void
  handleSubmit: () => void
  handleInput: (query: string) => void
  handleClear: () => void
  validateQuery: (query: string) => { isValid: boolean; errors: string[] }
}

export interface UseSearchReturn extends UseSearchActions {
  state: () => UseSearchState
}

export function useSearch(onSearch: (query: string) => void): UseSearchReturn {
  const [query, setQuerySignal] = createSignal('')
  const [isValidating, setIsValidating] = createSignal(false)
  const [lastValidatedQuery, setLastValidatedQuery] = createSignal('')

  // Debounce timer reference
  let debounceTimer: number | undefined

  const setQuery = (newQuery: string) => {
    setQuerySignal(newQuery)
  }

  const validateQuery = (searchQuery: string) => {
    return searchService.validateQuery(searchQuery)
  }

  const executeSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) {
      onSearch('')
      return
    }

    // Validate query
    const validation = validateQuery(searchQuery)
    if (!validation.isValid) {
      notificationStore.error('Invalid Search', validation.errors.join(', '))
      return
    }

    // Format and execute search
    const formattedQuery = searchService.formatSearchQuery(searchQuery)
    setLastValidatedQuery(formattedQuery)
    onSearch(formattedQuery)
  }

  const handleSubmit = () => {
    const searchQuery = query().trim()
    executeSearch(searchQuery)
  }

  const handleInput = (newQuery: string) => {
    setQuery(newQuery)

    // Clear existing timer
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    // Set new debounced search
    debounceTimer = window.setTimeout(() => {
      // Only search if the query hasn't changed since timer was set
      if (newQuery === query()) {
        const searchQuery = newQuery.trim()

        if (!searchQuery) {
          onSearch('')
          return
        }

        // Only search if query is valid
        const validation = validateQuery(searchQuery)
        if (validation.isValid) {
          setIsValidating(true)
          const formattedQuery = searchService.formatSearchQuery(searchQuery)
          setLastValidatedQuery(formattedQuery)
          onSearch(formattedQuery)
          setIsValidating(false)
        }
      }
    }, 300)
  }

  const handleClear = () => {
    setQuery('')
    setLastValidatedQuery('')
    onSearch('')

    // Clear any pending debounce
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }
  }

  const state = () => ({
    query: query(),
    isValidating: isValidating(),
    lastValidatedQuery: lastValidatedQuery(),
  })

  return {
    state,
    setQuery,
    handleSubmit,
    handleInput,
    handleClear,
    validateQuery,
  }
}
