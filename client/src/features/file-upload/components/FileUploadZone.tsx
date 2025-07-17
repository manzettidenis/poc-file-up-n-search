import { Component, Show } from 'solid-js'
import { FileEntity } from '../../../core/types/api'
import { useFileUpload } from '../hooks/useFileUpload'
import { uploadService } from '../services/uploadService'
import LoadingSpinner from '../../../shared/components/LoadingSpinner'

interface FileUploadZonePureProps {
  onFileUploaded: (file: FileEntity) => void
}

const FileUploadZonePure: Component<FileUploadZonePureProps> = props => {
  // All business logic is in the hook
  const upload = useFileUpload()

  // Pure event handlers - no business logic
  const handleFileSelect = async (file: File) => {
    const result = await upload.uploadFile(file)
    if (result) {
      props.onFileUploaded(result)
    }
  }

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    upload.setDragOver(true)
  }

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault()
    upload.setDragOver(false)
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    upload.setDragOver(false)
    const files = e.dataTransfer?.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleFileInputChange = (e: Event) => {
    const target = e.target as HTMLInputElement
    const files = target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
    target.value = '' // Reset input
  }

  // Pure rendering logic
  const state = upload.state()
  const getBorderColor = () => {
    if (state.isUploading) return 'border-blue-300'
    if (state.dragOver) return 'border-blue-500'
    return 'border-gray-300'
  }

  const getBackgroundColor = () => {
    if (state.isUploading) return 'bg-blue-50'
    if (state.dragOver) return 'bg-blue-50'
    return 'bg-gray-50'
  }

  return (
    <div class="space-y-4">
      <div
        class={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${getBorderColor()} ${getBackgroundColor()}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Show
          when={!state.isUploading}
          fallback={
            <div class="space-y-4">
              <LoadingSpinner size="lg" text="Uploading..." center />
              <Show when={state.progress}>
                <div class="w-full bg-gray-200 rounded-full h-2">
                  <div
                    class="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${state.progress?.percentage || 0}%` }}
                  ></div>
                </div>
                <p class="text-sm text-gray-600">
                  {state.progress?.percentage}% ({state.progress?.loaded} / {state.progress?.total} bytes)
                </p>
              </Show>
            </div>
          }
        >
          <div class="space-y-4">
            <div class="text-6xl">📁</div>
            <div>
              <h3 class="text-lg font-medium text-gray-900">Upload a file</h3>
              <p class="text-gray-500 mt-1">
                Drag and drop a file here, or{' '}
                <label class="text-blue-600 hover:text-blue-500 cursor-pointer font-medium">
                  browse
                  <input
                    type="file"
                    class="hidden"
                    accept={uploadService.getAcceptAttribute()}
                    onChange={handleFileInputChange}
                    disabled={state.isUploading}
                  />
                </label>
              </p>
              <p class="text-gray-500 text-sm mt-2">Supports: {uploadService.getSupportedFormats().join(', ')}</p>
              <p class="text-gray-400 text-xs mt-1">Maximum file size: 50MB</p>
            </div>
          </div>
        </Show>
      </div>
    </div>
  )
}

export default FileUploadZonePure
