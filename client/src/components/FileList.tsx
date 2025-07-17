import { Component, For, Show } from 'solid-js'
import { FileEntity } from '../core/types/api'
import { fileService } from '../features/file-management/services/fileService'
import LoadingSpinner from '../shared/components/LoadingSpinner'
import EmptyState from '../shared/components/EmptyState'

interface FileListProps {
  files: FileEntity[]
  loading: boolean
  onDelete: (fileId: string) => void
  searchQuery?: string
}

const FileList: Component<FileListProps> = props => {
  return (
    <div class="space-y-3">
      <Show when={props.loading && (!props.files || props.files.length === 0)}>
        <LoadingSpinner text="Loading files..." center />
      </Show>

      <Show when={!props.loading && (!props.files || props.files.length === 0)}>
        <EmptyState
          icon="📂"
          title={props.searchQuery ? 'No files found' : 'No files uploaded yet'}
          description={
            props.searchQuery
              ? `No files found matching "${props.searchQuery}". Try different keywords or check if files contain the text you're looking for.`
              : 'Upload your first file to get started!'
          }
        />
      </Show>

      <For each={props.files || []}>
        {file => (
          <div class="flex flex-col items-start justify-between p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
            <div class="flex w-1/2 flex-row items-center space-x-4">
              <div class="text-3xl">{fileService.getFileIcon(file.mimetype)}</div>
              <div>
                <h3 class="font-medium text-gray-900">{file.originalName}</h3>
                <div class="flex items-center space-x-4 text-sm text-gray-500">
                  <span>{fileService.getFileTypeLabel(file.mimetype)}</span>
                  <span>{fileService.formatFileSize(file.size)}</span>
                  <span>Uploaded: {fileService.formatDate(file.uploadedAt)}</span>
                </div>
                {file.metadata.wordCount && <p class="text-sm text-gray-400 mt-1">{file.metadata.wordCount} words</p>}
                {file.extractedText && file.extractedText.length > 0 && (
                  <p class="text-sm text-gray-600 mt-2 line-clamp-2">{fileService.truncateText(file.extractedText)}</p>
                )}
              </div>
            </div>

            <div class="flex flex-row items-center space-x-2 mt-4">
              <a
                href={fileService.getFileViewUrl(file.filename)}
                target="_blank"
                class="px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
              >
                View
              </a>
              <button
                onClick={() => props.onDelete(file.id)}
                class="px-3 py-1 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors"
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
