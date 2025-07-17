import { FileSystemFileRepository } from './FileSystemFileRepository.js';
class RepositoryContainer {
    static instance;
    _fileRepository;
    constructor() {
        this._fileRepository = new FileSystemFileRepository();
    }
    static getInstance() {
        if (!RepositoryContainer.instance) {
            RepositoryContainer.instance = new RepositoryContainer();
        }
        return RepositoryContainer.instance;
    }
    get fileRepository() {
        return this._fileRepository;
    }
}
export default RepositoryContainer;
