/**
 * Types for Multi-Key Gemini Failover & Status Health Checking
 */

import { CascadeStep } from './cascadeProfiles';

export type KeyPairType = 'chat' | 'feature';
export type KeyRole = 'primary' | 'backup';

export type KeySlotId = 'chat_primary' | 'chat_backup' | 'feature_primary' | 'feature_backup';

export type KeyHealthStatus = 
  | 'active'
  | 'quota_exceeded'
  | 'invalid_key'
  | 'missing'
  | 'error';

export interface KeySlotInfo {
  id: KeySlotId;
  pair: KeyPairType;
  role: KeyRole;
  label: string;
  envVarName: string;
  isCustom: boolean; // Whether set via UI override vs server environment
  maskedKey: string;
  status: KeyHealthStatus;
  latencyMs?: number;
  message?: string;
  lastCheckedAt?: string;
}

export interface PairStatusSummary {
  pair: KeyPairType;
  label: string;
  description: string;
  primary: KeySlotInfo;
  backup: KeySlotInfo;
  activeRole: KeyRole | 'none'; // Which role will be used primarily
  pairHealth: 'healthy' | 'degraded' | 'critical'; // healthy = primary ok, degraded = backup ok / primary failed, critical = both failed
}

export interface KeyCheckResult {
  slotId: KeySlotId;
  status: KeyHealthStatus;
  latencyMs?: number;
  message: string;
  timestamp: string;
}

export interface SystemKeysOverviewResponse {
  ok: boolean;
  timestamp: string;
  slots: Record<KeySlotId, KeySlotInfo>;
}

export interface SingleKeyCheckRequest {
  slotId: KeySlotId;
  apiKey?: string; // Optional custom key sent from client UI test
}

export interface FailoverExecutionOptions {
  pair: KeyPairType;
  cascade: CascadeStep[];
  customKeys?: Partial<Record<KeySlotId, string>>;
  envObj?: Record<string, string | undefined>;
}

export interface FailoverExecutionResult<T> {
  success: boolean;
  data?: T;
  usedSlot: KeySlotId;
  usedRole: KeyRole;
  usedModel?: string;
  wasFallbackUsed: boolean;
  attempts: Array<{
    slotId: KeySlotId;
    role: KeyRole;
    modelTried: string;
    error?: string;
    status: KeyHealthStatus;
  }>;
}
