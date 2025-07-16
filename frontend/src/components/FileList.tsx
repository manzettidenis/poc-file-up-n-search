import { Component, For, Show } from 'solid-js'
import { FileEntity } from '../types.ts'

interface FileListProps {
  files: FileEntity[]
  loading: boolean
  onDelete: (fileId: string) => void
}

const FileList: Component<FileListProps> = props => {
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

  const getFileIcon = (mimetype: string): string => {
    if (mimetype.includes('pdf')) return '📄'
    if (mimetype.includes('image')) return '🖼️'
    if (mimetype.includes('text')) return '📝'
    if (mimetype.includes('word') || mimetype.includes('document')) return '📄'
    return '📁'
  }

  // Debug logging
  console.log('FileList props:', { files: props.files, loading: props.loading, filesLength: props.files?.length })

  return (
    <div class="space-y-3">
      <Show when={props.loading && (!props.files || props.files.length === 0)}>
        {/* // Show loading only if actually loading AND no files yet */}

        <div class="flex items-center justify-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span class="ml-2 text-gray-600">Loading files...</span>
        </div>
      </Show>

      <Show when={!props.loading && (!props.files || props.files.length === 0)}>
        <div class="text-center py-8 text-gray-500">
          <div class="text-4xl mb-2">📂</div>
          <p>No files uploaded yet</p>
        </div>
      </Show>
      <For each={props.files || []}>
        {file => (
          <div class="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
            <div class="flex items-center space-x-4">
              <div class="text-3xl">{getFileIcon(file.mimetype)}</div>
              <div>
                <h3 class="font-medium text-gray-900">{file.originalName}</h3>
                <div class="flex items-center space-x-4 text-sm text-gray-500">
                  <span>{file.mimetype}</span>
                  <span>{formatFileSize(file.size)}</span>
                  <span>Uploaded: {formatDate(file.uploadedAt)}</span>
                </div>
                {file.metadata.wordCount && <p class="text-sm text-gray-400 mt-1">{file.metadata.wordCount} words</p>}
              </div>
            </div>

            <div class="flex items-center space-x-2">
              <a
                href={`http://localhost:3001/uploads/${file.filename}`}
                target="_blank"
                class="px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded"
              >
                View
              </a>
              <button
                onClick={() => props.onDelete(file.id)}
                class="px-3 py-1 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded"
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </For>
    </div>
  )
}

export default FileList
