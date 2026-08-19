import { IEmbeddingService } from '../types';
import { handleGenerateEmbeddings } from '../../../api-core/embeddingHandler';
import { KeySlotId } from '../../../lib/ai/types';

export class GeminiEmbeddingService implements IEmbeddingService {
  private customKeys?: Partial<Record<KeySlotId, string>>;
  private currentModelName: string = 'text-embedding-004';
  private currentDimension: number = 768;

  constructor(customKeys?: Partial<Record<KeySlotId, string>>) {
    this.customKeys = customKeys;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const results = await this.generateEmbeddings([text]);
    return results[0] || [];
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (!texts || texts.length === 0) return [];

    const result = await handleGenerateEmbeddings(texts, this.customKeys);
    
    if (!result.success || !result.data) {
      throw new Error(`Failed to generate embeddings: ${result.attempts[result.attempts.length - 1]?.error || 'Unknown error'}`);
    }

    this.currentModelName = result.data.modelUsed;
    if (result.data.dimension) {
        this.currentDimension = result.data.dimension;
    }

    return result.data.embeddings;
  }

  getModelName(): string {
    return this.currentModelName;
  }

  getDimension(): number {
    return this.currentDimension;
  }
}
