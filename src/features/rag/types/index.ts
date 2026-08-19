import { ChunkSourceType, EmbeddingRecord } from './models';

// 1. Embedding Interface
export interface IEmbeddingService {
  generateEmbedding(text: string): Promise<number[]>;
  generateEmbeddings(texts: string[]): Promise<number[][]>;
  getModelName(): string;
  getDimension(): number;
}

// 2. Vector Store Interface
export interface IVectorStore {
  add(records: EmbeddingRecord[]): Promise<void>;
  search(queryVector: number[], limit?: number, sourceFilter?: ChunkSourceType[]): Promise<EmbeddingRecord[]>;
  deleteByNoteId(noteId: string): Promise<void>;
}

// 3. Retrieval Result Formats
export interface RetrievalResult {
  noteId: string;
  chunkText: string;
  sourceType: ChunkSourceType;
  similarityScore: number;
}

export interface RagQueryOptions {
  limit?: number;
  sourceFilter?: ChunkSourceType[]; // Bisa difilter mau cari di ori, distil, atau keduanya
  minSimilarityScore?: number;
}
