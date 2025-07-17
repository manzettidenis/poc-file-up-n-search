import { ITextExtractionService } from '../../domain/services/ITextExtractionService.js';
import { TextExtractionResult } from '../../types/index.js';
export declare class TextExtractionService implements ITextExtractionService {
    extractText(filePath: string, mimetype: string): Promise<TextExtractionResult>;
    supportedMimeTypes(): string[];
    canExtract(mimetype: string): boolean;
    extractTextWithOCR(filePath: string, mimetype: string, language?: string): Promise<TextExtractionResult>;
    getAvailableOCRLanguages(): string[];
    canExtractWithLanguage(mimetype: string, language: string): boolean;
    private extractFromText;
    private extractFromPdf;
    private extractFromImage;
    private extractFromImageWithConfig;
    invalidateCache(filePath: string, mimetype: string): Promise<void>;
    getStats(): {
        supportedTypes: string[];
        cacheEnabled: boolean;
    };
    private getExtractionType;
}
