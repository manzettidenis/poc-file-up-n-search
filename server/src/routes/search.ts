import { Router, Request, Response } from 'express'
import { Container } from '../infrastructure/di/Container.js'
import { FileMapper } from '../infrastructure/mappers/FileMapper.js'
import { logger, logError, ErrorCategory } from '../utils/logger.js'
import { MetricsCollector } from '../utils/metrics.js'

const router = Router()
const container = Container.getInstance()

router.get('/', async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 10

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required',
      })
    }

    logger.info('Search request', { query, page, limit, category: 'api' })

    const useCase = container.searchFilesUseCase
    const result = await useCase.execute({
      term: query,
      pagination: { page, limit },
    })

    // The repository already returns external format
    const searchResults = result

    return res.json({
      success: true,
      data: searchResults,
    })
  } catch (error) {
    logError(error instanceof Error ? error : new Error('Search failed'), ErrorCategory.SEARCH)
    MetricsCollector.recordError('api_error', 'search')

    return res.status(500).json({
      success: false,
      error: 'Search failed',
    })
  }
})

export default router
