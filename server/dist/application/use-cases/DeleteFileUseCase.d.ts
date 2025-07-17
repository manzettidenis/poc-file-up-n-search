import { IFileRepository } from '../../domain/repositories/IFileRepository.js';
export interface DeleteFileRequest {
    fileId: string;
}
export interface DeleteFileResponse {
    success: boolean;
    error?: string;
}
export declare class DeleteFileUseCase {
    private fileRepository;
    constructor(fileRepository: IFileRepository);
    execute(request: DeleteFileRequest): Promise<DeleteFileResponse>;
}
