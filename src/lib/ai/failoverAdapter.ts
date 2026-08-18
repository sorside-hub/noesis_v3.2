import { GoogleGenAI } from '@google/genai';
import { 
  KeyPairType, 
  KeyRole, 
  KeySlotId, 
  KeyHealthStatus, 
  FailoverExecutionOptions, 
  FailoverExecutionResult 
} from './types';

/**
 * Helper to resolve environment API keys with fallback support
 */
export function resolveServerKeyForSlot(
  slotId: KeySlotId, 
  customKeys?: Partial<Record<KeySlotId, string>>,
  envObj: Record<string, string | undefined> = (typeof process !== 'undefined' ? process.env : {})
): string {
  // 1. First check custom key provided in parameter or request
  if (customKeys && customKeys[slotId]?.trim()) {
    return customKeys[slotId]!.trim();
  }

  // 2. Resolve environment variables
  const getEnv = (name: string) => envObj[name] || '';

  switch (slotId) {
    case 'chat_primary':
      return getEnv('GEMINI_CHAT_PRIMARY_KEY') || getEnv('GEMINI_API_KEY');
    case 'chat_backup':
      return getEnv('GEMINI_CHAT_BACKUP_KEY');
    case 'feature_primary':
      return getEnv('GEMINI_FEATURE_PRIMARY_KEY') || getEnv('GEMINI_API_KEY');
    case 'feature_backup':
      return getEnv('GEMINI_FEATURE_BACKUP_KEY');
    default:
      return '';
  }
}

/**
 * Classify Gemini API errors into standardized KeyHealthStatus
 */
export function classifyGeminiApiError(error: unknown): { status: KeyHealthStatus; message: string } {
  const errStr = error instanceof Error ? error.message : String(error);
  const lowerMsg = errStr.toLowerCase();

  // All errors are mapped internally but simplified at the UI level
  if (
    lowerMsg.includes('429') || 
    lowerMsg.includes('quota') || 
    lowerMsg.includes('resource_exhausted') || 
    lowerMsg.includes('rate limit') ||
    lowerMsg.includes('limit reached')
  ) {
    return {
      status: 'quota_exceeded',
      message: 'Quota harian / Rate Limit tercapai (HTTP 429)',
    };
  }

  if (
    lowerMsg.includes('api_key_invalid') || 
    lowerMsg.includes('invalid api key') || 
    lowerMsg.includes('unauthorized') || 
    lowerMsg.includes('permission_denied') ||
    lowerMsg.includes('403') ||
    lowerMsg.includes('400')
  ) {
    return {
      status: 'invalid_key',
      message: 'API Key tidak valid atau tidak memiliki akses (HTTP 400/403)',
    };
  }

  return {
    status: 'error',
    message: errStr || 'Error pada server Gemini API',
  };
}

/**
 * Instantiate GoogleGenAI client for a given API key
 */
export function createGeminiClient(apiKey: string): GoogleGenAI {
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build-failover-adapter',
      },
    },
  });
}

/**
 * Ping check a single key to verify connectivity & quota limit
 */
export async function testKeyHealth(apiKey: string): Promise<{
  status: KeyHealthStatus;
  latencyMs: number;
  message: string;
}> {
  if (!apiKey || !apiKey.trim()) {
    return {
      status: 'missing',
      latencyMs: 0,
      message: 'API Key belum dikonfigurasi',
    };
  }

  const startTime = Date.now();
  try {
    const ai = createGeminiClient(apiKey.trim());
    // We use models.get instead of generateContent to avoid burning generation tokens for health checks
    await ai.models.get({ model: 'gemini-3.6-flash' });

    const latencyMs = Date.now() - startTime;
    return {
      status: 'active',
      latencyMs,
      message: 'Connected successfully',
    };
  } catch (err: unknown) {
    const latencyMs = Date.now() - startTime;
    const classified = classifyGeminiApiError(err);
    return {
      status: classified.status,
      latencyMs,
      message: classified.message,
    };
  }
}

/**
 * Main Failover Adapter Execution Wrapper:
 * Automatically iterates through the provided cascade plan (switching roles and models)
 * until a successful execution occurs or the cascade is exhausted.
 */
export async function executeWithFailover<T>(
  options: FailoverExecutionOptions,
  taskRunner: (client: GoogleGenAI, slotId: KeySlotId, role: KeyRole, model: string) => Promise<T>
): Promise<FailoverExecutionResult<T>> {
  const attempts: FailoverExecutionResult<T>['attempts'] = [];

  for (let i = 0; i < options.cascade.length; i++) {
    const step = options.cascade[i];
    const slotId: KeySlotId = `${options.pair}_${step.role}` as KeySlotId;
    const targetKey = resolveServerKeyForSlot(slotId, options.customKeys, options.envObj);

    if (!targetKey) {
      attempts.push({
        slotId,
        role: step.role,
        modelTried: step.model,
        error: `API Key (${slotId}) tidak dikonfigurasi`,
        status: 'missing',
      });
      continue;
    }

    try {
      const client = createGeminiClient(targetKey);
      const data = await taskRunner(client, slotId, step.role, step.model);
      
      attempts.push({
        slotId,
        role: step.role,
        modelTried: step.model,
        status: 'active',
      });

      return {
        success: true,
        data,
        usedSlot: slotId,
        usedRole: step.role,
        usedModel: step.model,
        wasFallbackUsed: i > 0,
        attempts,
      };
    } catch (err: unknown) {
      const classified = classifyGeminiApiError(err);
      attempts.push({
        slotId,
        role: step.role,
        modelTried: step.model,
        error: classified.message,
        status: classified.status,
      });

      console.warn(
        `[FailoverAdapter] Attempt ${i + 1} (${slotId} / ${step.model}) failed with status "${classified.status}". Actual error: ${err instanceof Error ? err.message : String(err)}`
      );
      // Loop continues to the next cascade step
    }
  }

  // If we exhaust the entire cascade and nothing worked
  return {
    success: false,
    usedSlot: `${options.pair}_primary` as KeySlotId, // Fallback return format
    usedRole: 'primary',
    wasFallbackUsed: false,
    attempts,
  };
}
