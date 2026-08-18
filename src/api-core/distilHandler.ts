import { KeySlotId } from '../lib/ai/types';
import { executeWithFailover } from '../lib/ai/failoverAdapter';
import { balancedCascade } from '../lib/ai/cascadeProfiles';

export async function handleDistil(
  content: string,
  customKeys?: Partial<Record<KeySlotId, string>>,
  envObj: Record<string, string | undefined> = (typeof process !== 'undefined' ? process.env : {})
) {
  return executeWithFailover(
    { pair: 'feature', cascade: balancedCascade, customKeys, envObj }, 
    async (client, slotId, role, model) => {
      const prompt = `Please distil the following text into a concise summary and key takeaways:\n\n${content}`;
      
      const response = await client.models.generateContent({
        model: model,
        contents: prompt,
      });
      return { text: response.text, modelUsed: model };
    }
  );
}
