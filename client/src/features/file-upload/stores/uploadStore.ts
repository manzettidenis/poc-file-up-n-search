import { createSignal } from 'solid-js'
import { UploadProgress } from '../services/uploadService'

export interface UploadState {
  isUploading: boolean
  progress: UploadProgress | null
  dragOver: boolean
}

// Upload state signals
const [uploadState, setUploadState] = createSignal<UploadState>({
  isUploading: false,
  progress: null,
  dragOver: false,
})

export const uploadStore = {
  // Getters
  state: uploadState,
  get isUploading() {
    return uploadState().isUploading
  },
  get progress() {
    return uploadState().progress
  },
  get dragOver() {
    return uploadState().dragOver
  },

  // Actions
  setUploading(isUploading: boolean) {
    setUploadState(prev => ({ ...prev, isUploading }))
  },

  setProgress(progress: UploadProgress | null) {
    setUploadState(prev => ({ ...prev, progress }))
  },

  setDragOver(dragOver: boolean) {
    setUploadState(prev => ({ ...prev, dragOver }))
  },

  reset() {
    setUploadState({
      isUploading: false,
      progress: null,
      dragOver: false,
    })
  },

  startUpload() {
    setUploadState(prev => ({
      ...prev,
      isUploading: true,
      progress: { loaded: 0, total: 0, percentage: 0 },
    }))
  },

  finishUpload() {
    setUploadState(prev => ({
      ...prev,
      isUploading: false,
      progress: null,
    }))
  },
}
