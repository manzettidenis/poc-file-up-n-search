import { FileEntity, FileMetadata } from '../../types/index.js';

export class File implements FileEntity {
  constructor(
    public readonly id: string,
    public readonly filename: string,
    public readonly originalName: string,
    public readonly mimetype: string,
    public readonly size: number,
    public readonly path: string,
    public extractedText: string,
    public metadata: FileMetadata,
    public readonly uploadedAt: Date,
    public lastModified: Date
  ) {}

  static create(data: Omit<FileEntity, 'id' | 'uploadedAt' | 'lastModified'>): File {
    const now = new Date();
    return new File(
      crypto.randomUUID(),
      data.filename,
      data.originalName,
      data.mimetype,
      data.size,
      data.path,
      data.extractedText,
      data.metadata,
      now,
      now
    );
  }

  updateExtractedText(text: string): void {
    this.extractedText = text;
    this.lastModified = new Date();
  }

  updateMetadata(metadata: Partial<FileMetadata>): void {
    this.metadata = { ...this.metadata, ...metadata };
    this.lastModified = new Date();
  }

  isTextFile(): boolean {
    return this.mimetype.startsWith('text/');
  }

  isPdf(): boolean {
    return this.mimetype === 'application/pdf';
  }

  isImage(): boolean {
    return this.mimetype.startsWith('image/');
  }

  isDocument(): boolean {
    const docTypes = [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ];
    return docTypes.includes(this.mimetype);
  }

  getFileExtension(): string {
    return this.originalName.split('.').pop()?.toLowerCase() || '';
  }

  getSizeInMB(): number {
    return Math.round((this.size / 1024 / 1024) * 100) / 100;
  }

  isSearchable(): boolean {
    return this.extractedText.length > 0;
  }

  getDisplayName(): string {
    return this.originalName || this.filename;
  }

  toJSON(): FileEntity {
    return {
      id: this.id,
      filename: this.filename,
      originalName: this.originalName,
      mimetype: this.mimetype,
      size: this.size,
      path: this.path,
      extractedText: this.extractedText,
      metadata: this.metadata,
      uploadedAt: this.uploadedAt,
      lastModified: this.lastModified
    };
  }
} 