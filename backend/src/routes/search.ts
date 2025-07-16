import { Router, Request, Response } from 'express'
import RepositoryContainer from '../infrastructure/repositories/RepositoryContainer.js'
import { SearchFilesUseCase } from '../application/use-cases/index.js'
import { InputSanitizer } from '../utils/inputSanitization.js'

const router = Router()
const repositoryContainer = RepositoryContainer.getInstance()
const fileRepository = repositoryContainer.fileRepository

// Initialize use case
const searchFilesUseCase = new SearchFilesUseCase(fileRepository)

router.get('/', async (req: Request, res: Response) => {
  try {
    const rawTerm = req.query.q as string
    const rawPage = req.query.page as string
    const rawLimit = req.query.limit as string

    // Sanitize and validate inputs
    const term = InputSanitizer.sanitizeSearchQuery(rawTerm)
    const { page, limit } = InputSanitizer.sanitizePagination(rawPage, rawLimit)

    if (!term || term.length === 0) {
      return res.json({
        success: true,
        data: {
          files: [],
          totalCount: 0,
          page,
          totalPages: 0,
        },
      })
    }

    // Additional validation for search term length
    if (term.length > 500) {
      return res.status(400).json({
        success: false,
        error: 'Search query too long (maximum 500 characters)',
      })
    }

    // Use the use case to handle business logic
    const result = await searchFilesUseCase.execute({
      term: term,
      pagination: { page, limit },
    })

    // Sanitize response data to prevent XSS
    const sanitizedResult = {
      ...result,
      files: result.files.map(fileResult => ({
        ...fileResult,
        file: {
          ...fileResult.file,
          originalName: InputSanitizer.sanitizeFilename(fileResult.file.originalName),
          metadata: InputSanitizer.sanitizeFileMetadata(fileResult.file.metadata),
        },
      })),
    }

    res.json({
      success: true,
      data: sanitizedResult,
    })
  } catch (error) {
    console.error('Search route error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to search files',
    })
  }
})

export default router
