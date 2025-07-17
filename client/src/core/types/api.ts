// Core API types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// Request/Response types
export interface UploadResponse {
  file: FileEntity
}

export interface SearchResponse {
  files: SearchResultFile[]
  totalCount: number
  query: string
}

export interface FilesResponse {
  files: FileEntity[]
}

// Domain entities
export interface FileEntity {
  id: string
  filename: string
  originalName: string
  mimetype: string
  size: number
  path: string
  extractedText: string
  metadata: FileMetadata
  uploadedAt: string
  lastModified: string
}

export interface FileMetadata {
  author?: string
  title?: string
  subject?: string
  keywords?: string[]
  pages?: number
  pageCount?: number
  wordCount?: number
  characterCount?: number
  language?: string
  extractionError?: boolean
  errorMessage?: string
  encoding?: string
  format?: string
  pagesExtracted?: number
  unsupportedType?: boolean
  imageWidth?: number
  imageHeight?: number
  imageFormat?: string
  imageChannels?: number
  imageDensity?: number
  ocrLanguage?: string
  ocrEngine?: string
}

export interface SearchResultFile {
  file: FileEntity
  score: number
  highlights?: string[]
}

export interface SearchResult {
  files: SearchResultFile[]
  totalCount: number
  query: string
}
