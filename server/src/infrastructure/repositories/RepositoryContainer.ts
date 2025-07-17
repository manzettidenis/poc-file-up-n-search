import { FileSystemFileRepository } from './FileSystemFileRepository.js';
import { IFileRepository } from '../../domain/repositories/IFileRepository.js';

class RepositoryContainer {
  private static instance: RepositoryContainer;
  private _fileRepository: IFileRepository;

  private constructor() {
    this._fileRepository = new FileSystemFileRepository();
  }

  static getInstance(): RepositoryContainer {
    if (!RepositoryContainer.instance) {
      RepositoryContainer.instance = new RepositoryContainer();
    }
    return RepositoryContainer.instance;
  }

  get fileRepository(): IFileRepository {
    return this._fileRepository;
  }
}

export default RepositoryContainer; 