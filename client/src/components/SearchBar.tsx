import { Component, createSignal } from 'solid-js'
import { searchService } from '../features/file-search/services/searchService'
import { notificationStore } from '../core/stores/notifications'

interface SearchBarProps {
  onSearch: (query: string) => void
}

const SearchBar: Component<SearchBarProps> = props => {
  const [query, setQuery] = createSignal('')

  const handleSubmit = (e: Event) => {
    e.preventDefault()
    const searchQuery = query().trim()

    if (!searchQuery) {
      props.onSearch('')
      return
    }

    // Validate query
    const validation = searchService.validateQuery(searchQuery)
    if (!validation.isValid) {
      notificationStore.error('Invalid Search', validation.errors.join(', '))
      return
    }

    // Format and execute search
    const formattedQuery = searchService.formatSearchQuery(searchQuery)
    props.onSearch(formattedQuery)
  }

  const handleInput = (e: Event) => {
    const target = e.target as HTMLInputElement
    setQuery(target.value)

    // Debounced search for real-time results
    setTimeout(() => {
      if (target.value === query()) {
        const searchQuery = target.value.trim()

        if (!searchQuery) {
          props.onSearch('')
          return
        }

        // Only search if query is valid
        const validation = searchService.validateQuery(searchQuery)
        if (validation.isValid) {
          const formattedQuery = searchService.formatSearchQuery(searchQuery)
          props.onSearch(formattedQuery)
        }
      }
    }, 300)
  }

  const handleClear = () => {
    setQuery('')
    props.onSearch('')
  }

  return (
    <form onSubmit={handleSubmit} class="space-y-4">
      <div class="relative">
        <input
          type="text"
          placeholder="Search through file contents..."
          value={query()}
          onInput={handleInput}
          class="w-full px-4 py-3 pl-12 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          maxlength="1000"
        />
        <div class="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">🔍</div>
        {query() && (
          <button
            type="button"
            onClick={handleClear}
            class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        )}
      </div>
      <div class="text-xs text-gray-500">Tip: Use specific keywords from your documents for better results</div>
    </form>
  )
}

export default SearchBar
