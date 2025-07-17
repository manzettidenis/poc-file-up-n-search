interface FileValidationResult {
    isValid: boolean;
    error?: string;
    sanitizedName?: string;
}
export declare class FileValidator {
    static validateExtension(filename: string): boolean;
    static validateMimeType(mimetype: string): boolean;
    static validateMagicBytes(filePath: string, expectedMimeType: string): Promise<boolean>;
    static validateTextFile(filePath: string): Promise<boolean>;
    static sanitizeFilename(filename: string): string;
    static validateFileSize(size: number, maxSize?: number): boolean;
    static validateFile(filePath: string, originalName: string, mimetype: string, size: number): Promise<FileValidationResult>;
}
export {};
