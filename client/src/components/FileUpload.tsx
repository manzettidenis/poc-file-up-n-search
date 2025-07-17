import { Component, createSignal } from 'solid-js'
import { ApiError, FileEntity } from '../core/types/api'
import { uploadService } from '../features/file-upload/services/uploadService'

interface FileUploadProps {
  onFileUploaded: (file: FileEntity) => void
  onError?: (error: string) => void
}

const FileUpload: Component<FileUploadProps> = props => {
  const [isUploading, setIsUploading] = createSignal(false)
  const [dragOver, setDragOver] = createSignal(false)

  const handleFileSelect = async (file: File) => {
    if (!file) return

    setIsUploading(true)

    try {
      console.log('Uploading file:', file.name)
      const uploadedFile = await uploadService.uploadFile(file)
      console.log('Upload successful:', uploadedFile)
      props.onFileUploaded(uploadedFile)
    } catch (error) {
      console.error('Upload failed:', error)
      if (error instanceof ApiError) {
        props.onError?.(error.message)
      } else {
        props.onError?.('Upload failed: Network error')
      }
    } finally {
      setIsUploading(false)
    }
  }

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragOver(false)

    const files = e.dataTransfer?.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  return (
    <div class="space-y-4">
      {/* Error Message */}
      {/* Success Message */}

      <div
        class={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragOver() ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div class="space-y-4">
          <div class="text-6xl text-gray-400">📁</div>
          <div>
            <h3 class="text-lg font-medium text-gray-900">Drop files here or click to browse</h3>
            <p class="text-gray-500 mt-1">Supports: TXT, PDF, DOC, DOCX, Images (PNG, JPG, JPEG, TIFF, BMP, WebP)</p>
          </div>
          <label class="inline-block">
            <input
              type="file"
              class="hidden"
              accept=".txt,.pdf,.doc,.docx,.jpg,.jpeg,.png,.tiff,.bmp,.webp"
              onChange={e => {
                const target = e.target as HTMLInputElement
                const files = target.files
                if (files && files.length > 0) {
                  handleFileSelect(files[0])
                }
              }}
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
            <span>0%</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div class="bg-blue-500 h-2 rounded-full transition-all duration-300" style={`width: 0%`} />
          </div>
        </div>
      )}
    </div>
  )
}

export default FileUpload
