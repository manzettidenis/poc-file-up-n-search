import { IFileRepository } from '../../domain/repositories/IFileRepository.js';
import { File } from '../../domain/entities/File.js';
export interface GetFilesRequest {
    limit?: number;
    offset?: number;
}
export interface GetFilesResponse {
    files: File[];
    totalCount: number;
    hasMore: boolean;
}
export declare class GetFilesUseCase {
    private fileRepository;
    constructor(fileRepository: IFileRepository);
    execute(request?: GetFilesRequest): Promise<GetFilesResponse>;
}
