/**
 * Calculates the cosine similarity between two vectors.
 * Returns a value between -1 and 1, where 1 means identical direction,
 * 0 means orthogonal, and -1 means exactly opposite.
 * For text embeddings, values are usually between 0 and 1.
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length to calculate cosine similarity.');
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    const a = vecA[i];
    const b = vecB[i];
    dotProduct += a * b;
    normA += a * a;
    normB += b * b;
  }
  
  if (normA === 0 || normB === 0) {
    return 0; // Prevent division by zero
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
