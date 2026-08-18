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
    // Send a lightweight health check ping using gemini-3.6-flash
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: 'Respond with "OK"',
      config: {
        maxOutputTokens: 5,
        temperature: 0.1,
      },
    });

    const latencyMs = Date.now() - startTime;
    if (response.text) {
      return {
        status: 'active',
        latencyMs,
        message: 'Koneksi aktif & beroperasi normal',
      };
    } else {
      return {
        status: 'active',
        latencyMs,
        message: 'Koneksi terhubung (respon kosong)',
      };
    }
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
 * Automatically executes task with Primary Key first, and seamlessly switches to Backup Key if Primary hits Quota Exceeded / Rate Limit.
 */
export async function executeWithFailover<T>(
  options: FailoverExecutionOptions,
  taskRunner: (client: GoogleGenAI, slotId: KeySlotId, role: KeyRole) => Promise<T>
): Promise<FailoverExecutionResult<T>> {
  const pair = options.pair;
  const primarySlot: KeySlotId = pair === 'chat' ? 'chat_primary' : 'feature_primary';
  const backupSlot: KeySlotId = pair === 'chat' ? 'chat_backup' : 'feature_backup';

  const primaryKey = resolveServerKeyForSlot(primarySlot, options.customKeys);
  const backupKey = resolveServerKeyForSlot(backupSlot, options.customKeys);

  const attempts: FailoverExecutionResult<T>['attempts'] = [];

  // Attempt 1: Try Primary Key
  if (primaryKey) {
    try {
      const client = createGeminiClient(primaryKey);
      const data = await taskRunner(client, primarySlot, 'primary');
      attempts.push({
        slotId: primarySlot,
        role: 'primary',
        status: 'active',
      });

      return {
        success: true,
        data,
        usedSlot: primarySlot,
        usedRole: 'primary',
        wasFallbackUsed: false,
        attempts,
      };
    } catch (primaryErr: unknown) {
      const classified = classifyGeminiApiError(primaryErr);
      attempts.push({
        slotId: primarySlot,
        role: 'primary',
        error: classified.message,
        status: classified.status,
      });

      console.warn(
        `[FailoverAdapter] Primary Key (${primarySlot}) failed with status "${classified.status}". Trying Backup Key...`
      );
    }
  } else {
    attempts.push({
      slotId: primarySlot,
      role: 'primary',
      error: 'Primary API Key tidak dikonfigurasi',
      status: 'missing',
    });
  }

  // Attempt 2: Try Backup Key if Primary Key failed or missing
  if (backupKey) {
    try {
      const client = createGeminiClient(backupKey);
      const data = await taskRunner(client, backupSlot, 'backup');
      attempts.push({
        slotId: backupSlot,
        role: 'backup',
        status: 'active',
      });

      return {
        success: true,
        data,
        usedSlot: backupSlot,
        usedRole: 'backup',
        wasFallbackUsed: true,
        attempts,
      };
    } catch (backupErr: unknown) {
      const classified = classifyGeminiApiError(backupErr);
      attempts.push({
        slotId: backupSlot,
        role: 'backup',
        error: classified.message,
        status: classified.status,
      });

      console.error(
        `[FailoverAdapter] Backup Key (${backupSlot}) also failed with status "${classified.status}".`
      );
    }
  } else {
    attempts.push({
      slotId: backupSlot,
      role: 'backup',
      error: 'Backup API Key tidak dikonfigurasi',
      status: 'missing',
    });
  }

  // If both failed
  return {
    success: false,
    usedSlot: primarySlot,
    usedRole: 'primary',
    wasFallbackUsed: false,
    attempts,
  };
}
