import { KeySlotId } from '../lib/ai/types';
import { executeWithFailover } from '../lib/ai/failoverAdapter';
import { balancedCascade } from '../lib/ai/cascadeProfiles';

export async function handleAnalyzeNote(
  content: string,
  customKeys?: Partial<Record<KeySlotId, string>>,
  envObj: Record<string, string | undefined> = (typeof process !== 'undefined' ? process.env : {})
) {
  return executeWithFailover(
    { pair: 'feature', cascade: balancedCascade, customKeys, envObj }, 
    async (client, slotId, role, model) => {
      const prompt = `Analyze the following note and extract key information. 
Return ONLY a valid JSON object with the following exact keys and types:
{
  "summary": "string, a concise but highly informative 2-3 sentence summary",
  "keywords": ["string", "array of 3-7 important keywords or tags"],
  "concepts": ["string", "array of 2-5 core concepts, mental models, or entities discussed"],
  "emotion": "string, a single word describing the overall tone or emotion (e.g., Neutral, Excited, Anxious, Analytical)"
}

Note content to analyze:
${content}`;
      
      const response = await client.models.generateContent({
        model: model,
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            temperature: 0.2 // Lower temperature for more consistent analytical output
        }
      });
      return { text: response.text, modelUsed: model };
    }
  );
}
