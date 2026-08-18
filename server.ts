import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { KeySlotId } from './src/lib/ai/types';
import { handleKeysOverview, handleSingleKeyCheck } from './src/api-core/keysHandler';
import { handleDistil } from './src/api-core/distilHandler';

// Load environment variables from .env
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json());

  // =========================================================================
  // API ROUTES
  // =========================================================================

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // POST /api/keys/status - Check health of all 4 API keys (2 pairs)
  app.post('/api/keys/status', async (req, res) => {
    try {
      const customKeys = (req.body?.customKeys || {}) as Partial<Record<KeySlotId, string>>;
      
      // Menggunakan pola "Adapter" dengan menyerahkan proses ke Core Logic
      const result = await handleKeysOverview(customKeys, process.env);
      
      res.json(result);
    } catch (error: unknown) {
      console.error('[API /api/keys/status Error]:', error);
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Internal Server Error',
      });
    }
  });

  // POST /api/keys/check-single - Test a single API key slot
  app.post('/api/keys/check-single', async (req, res) => {
    try {
      const { slotId, apiKey } = req.body as { slotId?: KeySlotId; apiKey?: string };

      if (!slotId) {
        return res.status(400).json({ error: 'slotId is required' });
      }

      // Menggunakan pola "Adapter" dengan menyerahkan proses ke Core Logic
      const result = await handleSingleKeyCheck(slotId, apiKey, process.env);
      
      res.json(result);
    } catch (error: unknown) {
      console.error('[API /api/keys/check-single Error]:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Internal Server Error',
      });
    }
  });

  // POST /api/distil - Distil note content using Pair 2 keys
  app.post('/api/distil', async (req, res) => {
    try {
      const { content, customKeys } = req.body as { content?: string, customKeys?: Partial<Record<KeySlotId, string>> };
      if (!content) {
        return res.status(400).json({ error: 'content is required' });
      }
      
      const result = await handleDistil(content, customKeys, process.env);
      res.json(result);
    } catch (error: unknown) {
      console.error('[API /api/distil Error]:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Internal Server Error',
      });
    }
  });

  // =========================================================================
  // VITE / STATIC SERVING
  // =========================================================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Noesis Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Fatal Startup Error]:', err);
  process.exit(1);
});
