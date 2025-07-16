export interface FileEntity {
  id: string
  filename: string
  originalName: string
  mimetype: string
  size: number
  path: string
  extractedText: string
  metadata: FileMetadata
  uploadedAt: Date
  lastModified: Date
}

export interface FileMetadata {
  author?: string
  title?: string
  subject?: string
  keywords?: string[]
  pages?: number
  pageCount?: number // Alternative name for pages
  wordCount?: number
  characterCount?: number // New property for character count
  language?: string
  extractionError?: boolean // Flag for failed text extraction
  errorMessage?: string // Error message for failed extractions
  encoding?: string // File encoding
  format?: string // File format (pdf, doc, etc.)
  pagesExtracted?: number // Number of pages successfully extracted
  unsupportedType?: boolean // Flag for unsupported file types
  // Image-specific metadata for OCR
  imageWidth?: number // Image width in pixels
  imageHeight?: number // Image height in pixels
  imageFormat?: string // Image format (jpeg, png, etc.)
  imageChannels?: number // Number of color channels
  imageDensity?: number // Image density (DPI)
  ocrLanguage?: string // OCR language used
  ocrEngine?: string // OCR engine used (tesseract, etc.)
}

export interface SearchQuery {
  term: string
  filters?: SearchFilters
  pagination?: Pagination
  sortBy?: SortOptions
}

export interface SearchFilters {
  fileTypes?: string[]
  dateRange?: DateRange
  sizeRange?: SizeRange
  author?: string
}

export interface DateRange {
  from?: Date
  to?: Date
}

export interface SizeRange {
  min?: number
  max?: number
}

export interface Pagination {
  page: number
  limit: number
}

export interface SortOptions {
  field: 'uploadedAt' | 'size' | 'originalName' | 'relevance'
  direction: 'asc' | 'desc'
}

export interface SearchResult {
  files: FileSearchResult[]
  totalCount: number
  page: number
  totalPages: number
}

export interface FileSearchResult {
  file: FileEntity
  score: number
  highlights: TextHighlight[]
}

export interface TextHighlight {
  text: string
  startIndex: number
  endIndex: number
}

export interface UploadRequest {
  filename: string
  originalName: string
  mimetype: string
  size: number
  path: string
}

export interface UploadResult {
  success: boolean
  file?: FileEntity
  error?: string
}

export interface TextExtractionResult {
  text: string
  metadata: FileMetadata
}
