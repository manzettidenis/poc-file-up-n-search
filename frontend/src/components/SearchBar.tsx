import { Component, createSignal } from 'solid-js'

interface SearchBarProps {
  onSearch: (query: string) => void
}

const SearchBar: Component<SearchBarProps> = props => {
  const [query, setQuery] = createSignal('')

  const handleSubmit = (e: Event) => {
    e.preventDefault()
    props.onSearch(query())
  }

  const handleInput = (e: Event) => {
    const target = e.target as HTMLInputElement
    setQuery(target.value)

    // Debounced search
    setTimeout(() => {
      if (target.value === query()) {
        props.onSearch(target.value)
      }
    }, 300)
  }

  return (
    <form onSubmit={handleSubmit} class="space-y-4">
      <div class="relative">
        <input
          type="text"
          placeholder="Search through file contents..."
          value={query()}
          onInput={handleInput}
          class="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        />
        <div class="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">🔍</div>
      </div>
    </form>
  )
}

export default SearchBar
