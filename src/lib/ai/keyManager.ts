import { 
  KeySlotId, 
  KeySlotInfo, 
  KeyCheckResult, 
  SystemKeysOverviewResponse 
} from './types';

const STORAGE_KEY_PREFIX = 'noesis_gemini_key_';

/**
 * Get custom API key stored in localStorage (if user provided custom key in UI)
 */
export function getLocalKeyOverride(slotId: KeySlotId): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(`${STORAGE_KEY_PREFIX}${slotId}`) || '';
}

/**
 * Save custom API key to localStorage
 */
export function setLocalKeyOverride(slotId: KeySlotId, apiKey: string): void {
  if (typeof window === 'undefined') return;
  if (apiKey.trim()) {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${slotId}`, apiKey.trim());
  } else {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${slotId}`);
  }
}

/**
 * Mask API Key for secure display in UI (e.g., AIzaSy...x9A1)
 */
export function maskApiKey(key: string): string {
  if (!key) return 'Tidak diatur';
  if (key.length <= 8) return '••••••••';
  return `${key.slice(0, 6)}••••••••${key.slice(-4)}`;
}

/**
 * Get all custom API keys stored in localStorage
 */
export function getAllLocalKeyOverrides(): Partial<Record<KeySlotId, string>> {
  return {
    chat_primary: getLocalKeyOverride('chat_primary'),
    chat_backup: getLocalKeyOverride('chat_backup'),
    feature_primary: getLocalKeyOverride('feature_primary'),
    feature_backup: getLocalKeyOverride('feature_backup'),
  };
}

/**
 * Cache in-memory for the keys overview to prevent spamming the API on every Settings mount.
 * Cache lasts for the entire app session until manually refreshed.
 */
let cachedOverview: SystemKeysOverviewResponse | null = null;

/**
 * Request server to check health status of all 4 API keys
 */
export async function checkAllKeysOverview(forceRefresh = false): Promise<SystemKeysOverviewResponse> {
  const customKeys: Record<string, string> = {
    chat_primary: getLocalKeyOverride('chat_primary'),
    chat_backup: getLocalKeyOverride('chat_backup'),
    feature_primary: getLocalKeyOverride('feature_primary'),
    feature_backup: getLocalKeyOverride('feature_backup'),
  };

  // Check cache first (returns cache if it exists and we are not forcing a refresh)
  if (!forceRefresh && cachedOverview) {
    return cachedOverview;
  }

  try {
    const res = await fetch('/api/keys/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customKeys }),
    });

    if (!res.ok) {
      throw new Error(`Server status HTTP ${res.status}`);
    }

    const data = await res.json();
    
    // Save to cache
    cachedOverview = data;

    return data;
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Gagal terhubung ke server API';
    // Fallback response if endpoint fails or offline
    const now = new Date().toISOString();
    return {
      ok: false,
      timestamp: now,
      slots: {
        chat_primary: {
          id: 'chat_primary',
          pair: 'chat',
          role: 'primary',
          label: 'Chat AI Primary Key',
          envVarName: 'GEMINI_CHAT_PRIMARY_KEY',
          isCustom: !!customKeys.chat_primary,
          maskedKey: maskApiKey(customKeys.chat_primary),
          status: 'error',
          message: errorMessage,
          lastCheckedAt: now,
        },
        chat_backup: {
          id: 'chat_backup',
          pair: 'chat',
          role: 'backup',
          label: 'Chat AI Backup Key',
          envVarName: 'GEMINI_CHAT_BACKUP_KEY',
          isCustom: !!customKeys.chat_backup,
          maskedKey: maskApiKey(customKeys.chat_backup),
          status: 'error',
          message: errorMessage,
          lastCheckedAt: now,
        },
        feature_primary: {
          id: 'feature_primary',
          pair: 'feature',
          role: 'primary',
          label: 'Feature AI Primary Key',
          envVarName: 'GEMINI_FEATURE_PRIMARY_KEY',
          isCustom: !!customKeys.feature_primary,
          maskedKey: maskApiKey(customKeys.feature_primary),
          status: 'error',
          message: errorMessage,
          lastCheckedAt: now,
        },
        feature_backup: {
          id: 'feature_backup',
          pair: 'feature',
          role: 'backup',
          label: 'Feature AI Backup Key',
          envVarName: 'GEMINI_FEATURE_BACKUP_KEY',
          isCustom: !!customKeys.feature_backup,
          maskedKey: maskApiKey(customKeys.feature_backup),
          status: 'error',
          message: errorMessage,
          lastCheckedAt: now,
        },
      },
    };
  }
}

/**
 * Request server to test/ping a single specific API key slot
 */
export async function checkSingleKeySlot(
  slotId: KeySlotId,
  overrideKey?: string
): Promise<KeyCheckResult> {
  const apiKey = overrideKey ?? getLocalKeyOverride(slotId);

  try {
    const res = await fetch('/api/keys/check-single', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slotId, apiKey }),
    });

    const data = await res.json();
    return data;
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Koneksi terputus';
    return {
      slotId,
      status: 'error',
      message: errorMessage,
      timestamp: new Date().toISOString(),
    };
  }
}
