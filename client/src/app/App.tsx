import { Component, createResource, createSignal } from 'solid-js'
import { searchService } from '../features/file-search/services/searchService'
import { fileService } from '../features/file-management/services/fileService'
import { notificationStore } from '../core/stores/notifications'
import NotificationToast from '../shared/components/NotificationToast'
import FileUploadZone from '../features/file-upload/components/FileUploadZone'
import SearchBar from '../components/SearchBar'
import FileList from '../components/FileList'

const App: Component = () => {
  const [searchQuery, setSearchQuery] = createSignal<string>('')
  const [refreshTrigger, setRefreshTrigger] = createSignal(0)
  const [searchRefreshTrigger, setSearchRefreshTrigger] = createSignal(0)

  // Search resource - now depends on both query and refresh trigger
  const [searchResults] = createResource(
    () => ({ query: searchQuery(), refresh: searchRefreshTrigger() }),
    async ({ query }) => {
      if (!query.trim()) return null

      try {
        return await searchService.searchFiles(query)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Search failed'
        notificationStore.error('Search Failed', errorMessage)
        return null
      }
    },
  )

  // Files resource
  const [files] = createResource(refreshTrigger, async () => {
    try {
      const response = await searchService.getAllFiles()
      return response.files || []
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to retrieve files'
      notificationStore.error('Failed to Load Files', errorMessage)
      return []
    }
  })

  const handleFileUploaded = () => {
    setRefreshTrigger(prev => prev + 1)

    // Clear search cache and refresh search results if there's an active search
    const currentQuery = searchQuery()
    if (currentQuery && currentQuery.trim()) {
      searchService.clearCache() // Clear cache to ensure fresh results include new file
      setSearchRefreshTrigger(prev => prev + 1)
    }
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
  }

  const handleFileDeleted = async (fileId: string) => {
    try {
      await fileService.deleteFile(fileId)
      notificationStore.success('File Deleted', 'File deleted successfully!')

      // Refresh files list
      setRefreshTrigger(prev => prev + 1)

      // Clear search cache and refresh search results if there's an active search
      const currentQuery = searchQuery()
      if (currentQuery && currentQuery.trim()) {
        searchService.clearCache() // Clear cache to ensure fresh results
        setSearchRefreshTrigger(prev => prev + 1)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete file'
      notificationStore.error('Delete Failed', errorMessage)
    }
  }

  return (
    <>
      <NotificationToast />
      <div class="min-h-screen bg-gray-50 py-8">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="text-center mb-8">
            <h1 class="text-4xl font-bold text-gray-900 mb-2">File Upload & Search</h1>
            <p class="text-xl text-gray-600">Upload files and search through their content</p>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Upload Section */}
            <div class="bg-white rounded-lg shadow-md p-6">
              <h2 class="text-2xl font-semibold text-gray-800 mb-4">Upload Files</h2>
              <FileUploadZone onFileUploaded={handleFileUploaded} />
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
                  <FileList
                    files={searchResults()?.files?.map((result: any) => result.file) || []}
                    loading={searchResults.loading}
                    onDelete={handleFileDeleted}
                    searchQuery={searchQuery()}
                  />
                </div>
              )}
            </div>
          </div>

          {/* All Files List */}
          <div class="mt-8 bg-white rounded-lg shadow-md p-6">
            <h2 class="text-2xl font-semibold text-gray-800 mb-4">Uploaded Files ({files()?.length || 0})</h2>
            <FileList files={files() || []} loading={files.loading} onDelete={handleFileDeleted} />
          </div>
        </div>
      </div>
    </>
  )
}

export default App
