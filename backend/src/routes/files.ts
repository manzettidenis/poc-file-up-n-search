import { Router, Request, Response } from 'express'
import RepositoryContainer from '../infrastructure/repositories/RepositoryContainer.js'
import { GetFilesUseCase, DeleteFileUseCase } from '../application/use-cases/index.js'
import { InputSanitizer } from '../utils/inputSanitization.js'

const router = Router()
const repositoryContainer = RepositoryContainer.getInstance()
const fileRepository = repositoryContainer.fileRepository

// Initialize use cases
const getFilesUseCase = new GetFilesUseCase(fileRepository)
const deleteFileUseCase = new DeleteFileUseCase(fileRepository)

router.get('/', async (req: Request, res: Response) => {
  try {
    const rawPage = req.query.page as string
    const rawLimit = req.query.limit as string

    // Sanitize and validate pagination parameters
    const { page, limit } = InputSanitizer.sanitizePagination(rawPage, rawLimit)
    const offset = (page - 1) * limit

    // Use the use case to handle business logic
    const result = await getFilesUseCase.execute({ limit, offset })

    console.log('Files retrieved:', result.files.length, 'Total count:', result.totalCount)

    // Sanitize file data for response
    const sanitizedFiles = result.files.map(f => {
      const fileJson = f.toJSON()
      return {
        ...fileJson,
        originalName: InputSanitizer.sanitizeFilename(fileJson.originalName),
        metadata: InputSanitizer.sanitizeFileMetadata(fileJson.metadata),
      }
    })

    res.json({
      success: true,
      data: {
        files: sanitizedFiles,
        totalCount: result.totalCount,
        page,
        totalPages: Math.ceil(result.totalCount / limit),
        hasMore: result.hasMore,
      },
    })
  } catch (error) {
    console.error('Files list error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve files',
    })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const fileId = req.params.id

    // Validate UUID format
    if (!fileId || !InputSanitizer.validateUUID(fileId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file ID format',
      })
    }

    const file = await fileRepository.findById(fileId)

    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found',
      })
    }

    // Sanitize file data for response
    const fileJson = file.toJSON()
    const sanitizedFile = {
      ...fileJson,
      originalName: InputSanitizer.sanitizeFilename(fileJson.originalName),
      metadata: InputSanitizer.sanitizeFileMetadata(fileJson.metadata),
    }

    res.json({
      success: true,
      data: sanitizedFile,
    })
  } catch (error) {
    console.error('Get file error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve file',
    })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const fileId = req.params.id

    // Validate UUID format
    if (!fileId || !InputSanitizer.validateUUID(fileId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file ID format',
      })
    }

    // Use the use case to handle business logic
    const result = await deleteFileUseCase.execute({ fileId })

    if (result.success) {
      res.json({
        success: true,
        message: 'File deleted successfully',
      })
    } else {
      const statusCode = result.error === 'File not found' ? 404 : 400
      res.status(statusCode).json({
        success: false,
        error: result.error || 'Failed to delete file',
      })
    }
  } catch (error) {
    console.error('Delete file error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to delete file',
    })
  }
})

export default router
