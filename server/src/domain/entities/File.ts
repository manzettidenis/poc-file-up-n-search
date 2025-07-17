import { randomUUID } from 'crypto'

// Remove external type dependency and define our own domain contracts
export interface DomainFileMetadata {
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
  // Image-specific metadata for OCR
  imageWidth?: number
  imageHeight?: number
  imageFormat?: string
  imageChannels?: number
  imageDensity?: number
  ocrLanguage?: string
  ocrEngine?: string
}

export interface DomainFileData {
  id: string
  filename: string
  originalName: string
  mimetype: string
  size: number
  path: string
  extractedText: string
  metadata: DomainFileMetadata
  uploadedAt: Date
  lastModified: Date
}

// Value Objects for better domain modeling
export class FileSize {
  constructor(private readonly bytes: number) {
    if (bytes < 0) {
      throw new Error('File size cannot be negative')
    }
  }

  get value(): number {
    return this.bytes
  }

  toMB(): number {
    return Math.round((this.bytes / 1024 / 1024) * 100) / 100
  }

  isLarge(): boolean {
    return this.bytes > 10 * 1024 * 1024 // 10MB
  }
}

export class FileIdentifier {
  constructor(private readonly id: string) {
    if (!id || id.trim().length === 0) {
      throw new Error('File identifier cannot be empty')
    }
  }

  get value(): string {
    return this.id
  }

  equals(other: FileIdentifier): boolean {
    return this.id === other.value
  }
}

export class File {
  constructor(
    private readonly _id: FileIdentifier,
    public readonly filename: string,
    public readonly originalName: string,
    public readonly mimetype: string,
    private readonly _size: FileSize,
    public readonly path: string,
    private _extractedText: string,
    private _metadata: DomainFileMetadata,
    public readonly uploadedAt: Date,
    private _lastModified: Date,
  ) {
    this.validateInvariants()
  }

  // Factory method with domain validation
  static create(data: {
    filename: string
    originalName: string
    mimetype: string
    size: number
    path: string
    extractedText: string
    metadata: DomainFileMetadata
  }): File {
    const now = new Date()
    return new File(
      new FileIdentifier(randomUUID()),
      data.filename,
      data.originalName,
      data.mimetype,
      new FileSize(data.size),
      data.path,
      data.extractedText,
      data.metadata,
      now,
      now,
    )
  }

  // Getters for encapsulated fields
  get id(): FileIdentifier {
    return this._id
  }

  get size(): FileSize {
    return this._size
  }

  get extractedText(): string {
    return this._extractedText
  }

  get metadata(): DomainFileMetadata {
    return { ...this._metadata } // Return copy to prevent mutations
  }

  get lastModified(): Date {
    return this._lastModified
  }

  // Domain business methods
  updateExtractedText(text: string): void {
    if (text === null || text === undefined) {
      throw new Error('Extracted text cannot be null or undefined')
    }

    this._extractedText = text
    this._lastModified = new Date()
  }

  updateMetadata(metadata: Partial<DomainFileMetadata>): void {
    this._metadata = { ...this._metadata, ...metadata }
    this._lastModified = new Date()
  }

  // Business logic methods
  isTextFile(): boolean {
    return this.mimetype.startsWith('text/')
  }

  isPdf(): boolean {
    return this.mimetype === 'application/pdf'
  }

  isImage(): boolean {
    return this.mimetype.startsWith('image/')
  }

  isDocument(): boolean {
    const docTypes = [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ]
    return docTypes.includes(this.mimetype)
  }

  getFileExtension(): string {
    return this.originalName.split('.').pop()?.toLowerCase() || ''
  }

  isSearchable(): boolean {
    return this._extractedText.length > 0 && !this._metadata.extractionError
  }

  getDisplayName(): string {
    return this.originalName || this.filename
  }

  hasError(): boolean {
    return !!this._metadata.extractionError
  }

  getErrorMessage(): string | null {
    return this._metadata.errorMessage || null
  }

  // Domain validation
  private validateInvariants(): void {
    if (!this.filename || this.filename.trim().length === 0) {
      throw new Error('Filename cannot be empty')
    }

    if (!this.originalName || this.originalName.trim().length === 0) {
      throw new Error('Original name cannot be empty')
    }

    if (!this.mimetype || this.mimetype.trim().length === 0) {
      throw new Error('MIME type cannot be empty')
    }

    if (!this.path || this.path.trim().length === 0) {
      throw new Error('File path cannot be empty')
    }
  }

  // Mapping to external format (for infrastructure)
  toData(): DomainFileData {
    return {
      id: this._id.value,
      filename: this.filename,
      originalName: this.originalName,
      mimetype: this.mimetype,
      size: this._size.value,
      path: this.path,
      extractedText: this._extractedText,
      metadata: this._metadata,
      uploadedAt: this.uploadedAt,
      lastModified: this._lastModified,
    }
  }

  // Factory method from external data
  static fromData(data: DomainFileData): File {
    return new File(
      new FileIdentifier(data.id),
      data.filename,
      data.originalName,
      data.mimetype,
      new FileSize(data.size),
      data.path,
      data.extractedText,
      data.metadata,
      data.uploadedAt,
      data.lastModified,
    )
  }
}
