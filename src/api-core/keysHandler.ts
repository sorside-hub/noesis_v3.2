import { 
  KeySlotId, 
  KeySlotInfo, 
  SystemKeysOverviewResponse,
  KeyCheckResult
} from '../lib/ai/types';
import { 
  resolveServerKeyForSlot, 
  testKeyHealth 
} from '../lib/ai/failoverAdapter';

export async function handleKeysOverview(
  customKeys: Partial<Record<KeySlotId, string>> = {},
  envObj: Record<string, string | undefined> = (typeof process !== 'undefined' ? process.env : {})
): Promise<SystemKeysOverviewResponse> {
  const now = new Date().toISOString();

  const slotsToTest: Array<{
    id: KeySlotId;
    pair: 'chat' | 'feature';
    role: 'primary' | 'backup';
    label: string;
    envVarName: string;
  }> = [
    {
      id: 'chat_primary',
      pair: 'chat',
      role: 'primary',
      label: 'Chat AI Primary Key',
      envVarName: 'GEMINI_CHAT_PRIMARY_KEY',
    },
    {
      id: 'chat_backup',
      pair: 'chat',
      role: 'backup',
      label: 'Chat AI Backup Key',
      envVarName: 'GEMINI_CHAT_BACKUP_KEY',
    },
    {
      id: 'feature_primary',
      pair: 'feature',
      role: 'primary',
      label: 'Feature AI Primary Key',
      envVarName: 'GEMINI_FEATURE_PRIMARY_KEY',
    },
    {
      id: 'feature_backup',
      pair: 'feature',
      role: 'backup',
      label: 'Feature AI Backup Key',
      envVarName: 'GEMINI_FEATURE_BACKUP_KEY',
    },
  ];

  // Run parallel ping tests for all slots
  const slotResults = await Promise.all(
    slotsToTest.map(async (slotDef) => {
      const rawKey = resolveServerKeyForSlot(slotDef.id, customKeys, envObj);
      const isCustom = !!(customKeys[slotDef.id]?.trim());

      let maskedKey = 'Tidak diatur';
      if (rawKey) {
        maskedKey = rawKey.length <= 8 
          ? '••••••••' 
          : `${rawKey.slice(0, 6)}••••••••${rawKey.slice(-4)}`;
      }

      if (!rawKey) {
        const slotInfo: KeySlotInfo = {
          id: slotDef.id,
          pair: slotDef.pair,
          role: slotDef.role,
          label: slotDef.label,
          envVarName: slotDef.envVarName,
          isCustom,
          maskedKey,
          status: 'missing',
          message: 'Key belum dikonfigurasi di server .env atau custom UI',
          lastCheckedAt: now,
        };
        return { id: slotDef.id, info: slotInfo };
      }

      const health = await testKeyHealth(rawKey);
      const slotInfo: KeySlotInfo = {
        id: slotDef.id,
        pair: slotDef.pair,
        role: slotDef.role,
        label: slotDef.label,
        envVarName: slotDef.envVarName,
        isCustom,
        maskedKey,
        status: health.status,
        latencyMs: health.latencyMs,
        message: health.message,
        lastCheckedAt: now,
      };

      return { id: slotDef.id, info: slotInfo };
    })
  );

  const slotsMap = {} as Record<KeySlotId, KeySlotInfo>;
  slotResults.forEach((item) => {
    slotsMap[item.id] = item.info;
  });

  return {
    ok: true,
    timestamp: now,
    slots: slotsMap,
  };
}

export async function handleSingleKeyCheck(
  slotId: KeySlotId, 
  apiKey?: string,
  envObj: Record<string, string | undefined> = (typeof process !== 'undefined' ? process.env : {})
): Promise<KeyCheckResult> {
  const customMap = apiKey ? { [slotId]: apiKey } : undefined;
  const targetKey = resolveServerKeyForSlot(slotId, customMap, envObj);

  const health = await testKeyHealth(targetKey);
  return {
    slotId,
    status: health.status,
    latencyMs: health.latencyMs,
    message: health.message,
    timestamp: new Date().toISOString(),
  };
}
