import { TextExtractionResult } from '../../types/index.js';
export interface ITextExtractionService {
    extractText(filePath: string, mimetype: string): Promise<TextExtractionResult>;
    supportedMimeTypes(): string[];
    canExtract(mimetype: string): boolean;
}
