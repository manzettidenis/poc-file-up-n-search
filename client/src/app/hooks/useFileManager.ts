import { createSignal, createResource } from 'solid-js'
import { FileEntity } from '../../core/types/api'
import { searchService } from '../../features/file-search/services/searchService'
import { fileService } from '../../features/file-management/services/fileService'
import { notificationStore } from '../../core/stores/notifications'

export interface UseFileManagerState {
  searchQuery: string
  files: FileEntity[]
  searchResults: any
  isFilesLoading: boolean
  isSearchLoading: boolean
}

export interface UseFileManagerActions {
  handleFileUploaded: (file: FileEntity) => void
  handleSearch: (query: string) => void
  handleFileDeleted: (fileId: string) => Promise<void>
  refreshFiles: () => void
}

export interface UseFileManagerReturn extends UseFileManagerActions {
  state: () => UseFileManagerState
  filesResource: any
  searchResultsResource: any
}

export function useFileManager(): UseFileManagerReturn {
  const [searchQuery, setSearchQuery] = createSignal<string>('')
  const [refreshTrigger, setRefreshTrigger] = createSignal(0)

  // Search resource
  const [searchResults] = createResource(searchQuery, async (query: string) => {
    if (!query.trim()) return null

    try {
      return await searchService.searchFiles(query)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Search failed'
      notificationStore.error('Search Failed', errorMessage)
      return null
    }
  })

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
    // Refresh files list
    setRefreshTrigger(prev => prev + 1)

    // Refresh search results if there's an active search
    const currentQuery = searchQuery()
    if (currentQuery && currentQuery.trim()) {
      setSearchQuery('')
      setTimeout(() => setSearchQuery(currentQuery), 100)
    }
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
  }

  const handleFileDeleted = async (fileId: string) => {
    try {
      await fileService.deleteFile(fileId)
      notificationStore.success('File Deleted', 'File deleted successfully!')

      // Refresh files and search results
      setRefreshTrigger(prev => prev + 1)

      const currentQuery = searchQuery()
      if (currentQuery && currentQuery.trim()) {
        setSearchQuery('')
        setTimeout(() => setSearchQuery(currentQuery), 100)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete file'
      notificationStore.error('Delete Failed', errorMessage)
    }
  }

  const refreshFiles = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  const state = () => ({
    searchQuery: searchQuery(),
    files: files() || [],
    searchResults: searchResults(),
    isFilesLoading: files.loading,
    isSearchLoading: searchResults.loading,
  })

  return {
    state,
    filesResource: files,
    searchResultsResource: searchResults,
    handleFileUploaded,
    handleSearch,
    handleFileDeleted,
    refreshFiles,
  }
}
