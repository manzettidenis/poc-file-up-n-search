import { File } from '../../domain/entities/File.js'
import { IFileRepository } from '../../domain/repositories/IFileRepository.js'
import { SearchQuery, SearchResult } from '../../types/index.js'
import Fuse from 'fuse.js'

export class InMemoryFileRepository implements IFileRepository {
  private files: Map<string, File> = new Map()
  private fuse: Fuse<File>

  constructor() {
    this.fuse = new Fuse([], {
      keys: ['extractedText', 'originalName', 'metadata.title', 'metadata.author'],
      threshold: 0,
      includeMatches: true,
      isCaseSensitive: false,
    })
  }

  async save(file: File): Promise<File> {
    this.files.set(file.id, file)
    this.updateSearchIndex()
    return file
  }

  async findById(id: string): Promise<File | null> {
    return this.files.get(id) || null
  }

  async findByFilename(filename: string): Promise<File | null> {
    for (const file of this.files.values()) {
      if (file.filename === filename) {
        return file
      }
    }
    return null
  }

  async findAll(limit = 50, offset = 0): Promise<File[]> {
    const allFiles = Array.from(this.files.values())
    return allFiles.slice(offset, offset + limit)
  }

  async search(query: SearchQuery): Promise<SearchResult> {
    const results = this.fuse.search(query.term)
    const files = results.map(result => ({
      file: result.item,
      score: result.score || 0,
      highlights: [],
    }))

    const page = query.pagination?.page || 1
    const limit = query.pagination?.limit || 10
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit

    return {
      files: files.slice(startIndex, endIndex),
      totalCount: results.length,
      page,
      totalPages: Math.ceil(results.length / limit),
    }
  }

  async delete(id: string): Promise<boolean> {
    const deleted = this.files.delete(id)
    if (deleted) {
      this.updateSearchIndex()
    }
    return deleted
  }

  async update(file: File): Promise<File> {
    this.files.set(file.id, file)
    this.updateSearchIndex()
    return file
  }

  async count(): Promise<number> {
    return this.files.size
  }

  async exists(id: string): Promise<boolean> {
    return this.files.has(id)
  }

  private updateSearchIndex(): void {
    this.fuse.setCollection(Array.from(this.files.values()))
  }
}
