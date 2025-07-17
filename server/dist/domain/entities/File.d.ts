export interface DomainFileMetadata {
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
export interface DomainFileData {
    id: string;
    filename: string;
    originalName: string;
    mimetype: string;
    size: number;
    path: string;
    extractedText: string;
    metadata: DomainFileMetadata;
    uploadedAt: Date;
    lastModified: Date;
}
export declare class FileSize {
    private readonly bytes;
    constructor(bytes: number);
    get value(): number;
    toMB(): number;
    isLarge(): boolean;
}
export declare class FileIdentifier {
    private readonly id;
    constructor(id: string);
    get value(): string;
    equals(other: FileIdentifier): boolean;
}
export declare class File {
    private readonly _id;
    readonly filename: string;
    readonly originalName: string;
    readonly mimetype: string;
    private readonly _size;
    readonly path: string;
    private _extractedText;
    private _metadata;
    readonly uploadedAt: Date;
    private _lastModified;
    constructor(_id: FileIdentifier, filename: string, originalName: string, mimetype: string, _size: FileSize, path: string, _extractedText: string, _metadata: DomainFileMetadata, uploadedAt: Date, _lastModified: Date);
    static create(data: {
        filename: string;
        originalName: string;
        mimetype: string;
        size: number;
        path: string;
        extractedText: string;
        metadata: DomainFileMetadata;
    }): File;
    get id(): FileIdentifier;
    get size(): FileSize;
    get extractedText(): string;
    get metadata(): DomainFileMetadata;
    get lastModified(): Date;
    updateExtractedText(text: string): void;
    updateMetadata(metadata: Partial<DomainFileMetadata>): void;
    isTextFile(): boolean;
    isPdf(): boolean;
    isImage(): boolean;
    isDocument(): boolean;
    getFileExtension(): string;
    isSearchable(): boolean;
    getDisplayName(): string;
    hasError(): boolean;
    getErrorMessage(): string | null;
    private validateInvariants;
    toData(): DomainFileData;
    static fromData(data: DomainFileData): File;
}
