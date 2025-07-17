import { IFileRepository } from '../../domain/repositories/IFileRepository.js';
declare class RepositoryContainer {
    private static instance;
    private _fileRepository;
    private constructor();
    static getInstance(): RepositoryContainer;
    get fileRepository(): IFileRepository;
}
export default RepositoryContainer;
