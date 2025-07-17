import { File } from '../entities/File.js';
import { ITextExtractionService } from './ITextExtractionService.js';
export declare class FileService {
    private textExtractionService;
    constructor(textExtractionService: ITextExtractionService);
    processFileText(file: File): Promise<File>;
    validateFileForUpload(file: File): {
        isValid: boolean;
        errors: string[];
    };
    private isExtensionValidForMimeType;
    canBeSearched(file: File): boolean;
    getFileCategory(file: File): 'text' | 'image' | 'document' | 'other';
}
