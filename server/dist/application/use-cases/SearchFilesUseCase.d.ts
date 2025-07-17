import { IFileRepository } from '../../domain/repositories/IFileRepository.js';
import { SearchQuery, SearchResult } from '../../types/index.js';
export declare class SearchFilesUseCase {
    private fileRepository;
    constructor(fileRepository: IFileRepository);
    execute(query: SearchQuery): Promise<SearchResult>;
}
