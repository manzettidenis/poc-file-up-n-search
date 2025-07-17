import { Component } from 'solid-js'
import { useSearch } from '../hooks/useSearch'

interface SearchBarProps {
  onSearch: (query: string) => void
}

const SearchBar: Component<SearchBarProps> = props => {
  const { state, handleSubmit, handleInput, handleClear } = useSearch(props.onSearch)

  return (
    <form onSubmit={handleSubmit} class="space-y-4">
      <div class="relative">
        <input
          type="text"
          placeholder="Search through file contents..."
          value={state().query}
          onInput={e => handleInput(e.target.value)}
          class="w-full px-4 py-3 pl-12 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          maxlength="1000"
        />
        <div class="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">🔍</div>
        {state().query && (
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
