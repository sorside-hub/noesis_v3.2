export interface AIAnalysisRecord {
  noteId: string;           // Primary Key (Relasi ke Note)
  contentHash: string;      // Hash dari teks asli (MD5/SHA-256) untuk cek perubahan
  summary: string;
  keywords: string[];
  concepts: string[];
  emotion: string;
  modelUsed: string;        // e.g., 'gemini-3.5-flash'
  createdAt: number;
  updatedAt: number;
}

export type ChunkSourceType = 'original_content' | 'distil_content';

export interface EmbeddingRecord {
  id: string;               // UUID (Primary Key)
  noteId: string;           // Index (Relasi ke Note)
  chunkIndex: number;       // Urutan chunk (0, 1, 2...)
  sourceType: ChunkSourceType;
  content: string;          // Teks potongan chunk
  embedding: number[];      // Array Float (Vector)
  embeddingModel: string;   // e.g., 'text-embedding-004'
  dimension: number;        // e.g., 768
  createdAt: number;
  similarityScore?: number; // Optional dynamically calculated score
}
