import { type Component } from 'solid-js'
import NotificationToast from '../../shared/components/NotificationToast'
import FileUploadZone from '../file-upload/components/FileUploadZone'
import SearchBar from '../file-search/components/SearchBar'
import FileList from '../file-management/components/FileList'
import { useFileManager } from './hooks/useFileManager'

const App: Component = () => {
  const { state, handleFileUploaded, handleSearch, handleFileDeleted } = useFileManager()

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

              {state().searchResults && (
                <div class="mt-6">
                  <h3 class="text-lg font-medium text-gray-800 mb-3">
                    Search Results ({state().searchResults?.totalCount || 0})
                  </h3>
                  <FileList
                    files={state().searchResults?.files?.map((result: any) => result.file) || []}
                    loading={state().isSearchLoading}
                    onDelete={handleFileDeleted}
                    searchQuery={state().searchQuery}
                  />
                </div>
              )}
            </div>
          </div>

          {/* All Files List */}
          <div class="mt-8 bg-white rounded-lg shadow-md p-6">
            <h2 class="text-2xl font-semibold text-gray-800 mb-4">Uploaded Files ({state().files?.length || 0})</h2>
            <FileList files={state().files || []} loading={state().isFilesLoading} onDelete={handleFileDeleted} />
          </div>
        </div>
      </div>
    </>
  )
}

export default App
