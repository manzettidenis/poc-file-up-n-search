export class GetFilesUseCase {
    fileRepository;
    constructor(fileRepository) {
        this.fileRepository = fileRepository;
    }
    async execute(request = {}) {
        try {
            const limit = Math.min(request.limit || 50, 100);
            const offset = Math.max(request.offset || 0, 0);
            const [files, totalCount] = await Promise.all([
                this.fileRepository.findAll(limit, offset),
                this.fileRepository.count(),
            ]);
            const hasMore = offset + files.length < totalCount;
            console.log(`GetFilesUseCase: Retrieved ${files.length} files (total: ${totalCount})`);
            return {
                files,
                totalCount,
                hasMore,
            };
        }
        catch (error) {
            console.error('GetFilesUseCase error:', error);
            return {
                files: [],
                totalCount: 0,
                hasMore: false,
            };
        }
    }
}
