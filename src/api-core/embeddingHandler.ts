import { KeySlotId } from '../lib/ai/types';
import { executeWithFailover } from '../lib/ai/failoverAdapter';

// We create a specific cascade for embeddings since it requires a specific model
const embeddingCascade = [
  { role: 'primary' as const, model: 'text-embedding-004' },
  { role: 'backup' as const, model: 'text-embedding-004' }
];

export async function handleGenerateEmbeddings(
  texts: string[],
  customKeys?: Partial<Record<KeySlotId, string>>,
  envObj: Record<string, string | undefined> = (typeof process !== 'undefined' ? process.env : {})
) {
  return executeWithFailover(
    { pair: 'feature', cascade: embeddingCascade, customKeys, envObj }, 
    async (client, slotId, role, model) => {
      // The Gemini API currently supports batch embedding via embedContent in a loop or batchEmbedContents if supported by the SDK version.
      // @google/genai supports it.
      
      const embeddings: number[][] = [];
      
      // Process sequentially to be safe, or we could Promise.all
      // Note: In a production app with huge arrays, we'd batch these.
      // For the scope of this project, Promise.all is fine for chunks of a single note.
      const promises = texts.map(async (text) => {
        const response = await client.models.embedContent({
          model: model,
          contents: text,
        });
        return response.embeddings?.[0]?.values || [];
      });

      const results = await Promise.all(promises);
      
      return { embeddings: results, modelUsed: model, dimension: results[0]?.length || 768 };
    }
  );
}
