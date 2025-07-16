import { Component, createSignal, createResource, For, Show } from 'solid-js'
import FileUpload from './components/FileUpload.tsx'
import SearchBar from './components/SearchBar.tsx'
import FileList from './components/FileList.tsx'
import { FileEntity, SearchResult } from './types.ts'
import { handleApiResponse, getErrorMessage } from './utils/api.ts'

const App: Component = () => {
  const [searchQuery, setSearchQuery] = createSignal<string>('')
  const [uploadedFiles, setUploadedFiles] = createSignal<FileEntity[]>([])
  const [refreshTrigger, setRefreshTrigger] = createSignal(0)
  const [error, setError] = createSignal<string | null>(null)
  const [success, setSuccess] = createSignal<string | null>(null)

  const clearMessages = () => {
    setError(null)
    setSuccess(null)
  }

  // Search resource with error handling
  const [searchResults] = createResource(searchQuery, async (query: string): Promise<SearchResult | null> => {
    if (!query.trim()) return null

    try {
      console.log('Searching for:', query)
      const response = await fetch(`http://localhost:3001/api/search?q=${encodeURIComponent(query)}`)
      const data = await handleApiResponse<SearchResult>(response)
      console.log('Search response:', data)
      return data
    } catch (error) {
      console.error('Search failed:', error)
      setError(getErrorMessage(error))
      return null
    }
  })

  // Files resource with refresh trigger and error handling
  const [files] = createResource(refreshTrigger, async (): Promise<FileEntity[]> => {
    try {
      console.log('Fetching files...')
      const response = await fetch('http://localhost:3001/api/files')
      const data = await handleApiResponse<{ files: FileEntity[] }>(response)
      console.log('Files response:', data)
      return data.files || []
    } catch (error) {
      console.error('Failed to fetch files:', error)
      setError(getErrorMessage(error))
      return []
    }
  })

  const handleFileUploaded = (file: FileEntity) => {
    console.log('File uploaded:', file)
    setUploadedFiles(prev => [...prev, file])
    // Trigger files refresh
    setRefreshTrigger(prev => prev + 1)
    clearMessages()
  }

  const handleSearch = (query: string) => {
    console.log('Search triggered:', query)
    clearMessages()
    setSearchQuery(query)
  }

  const handleFileDeleted = async (fileId: string) => {
    try {
      console.log('Deleting file:', fileId)
      const response = await fetch(`http://localhost:3001/api/files/${fileId}`, {
        method: 'DELETE',
      })

      await handleApiResponse(response)

      setUploadedFiles(prev => prev.filter(f => f.id !== fileId))
      // Trigger files refresh
      setRefreshTrigger(prev => prev + 1)
      setSuccess('File deleted successfully')

      // Also refresh search results if there's an active search
      const currentQuery = searchQuery()
      if (currentQuery && currentQuery.trim()) {
        // Re-trigger the search to update results
        setSearchQuery('')
        setTimeout(() => setSearchQuery(currentQuery), 100)
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000)
    } catch (error) {
      setError(getErrorMessage(error))
      console.error('Failed to delete file:', error)
    }
  }

  return (
    <div class="min-h-screen bg-gray-50 py-8">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-8">
          <h1 class="text-4xl font-bold text-gray-900 mb-2">File Upload & Search</h1>
          <p class="text-xl text-gray-600">Upload files and search through their content</p>
        </div>

        {/* Global Error Message */}
        <Show when={error()}>
          <div class="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
            <div class="text-red-500 text-xl">❌</div>
            <div class="flex-1">
              <h4 class="text-red-800 font-medium">Error</h4>
              <p class="text-red-700 text-sm mt-1">{error()}</p>
            </div>
            <button onClick={() => setError(null)} class="text-red-400 hover:text-red-600">
              ✕
            </button>
          </div>
        </Show>

        {/* Global Success Message */}
        <Show when={success()}>
          <div class="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-3">
            <div class="text-green-500 text-xl">✅</div>
            <div class="flex-1">
              <h4 class="text-green-800 font-medium">Success</h4>
              <p class="text-green-700 text-sm mt-1">{success()}</p>
            </div>
            <button onClick={() => setSuccess(null)} class="text-green-400 hover:text-green-600">
              ✕
            </button>
          </div>
        </Show>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Section */}
          <div class="bg-white rounded-lg shadow-md p-6">
            <h2 class="text-2xl font-semibold text-gray-800 mb-4">Upload Files</h2>
            <FileUpload onFileUploaded={handleFileUploaded} />
          </div>

          {/* Search Section */}
          <div class="bg-white rounded-lg shadow-md p-6">
            <h2 class="text-2xl font-semibold text-gray-800 mb-4">Search Files</h2>
            <SearchBar onSearch={handleSearch} />

            {searchResults() && (
              <div class="mt-6">
                <h3 class="text-lg font-medium text-gray-800 mb-3">
                  Search Results ({searchResults()?.totalCount || 0})
                </h3>

                <Show when={searchResults.loading}>
                  <div class="flex items-center justify-center py-8">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    <span class="ml-2 text-gray-600">Searching...</span>
                  </div>
                </Show>

                <Show when={!searchResults.loading && searchResults() && searchResults()?.files?.length === 0}>
                  <div class="text-center py-8 text-gray-500">
                    <div class="text-4xl mb-2">🔍</div>
                    <p>No files found matching "{searchQuery()}"</p>
                    <p class="text-sm mt-1">
                      Try different keywords or check if files contain the text you're looking for.
                    </p>
                  </div>
                </Show>

                <Show when={!searchResults.loading && searchResults() && searchResults()?.files?.length! > 0}>
                  <div class="space-y-3">
                    <For each={searchResults()?.files || []}>
                      {result => {
                        const getFileIcon = (mimetype: string): string => {
                          if (mimetype.includes('pdf')) return '📄'
                          if (mimetype.includes('image')) return '🖼️'
                          if (mimetype.includes('text')) return '📝'
                          if (mimetype.includes('word') || mimetype.includes('document')) return '📄'
                          return '📁'
                        }

                        const formatFileSize = (bytes: number): string => {
                          if (bytes === 0) return '0 Bytes'
                          const k = 1024
                          const sizes = ['Bytes', 'KB', 'MB', 'GB']
                          const i = Math.floor(Math.log(bytes) / Math.log(k))
                          return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
                        }

                        const formatDate = (dateString: string): string => {
                          return new Date(dateString).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        }

                        return (
                          <div class="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow bg-yellow-50 border-yellow-200">
                            <div class="flex items-center space-x-4">
                              <div class="text-3xl">{getFileIcon(result.file.mimetype)}</div>
                              <div class="flex-1">
                                <h4 class="font-medium text-gray-900">{result.file.originalName}</h4>
                                <div class="flex items-center space-x-4 text-sm text-gray-500">
                                  <span>{result.file.mimetype}</span>
                                  <span>{formatFileSize(result.file.size)}</span>
                                  <span>Uploaded: {formatDate(result.file.uploadedAt)}</span>
                                </div>
                                <div class="flex items-center space-x-4 text-sm text-gray-400 mt-1">
                                  <span>Match: {Math.round((1 - result.score) * 100)}%</span>
                                  {result.file.metadata.wordCount && (
                                    <span>{result.file.metadata.wordCount} words</span>
                                  )}
                                  {result.file.metadata.ocrLanguage && (
                                    <span>OCR: {result.file.metadata.ocrLanguage}</span>
                                  )}
                                </div>
                                {/* Show text preview if available */}
                                {result.file.extractedText && result.file.extractedText.length > 0 && (
                                  <p class="text-sm text-gray-600 mt-2 line-clamp-2">
                                    {result.file.extractedText.substring(0, 200)}
                                    {result.file.extractedText.length > 200 ? '...' : ''}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div class="flex items-center space-x-2 ml-4">
                              <a
                                href={`http://localhost:3001/uploads/${result.file.filename}`}
                                target="_blank"
                                class="px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
                              >
                                View
                              </a>
                              <button
                                onClick={() => handleFileDeleted(result.file.id)}
                                class="px-3 py-1 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        )
                      }}
                    </For>
                  </div>
                </Show>
              </div>
            )}
          </div>
        </div>

        {/* Files List */}
        <div class="mt-8 bg-white rounded-lg shadow-md p-6">
          <h2 class="text-2xl font-semibold text-gray-800 mb-4">Uploaded Files ({files()?.length || 0})</h2>
          <FileList files={files() || []} loading={files.loading} onDelete={handleFileDeleted} />
        </div>
      </div>
    </div>
  )
}

export default App
