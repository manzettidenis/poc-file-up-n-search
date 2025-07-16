import { Component, createSignal, Show } from 'solid-js'
import { FileEntity, ApiResponse } from '../types.ts'
import { handleApiResponse, getErrorMessage } from '../utils/api.ts'

interface FileUploadProps {
  onFileUploaded: (file: FileEntity) => void
}

const FileUpload: Component<FileUploadProps> = props => {
  const [isDragging, setIsDragging] = createSignal(false)
  const [isUploading, setIsUploading] = createSignal(false)
  const [uploadProgress, setUploadProgress] = createSignal(0)
  const [error, setError] = createSignal<string | null>(null)
  const [success, setSuccess] = createSignal<string | null>(null)

  const clearMessages = () => {
    setError(null)
    setSuccess(null)
  }

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = e.dataTransfer?.files
    if (files && files.length > 0) {
      uploadFile(files[0])
    }
  }

  const handleFileSelect = (e: Event) => {
    const target = e.target as HTMLInputElement
    const files = target.files
    if (files && files.length > 0) {
      uploadFile(files[0])
    }
  }

  const uploadFile = async (file: File) => {
    clearMessages()
    setIsUploading(true)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append('file', file)

      console.log('Uploading file:', file.name)
      const response = await fetch('http://localhost:3001/api/upload', {
        method: 'POST',
        body: formData,
      })

      const fileData = await handleApiResponse<FileEntity>(response)
      console.log('Upload result:', fileData)

      props.onFileUploaded(fileData)
      setUploadProgress(100)
      setSuccess(`File "${file.name}" uploaded successfully!`)

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000)
    } catch (error) {
      setError(getErrorMessage(error))
      console.error('Upload error:', error)
    } finally {
      setIsUploading(false)
      setTimeout(() => setUploadProgress(0), 2000)
    }
  }

  return (
    <div class="space-y-4">
      {/* Error Message */}
      <Show when={error()}>
        <div class="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
          <div class="text-red-500 text-xl">❌</div>
          <div class="flex-1">
            <h4 class="text-red-800 font-medium">Upload Error</h4>
            <p class="text-red-700 text-sm mt-1">{error()}</p>
          </div>
          <button onClick={() => setError(null)} class="text-red-400 hover:text-red-600">
            ✕
          </button>
        </div>
      </Show>

      {/* Success Message */}
      <Show when={success()}>
        <div class="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-3">
          <div class="text-green-500 text-xl">✅</div>
          <div class="flex-1">
            <h4 class="text-green-800 font-medium">Upload Successful</h4>
            <p class="text-green-700 text-sm mt-1">{success()}</p>
          </div>
          <button onClick={() => setSuccess(null)} class="text-green-400 hover:text-green-600">
            ✕
          </button>
        </div>
      </Show>

      <div
        class={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging() ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div class="space-y-4">
          <div class="text-6xl text-gray-400">📁</div>
          <div>
            <h3 class="text-lg font-medium text-gray-900">Drop files here or click to browse</h3>
            <p class="text-gray-500 mt-1">Supports: TXT, PDF, DOC, DOCX, Images (PNG, JPG, JPEG)</p>
          </div>
          <label class="inline-block">
            <input
              type="file"
              class="hidden"
              accept=".txt,.pdf,.doc,.docx,.jpg,.jpeg,.png,.tiff,.bmp,.webp"
              onChange={handleFileSelect}
              disabled={isUploading()}
            />
            <span
              class={`px-6 py-2 rounded-lg cursor-pointer inline-block transition-colors ${
                isUploading()
                  ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              {isUploading() ? 'Uploading...' : 'Choose File'}
            </span>
          </label>
        </div>
      </div>

      {isUploading() && (
        <div class="space-y-2">
          <div class="flex justify-between text-sm">
            <span>Uploading...</span>
            <span>{uploadProgress()}%</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div
              class="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={`width: ${uploadProgress()}%`}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default FileUpload
