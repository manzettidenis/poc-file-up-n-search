import { createSignal } from 'solid-js'
import { uploadService, UploadProgress } from '../services/uploadService'
import { notificationStore } from '../../../core/stores/notifications'
import { FileEntity } from '../../../core/types/api'

export interface UseFileUploadState {
  isUploading: boolean
  progress: UploadProgress | null
  dragOver: boolean
  lastUploadedFile: FileEntity | null
}

export interface UseFileUploadActions {
  uploadFile: (file: File) => Promise<FileEntity | null>
  setDragOver: (dragOver: boolean) => void
  reset: () => void
  validateFile: (file: File) => { isValid: boolean; errors: string[] }
}

export interface UseFileUploadReturn extends UseFileUploadActions {
  state: () => UseFileUploadState
}

const initialState: UseFileUploadState = {
  isUploading: false,
  progress: null,
  dragOver: false,
  lastUploadedFile: null,
}

export function useFileUpload(): UseFileUploadReturn {
  const [state, setState] = createSignal<UseFileUploadState>(initialState)

  const uploadFile = async (file: File): Promise<FileEntity | null> => {
    // 1. Validate file first
    const validation = uploadService.validateFile(file)
    if (!validation.isValid) {
      notificationStore.error('Upload Failed', validation.errors.join(', '))
      return null
    }

    // 2. Start upload process
    setState(prev => ({
      ...prev,
      isUploading: true,
      progress: { loaded: 0, total: file.size, percentage: 0 },
    }))

    try {
      // 3. Upload with progress tracking
      const uploadedFile = await uploadService.uploadFile(file, progress => {
        setState(prev => ({ ...prev, progress }))
      })

      // 4. Success state
      setState(prev => ({
        ...prev,
        isUploading: false,
        progress: null,
        lastUploadedFile: uploadedFile,
      }))

      // 5. Show success notification
      notificationStore.success('Upload Successful', `${file.name} uploaded successfully`)

      return uploadedFile
    } catch (error) {
      // 6. Error handling
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      notificationStore.error('Upload Failed', errorMessage)

      setState(prev => ({
        ...prev,
        isUploading: false,
        progress: null,
      }))

      return null
    }
  }

  const setDragOver = (dragOver: boolean) => {
    setState(prev => ({ ...prev, dragOver }))
  }

  const reset = () => {
    setState(initialState)
  }

  const validateFile = (file: File) => {
    return uploadService.validateFile(file)
  }

  return {
    state,
    uploadFile,
    setDragOver,
    reset,
    validateFile,
  }
}
