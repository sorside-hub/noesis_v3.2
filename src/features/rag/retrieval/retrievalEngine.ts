import { IEmbeddingService, IVectorStore, RagQueryOptions, RetrievalResult } from '../types';

export class RetrievalEngine {
  private embeddingService: IEmbeddingService;
  private vectorStore: IVectorStore;

  constructor(embeddingService: IEmbeddingService, vectorStore: IVectorStore) {
    this.embeddingService = embeddingService;
    this.vectorStore = vectorStore;
  }

  /**
   * Main retrieval pipeline:
   * 1. Embed query
   * 2. Search vector store
   * 3. Format and return results
   */
  async retrieve(query: string, options?: RagQueryOptions): Promise<RetrievalResult[]> {
    if (!query || query.trim() === '') return [];

    // 1. Generate query embedding
    const queryVector = await this.embeddingService.generateEmbedding(query);

    // 2. Search vector store (filters and limits are pushed down to the store)
    const limit = options?.limit || 5;
    const minScore = options?.minSimilarityScore || 0.5; // Threshold fallback
    
    const rawResults = await this.vectorStore.search(queryVector, limit, options?.sourceFilter);

    // 3. Format results and apply score threshold
    const formattedResults: RetrievalResult[] = rawResults
      .filter(record => record.similarityScore >= minScore)
      .map(record => ({
        noteId: record.noteId,
        chunkText: record.content,
        sourceType: record.sourceType,
        similarityScore: record.similarityScore,
      }));

    return formattedResults;
  }
}
