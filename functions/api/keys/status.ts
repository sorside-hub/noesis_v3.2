import { handleKeysOverview } from '../../../src/api-core/keysHandler';

export async function onRequestPost(context: any) {
  try {
    const request = context.request;
    
    // Parse JSON body, fallback to empty object if none
    const body = await request.json().catch(() => ({}));
    const customKeys = body.customKeys || {};
    
    // Menggunakan Adapter Core Logic, inject Cloudflare environment
    const result = await handleKeysOverview(customKeys, context.env);
    
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
}
