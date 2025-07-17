import fs from 'fs/promises';
import path from 'path';
import extract from 'pdf-text-extract';
import tesseract from 'node-tesseract-ocr';
import sharp from 'sharp';
import { TextExtractionCache } from '../../utils/cache.js';
import { logger, PerformanceLogger, logError, ErrorCategory } from '../../utils/logger.js';
import { MetricsCollector } from '../../utils/metrics.js';
const OCR_CONFIG = {
    lang: 'eng',
    oem: 1,
    psm: 3,
};
const AVAILABLE_OCR_LANGUAGES = [
    'eng',
    'spa',
    'fra',
    'deu',
    'ita',
    'por',
    'rus',
    'jpn',
    'chi_sim',
    'chi_tra',
    'ara',
    'hin',
];
export class TextExtractionService {
    async extractText(filePath, mimetype) {
        const stopTimer = PerformanceLogger.startTimer('text_extraction');
        const start = Date.now();
        try {
            const result = await TextExtractionCache.getOrSet(filePath, mimetype, async () => {
                logger.info('Extracting text from file', {
                    filePath: path.basename(filePath),
                    mimetype,
                    category: 'text-extraction',
                });
                switch (mimetype) {
                    case 'text/plain':
                        return this.extractFromText(filePath);
                    case 'application/pdf':
                        return this.extractFromPdf(filePath);
                    case 'image/jpeg':
                    case 'image/jpg':
                    case 'image/png':
                    case 'image/tiff':
                    case 'image/tif':
                    case 'image/bmp':
                    case 'image/webp':
                        return this.extractFromImage(filePath, mimetype);
                    default:
                        return { text: '', metadata: { unsupportedType: true } };
                }
            }, 7200);
            const duration = Date.now() - start;
            MetricsCollector.recordTextExtraction('success', mimetype, duration, this.getExtractionType(mimetype));
            stopTimer();
            return result;
        }
        catch (error) {
            const duration = Date.now() - start;
            MetricsCollector.recordTextExtraction('failure', mimetype, duration, this.getExtractionType(mimetype));
            stopTimer();
            logError(error instanceof Error ? error : new Error('Text extraction failed'), ErrorCategory.TEXT_EXTRACTION, {
                filePath,
                mimetype,
            });
            throw error;
        }
    }
    supportedMimeTypes() {
        return [
            'text/plain',
            'application/pdf',
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/tiff',
            'image/tif',
            'image/bmp',
            'image/webp',
        ];
    }
    canExtract(mimetype) {
        return this.supportedMimeTypes().includes(mimetype);
    }
    async extractTextWithOCR(filePath, mimetype, language) {
        const ocrLanguage = language && AVAILABLE_OCR_LANGUAGES.includes(language) ? language : 'eng';
        const customConfig = { ...OCR_CONFIG, lang: ocrLanguage };
        return this.extractFromImageWithConfig(filePath, mimetype, customConfig);
    }
    getAvailableOCRLanguages() {
        return AVAILABLE_OCR_LANGUAGES;
    }
    canExtractWithLanguage(mimetype, language) {
        return this.canExtract(mimetype) && AVAILABLE_OCR_LANGUAGES.includes(language);
    }
    async extractFromText(filePath) {
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            logger.debug('Text file extracted', {
                filePath: path.basename(filePath),
                contentLength: content.length,
                category: 'text-extraction',
            });
            return {
                text: content,
                metadata: {
                    wordCount: content.split(/\s+/).length,
                    characterCount: content.length,
                    encoding: 'utf-8',
                },
            };
        }
        catch (error) {
            logger.error('Error extracting text from file', {
                filePath: path.basename(filePath),
                error: error instanceof Error ? error.message : 'Unknown error',
                category: 'text-extraction',
            });
            return { text: '', metadata: { extractionError: true } };
        }
    }
    async extractFromPdf(filePath) {
        return new Promise(resolve => {
            logger.debug('Extracting text from PDF', {
                filePath: path.basename(filePath),
                category: 'text-extraction',
            });
            extract(filePath, { layout: 'preserve' }, (err, pages) => {
                if (err) {
                    logger.error('Error extracting text from PDF', {
                        filePath: path.basename(filePath),
                        error: err.message || 'Unknown error',
                        category: 'text-extraction',
                    });
                    resolve({
                        text: `[PDF content from ${path.basename(filePath)} - extraction failed]`,
                        metadata: {
                            title: path.basename(filePath, '.pdf'),
                            extractionError: true,
                            errorMessage: err.message,
                        },
                    });
                    return;
                }
                const text = pages.join('\n\n');
                const wordCount = text.split(/\s+/).filter((word) => word.length > 0).length;
                logger.debug('PDF text extracted successfully', {
                    filePath: path.basename(filePath),
                    extractedLength: text.length,
                    pageCount: pages.length,
                    wordCount,
                    category: 'text-extraction',
                });
                resolve({
                    text: text.trim(),
                    metadata: {
                        title: path.basename(filePath, '.pdf'),
                        pageCount: pages.length,
                        wordCount,
                        characterCount: text.length,
                        pagesExtracted: pages.length,
                        format: 'pdf',
                    },
                });
            });
        });
    }
    async extractFromImage(filePath, mimetype) {
        return this.extractFromImageWithConfig(filePath, mimetype, OCR_CONFIG);
    }
    async extractFromImageWithConfig(filePath, mimetype, config) {
        const startTime = Date.now();
        try {
            logger.debug('Extracting text from image using OCR with custom config', {
                filePath: path.basename(filePath),
                mimetype,
                language: config.lang,
                category: 'text-extraction',
            });
            const imageBuffer = await fs.readFile(filePath);
            const image = sharp(imageBuffer);
            const imageMetadata = await image.metadata();
            const preprocessStart = Date.now();
            const preprocessedBuffer = await image
                .greyscale()
                .sharpen()
                .normalize()
                .png()
                .toBuffer();
            const preprocessDuration = Date.now() - preprocessStart;
            MetricsCollector.recordImageProcessing(preprocessDuration);
            const ocrStart = Date.now();
            const ocrText = await tesseract.recognize(preprocessedBuffer, config);
            const ocrDuration = Date.now() - ocrStart;
            const wordCount = ocrText.split(/\s+/).filter((word) => word.length > 0).length;
            const characterCount = ocrText.length;
            MetricsCollector.recordOCRProcessing('success', config.lang, imageMetadata.format || 'unknown', ocrDuration, characterCount, wordCount);
            const metadata = {
                title: path.basename(filePath, path.extname(filePath)),
                wordCount,
                characterCount,
                format: 'image',
                encoding: 'utf-8',
                imageWidth: imageMetadata.width,
                imageHeight: imageMetadata.height,
                imageFormat: imageMetadata.format,
                imageChannels: imageMetadata.channels,
                imageDensity: imageMetadata.density,
                ocrLanguage: config.lang,
                ocrEngine: 'tesseract',
            };
            logger.debug('Image OCR completed successfully', {
                filePath: path.basename(filePath),
                extractedLength: ocrText.length,
                wordCount,
                language: config.lang,
                imageWidth: imageMetadata.width,
                imageHeight: imageMetadata.height,
                preprocessDuration: `${preprocessDuration}ms`,
                ocrDuration: `${ocrDuration}ms`,
                category: 'text-extraction',
            });
            return {
                text: ocrText.trim(),
                metadata,
            };
        }
        catch (error) {
            const totalDuration = Date.now() - startTime;
            MetricsCollector.recordOCRProcessing('failure', config.lang, mimetype.split('/')[1] || 'unknown', totalDuration);
            logger.error('Error extracting text from image with OCR', {
                filePath: path.basename(filePath),
                mimetype,
                language: config.lang,
                error: error instanceof Error ? error.message : 'Unknown error',
                category: 'text-extraction',
            });
            return {
                text: '',
                metadata: {
                    extractionError: true,
                    errorMessage: error instanceof Error ? error.message : 'Unknown OCR error',
                    format: 'image',
                    ocrLanguage: config.lang,
                },
            };
        }
    }
    async invalidateCache(filePath, mimetype) {
        TextExtractionCache.invalidate(filePath, mimetype);
        logger.info('Text extraction cache invalidated', {
            filePath: path.basename(filePath),
            mimetype,
            category: 'cache',
        });
    }
    getStats() {
        return {
            supportedTypes: this.supportedMimeTypes(),
            cacheEnabled: true,
        };
    }
    getExtractionType(mimetype) {
        if (mimetype.startsWith('image/')) {
            return 'ocr';
        }
        else if (mimetype === 'application/pdf') {
            return 'pdf';
        }
        else if (mimetype === 'text/plain') {
            return 'text';
        }
        return 'unknown';
    }
}
