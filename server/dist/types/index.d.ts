export interface FileEntity {
    id: string;
    filename: string;
    originalName: string;
    mimetype: string;
    size: number;
    path: string;
    extractedText: string;
    metadata: FileMetadata;
    uploadedAt: Date;
    lastModified: Date;
}
export interface FileMetadata {
    author?: string;
    title?: string;
    subject?: string;
    keywords?: string[];
    pages?: number;
    pageCount?: number;
    wordCount?: number;
    characterCount?: number;
    language?: string;
    extractionError?: boolean;
    errorMessage?: string;
    encoding?: string;
    format?: string;
    pagesExtracted?: number;
    unsupportedType?: boolean;
    imageWidth?: number;
    imageHeight?: number;
    imageFormat?: string;
    imageChannels?: number;
    imageDensity?: number;
    ocrLanguage?: string;
    ocrEngine?: string;
}
export interface SearchQuery {
    term: string;
    filters?: SearchFilters;
    pagination?: Pagination;
    sortBy?: SortOptions;
}
export interface SearchFilters {
    fileTypes?: string[];
    dateRange?: DateRange;
    sizeRange?: SizeRange;
    author?: string;
}
export interface DateRange {
    from?: Date;
    to?: Date;
}
export interface SizeRange {
    min?: number;
    max?: number;
}
export interface Pagination {
    page: number;
    limit: number;
}
export interface SortOptions {
    field: 'uploadedAt' | 'size' | 'originalName' | 'relevance';
    direction: 'asc' | 'desc';
}
export interface SearchResult {
    files: FileSearchResult[];
    totalCount: number;
    page: number;
    totalPages: number;
}
export interface FileSearchResult {
    file: FileEntity;
    score: number;
    highlights: TextHighlight[];
}
export interface TextHighlight {
    text: string;
    startIndex: number;
    endIndex: number;
}
export interface UploadRequest {
    filename: string;
    originalName: string;
    mimetype: string;
    size: number;
    path: string;
}
export interface UploadResult {
    success: boolean;
    file?: FileEntity;
    error?: string;
}
export interface TextExtractionResult {
    text: string;
    metadata: FileMetadata;
}
