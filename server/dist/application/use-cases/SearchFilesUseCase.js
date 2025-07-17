export class SearchFilesUseCase {
    fileRepository;
    constructor(fileRepository) {
        this.fileRepository = fileRepository;
    }
    async execute(query) {
        try {
            if (!query.term || query.term.trim().length === 0) {
                return {
                    files: [],
                    totalCount: 0,
                    page: query.pagination?.page || 1,
                    totalPages: 0,
                };
            }
            const result = await this.fileRepository.search(query);
            console.log(`SearchFilesUseCase: Found ${result.totalCount} results for "${query.term}"`);
            return result;
        }
        catch (error) {
            console.error('SearchFilesUseCase error:', error);
            return {
                files: [],
                totalCount: 0,
                page: query.pagination?.page || 1,
                totalPages: 0,
            };
        }
    }
}
