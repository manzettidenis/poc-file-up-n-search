import { IFileRepository } from '../../domain/repositories/IFileRepository.js'
import { SearchQuery, SearchResult } from '../../types/index.js'

export class SearchFilesUseCase {
  constructor(private fileRepository: IFileRepository) {}

  async execute(query: SearchQuery): Promise<SearchResult> {
    try {
      // Validate search term
      if (!query.term || query.term.trim().length === 0) {
        return {
          files: [],
          totalCount: 0,
          page: query.pagination?.page || 1,
          totalPages: 0,
        }
      }

      // Delegate to repository for actual search
      const result = await this.fileRepository.search(query)

      console.log(`SearchFilesUseCase: Found ${result.totalCount} results for "${query.term}"`)

      return result
    } catch (error) {
      console.error('SearchFilesUseCase error:', error)
      return {
        files: [],
        totalCount: 0,
        page: query.pagination?.page || 1,
        totalPages: 0,
      }
    }
  }
}
