import { splitTextIntoChunks, SplitOptions } from './textSplitter';
import { ChunkSourceType } from '../types/models';

export interface ChunkResult {
  text: string;
  chunkIndex: number;
  sourceType: ChunkSourceType;
}

/**
 * Service orchestrator that prepares text to be embedded.
 */
export class ChunkerService {
  /**
   * Chunks original user content (usually longer, needs normal chunking rules)
   */
  static chunkOriginalContent(text: string, options?: SplitOptions): ChunkResult[] {
    const rawChunks = splitTextIntoChunks(text, options);
    return rawChunks.map((chunk, index) => ({
      text: chunk,
      chunkIndex: index,
      sourceType: 'original_content'
    }));
  }

  /**
   * Chunks AI distilled content (usually already summarized and dense)
   * May use different overlap/size rules in the future, currently uses standard.
   */
  static chunkDistilContent(distilText: string, options?: SplitOptions): ChunkResult[] {
    // Distilled content is often bullet points or short summaries.
    // We can use a slightly larger chunk size to keep context together.
    const distilOptions = {
      chunkSize: options?.chunkSize || 1500,
      chunkOverlap: options?.chunkOverlap || 100,
    };
    
    const rawChunks = splitTextIntoChunks(distilText, distilOptions);
    return rawChunks.map((chunk, index) => ({
      text: chunk,
      chunkIndex: index,
      sourceType: 'distil_content'
    }));
  }
}
