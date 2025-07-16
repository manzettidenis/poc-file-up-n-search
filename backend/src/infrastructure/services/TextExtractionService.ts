import { ITextExtractionService } from '../../domain/services/ITextExtractionService.js'
import { TextExtractionResult } from '../../types/index.js'
import fs from 'fs/promises'
import path from 'path'
import extract from 'pdf-text-extract'
import tesseract from 'node-tesseract-ocr'
import sharp from 'sharp'
import { TextExtractionCache } from '../../utils/cache.js'
import { logger, PerformanceLogger, logError, ErrorCategory } from '../../utils/logger.js'
import { MetricsCollector } from '../../utils/metrics.js'

// OCR configuration options
const OCR_CONFIG = {
  lang: 'eng', // Default to English, can be extended to support multiple languages
  oem: 1, // OCR Engine Mode: 1 = LSTM neural network
  psm: 3, // Page Segmentation Mode: 3 = Fully automatic page segmentation
}

// Available OCR languages (commonly installed with tesseract)
const AVAILABLE_OCR_LANGUAGES = [
  'eng', // English
  'spa', // Spanish
  'fra', // French
  'deu', // German
  'ita', // Italian
  'por', // Portuguese
  'rus', // Russian
  'jpn', // Japanese
  'chi_sim', // Chinese Simplified
  'chi_tra', // Chinese Traditional
  'ara', // Arabic
  'hin', // Hindi
]

export class TextExtractionService implements ITextExtractionService {
  async extractText(filePath: string, mimetype: string): Promise<TextExtractionResult> {
    const stopTimer = PerformanceLogger.startTimer('text_extraction')
    const start = Date.now()

    try {
      // Check cache first
      const result = await TextExtractionCache.getOrSet(
        filePath,
        mimetype,
        async () => {
          logger.info('Extracting text from file', {
            filePath: path.basename(filePath),
            mimetype,
            category: 'text-extraction',
          })

          switch (mimetype) {
            case 'text/plain':
              return this.extractFromText(filePath)
            case 'application/pdf':
              return this.extractFromPdf(filePath)
            // Image types that support OCR
            case 'image/jpeg':
            case 'image/jpg':
            case 'image/png':
            case 'image/tiff':
            case 'image/tif':
            case 'image/bmp':
            case 'image/webp':
              return this.extractFromImage(filePath, mimetype)
            default:
              return { text: '', metadata: { unsupportedType: true } }
          }
        },
        7200, // Cache for 2 hours
      )

      const duration = Date.now() - start
      MetricsCollector.recordTextExtraction('success', mimetype, duration, this.getExtractionType(mimetype))
      stopTimer()

      return result
    } catch (error) {
      const duration = Date.now() - start
      MetricsCollector.recordTextExtraction('failure', mimetype, duration, this.getExtractionType(mimetype))
      stopTimer()

      logError(error instanceof Error ? error : new Error('Text extraction failed'), ErrorCategory.TEXT_EXTRACTION, {
        filePath,
        mimetype,
      })

      throw error
    }
  }

  supportedMimeTypes(): string[] {
    return [
      'text/plain',
      'application/pdf',
      // Image types with OCR support
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/tiff',
      'image/tif',
      'image/bmp',
      'image/webp',
    ]
  }

  canExtract(mimetype: string): boolean {
    return this.supportedMimeTypes().includes(mimetype)
  }

  // Enhanced OCR with language detection
  async extractTextWithOCR(filePath: string, mimetype: string, language?: string): Promise<TextExtractionResult> {
    const ocrLanguage = language && AVAILABLE_OCR_LANGUAGES.includes(language) ? language : 'eng'
    const customConfig = { ...OCR_CONFIG, lang: ocrLanguage }

    return this.extractFromImageWithConfig(filePath, mimetype, customConfig)
  }

  // Get available OCR languages
  getAvailableOCRLanguages(): string[] {
    return AVAILABLE_OCR_LANGUAGES
  }

  // Enhanced method to check if OCR is available for a specific language
  canExtractWithLanguage(mimetype: string, language: string): boolean {
    return this.canExtract(mimetype) && AVAILABLE_OCR_LANGUAGES.includes(language)
  }

  private async extractFromText(filePath: string): Promise<TextExtractionResult> {
    try {
      const content = await fs.readFile(filePath, 'utf-8')

      logger.debug('Text file extracted', {
        filePath: path.basename(filePath),
        contentLength: content.length,
        category: 'text-extraction',
      })

      return {
        text: content,
        metadata: {
          wordCount: content.split(/\s+/).length,
          characterCount: content.length,
          encoding: 'utf-8',
        },
      }
    } catch (error) {
      logger.error('Error extracting text from file', {
        filePath: path.basename(filePath),
        error: error instanceof Error ? error.message : 'Unknown error',
        category: 'text-extraction',
      })
      return { text: '', metadata: { extractionError: true } }
    }
  }

