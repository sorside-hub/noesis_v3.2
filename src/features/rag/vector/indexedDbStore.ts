import { IVectorStore } from '../types';
import { EmbeddingRecord, ChunkSourceType } from '../types/models';
import { db } from '../../../lib/db';
import { cosineSimilarity } from './similarity';

export class IndexedDbVectorStore implements IVectorStore {
  
  async add(records: EmbeddingRecord[]): Promise<void> {
    if (!records || records.length === 0) return;
    await db.embeddings.bulkPut(records);
  }

  async deleteByNoteId(noteId: string): Promise<void> {
    // We get the primary keys (id) of all embeddings that match the noteId, then bulk delete.
    const recordsToDelete = await db.embeddings.where('noteId').equals(noteId).primaryKeys();
    await db.embeddings.bulkDelete(recordsToDelete);
  }

  async search(
    queryVector: number[], 
    limit: number = 5, 
    sourceFilter?: ChunkSourceType[]
  ): Promise<(EmbeddingRecord & { similarityScore: number })[]> {
    
    // Retrieve all embeddings (we can apply source filter at the DB query level to reduce RAM usage)
    let allRecords: EmbeddingRecord[];
    
    if (sourceFilter && sourceFilter.length > 0) {
      allRecords = await db.embeddings
        .where('sourceType')
        .anyOf(sourceFilter)
        .toArray();
    } else {
      allRecords = await db.embeddings.toArray();
    }

    if (allRecords.length === 0) return [];

    // Calculate cosine similarity for all records
    const scoredRecords = allRecords.map(record => {
      const score = cosineSimilarity(queryVector, record.embedding);
      return {
        ...record,
        similarityScore: score
      };
    });

    // Sort by score descending (highest similarity first)
    scoredRecords.sort((a, b) => b.similarityScore - a.similarityScore);

    // Return the top K results
    return scoredRecords.slice(0, limit);
  }
}
