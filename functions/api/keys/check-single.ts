import { handleSingleKeyCheck } from '../../../src/api-core/keysHandler';
import { KeySlotId } from '../../../src/lib/ai/types';

export async function onRequestPost(context: any) {
  try {
    const request = context.request;
    const body = await request.json().catch(() => ({}));
    const { slotId, apiKey } = body;
    
    if (!slotId) {
      return new Response(JSON.stringify({ error: 'slotId is required' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Menggunakan Adapter Core Logic, inject Cloudflare environment
    const result = await handleSingleKeyCheck(slotId as KeySlotId, apiKey, context.env);
    
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
}