  private async extractFromPdf(filePath: string): Promise<TextExtractionResult> {
    return new Promise(resolve => {
      logger.debug('Extracting text from PDF', {
        filePath: path.basename(filePath),
        category: 'text-extraction',
      })

      extract(filePath, { layout: 'preserve' }, (err: any, pages: string[]) => {
        if (err) {
          logger.error('Error extracting text from PDF', {
            filePath: path.basename(filePath),
            error: err.message || 'Unknown error',
            category: 'text-extraction',
          })

          resolve({
            text: `[PDF content from ${path.basename(filePath)} - extraction failed]`,
            metadata: {
              title: path.basename(filePath, '.pdf'),
              extractionError: true,
              errorMessage: err.message,
            },
          })
          return
        }

        const text = pages.join('\n\n')
        const wordCount = text.split(/\s+/).filter((word: string) => word.length > 0).length

        logger.debug('PDF text extracted successfully', {
          filePath: path.basename(filePath),
          extractedLength: text.length,
          pageCount: pages.length,
          wordCount,
          category: 'text-extraction',
        })

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
        })
      })
    })
  }

  private async extractFromImage(filePath: string, mimetype: string): Promise<TextExtractionResult> {
    return this.extractFromImageWithConfig(filePath, mimetype, OCR_CONFIG)
  }

  private async extractFromImageWithConfig(
    filePath: string,
    mimetype: string,
    config: typeof OCR_CONFIG,
  ): Promise<TextExtractionResult> {
    const startTime = Date.now()

    try {
      logger.debug('Extracting text from image using OCR with custom config', {
        filePath: path.basename(filePath),
        mimetype,
        language: config.lang,
        category: 'text-extraction',
      })

      // Get image metadata first
      const imageBuffer = await fs.readFile(filePath)
      const image = sharp(imageBuffer)
      const imageMetadata = await image.metadata()

      // Preprocess image for better OCR results
      const preprocessStart = Date.now()
      const preprocessedBuffer = await image
        .greyscale() // Convert to grayscale for better OCR
        .sharpen() // Enhance edges
        .normalize() // Improve contrast
        .png() // Convert to PNG for consistent processing
        .toBuffer()

      const preprocessDuration = Date.now() - preprocessStart
      MetricsCollector.recordImageProcessing(preprocessDuration)

      // Perform OCR using tesseract with custom config
      const ocrStart = Date.now()
      const ocrText = await tesseract.recognize(preprocessedBuffer, config)
      const ocrDuration = Date.now() - ocrStart

      const wordCount = ocrText.split(/\s+/).filter((word: string) => word.length > 0).length
      const characterCount = ocrText.length

      // Record OCR metrics
      MetricsCollector.recordOCRProcessing(
        'success',
        config.lang,
        imageMetadata.format || 'unknown',
        ocrDuration,
        characterCount,
        wordCount,
      )

      const metadata: TextExtractionResult['metadata'] = {
        title: path.basename(filePath, path.extname(filePath)),
        wordCount,
        characterCount,
        format: 'image',
        encoding: 'utf-8',
        // Image-specific metadata
        imageWidth: imageMetadata.width,
        imageHeight: imageMetadata.height,
        imageFormat: imageMetadata.format,
        imageChannels: imageMetadata.channels,
        imageDensity: imageMetadata.density,
        ocrLanguage: config.lang,
        ocrEngine: 'tesseract',
      }

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
      })

      return {
        text: ocrText.trim(),
        metadata,
      }
    } catch (error) {
      const totalDuration = Date.now() - startTime

      // Record failed OCR metrics
      MetricsCollector.recordOCRProcessing('failure', config.lang, mimetype.split('/')[1] || 'unknown', totalDuration)

      logger.error('Error extracting text from image with OCR', {
        filePath: path.basename(filePath),
        mimetype,
        language: config.lang,
        error: error instanceof Error ? error.message : 'Unknown error',
        category: 'text-extraction',
      })

      // Return empty result with error flag
      return {
        text: '',
        metadata: {
          extractionError: true,
          errorMessage: error instanceof Error ? error.message : 'Unknown OCR error',
          format: 'image',
          ocrLanguage: config.lang,
        },
      }
    }
  }

  // Invalidate cache for a specific file
  async invalidateCache(filePath: string, mimetype: string): Promise<void> {
    TextExtractionCache.invalidate(filePath, mimetype)
    logger.info('Text extraction cache invalidated', {
      filePath: path.basename(filePath),
      mimetype,
      category: 'cache',
    })
  }

  // Get extraction statistics
  getStats(): {
    supportedTypes: string[]
    cacheEnabled: boolean
  } {
    return {
      supportedTypes: this.supportedMimeTypes(),
      cacheEnabled: true,
    }
  }

  private getExtractionType(mimetype: string): string {
    if (mimetype.startsWith('image/')) {
      return 'ocr'
    } else if (mimetype === 'application/pdf') {
      return 'pdf'
    } else if (mimetype === 'text/plain') {
      return 'text'
    }
    return 'unknown'
  }
}
