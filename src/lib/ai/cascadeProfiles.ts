import { KeyRole } from './types';

export interface CascadeStep {
  role: KeyRole;
  model: string;
}

/**
 * Balanced cascade for general features.
 * Focus: High speed, acceptable reasoning, resilience.
 */
export const balancedCascade: CascadeStep[] = [
  { role: 'primary', model: 'gemini-3.6-flash' },
  { role: 'backup',  model: 'gemini-3.6-flash' },
  { role: 'primary', model: 'gemini-3.5-flash' },
  { role: 'backup',  model: 'gemini-3.5-flash' }
];

/**
 * Cascade for lightweight, extremely fast operations (e.g. classification, tagging, short summaries).
 * Focus: Absolute speed, lowest token cost.
 */
export const speedCascade: CascadeStep[] = [
  { role: 'primary', model: 'gemini-3.5-flash-lite' },
  { role: 'backup',  model: 'gemini-3.5-flash-lite' },
  { role: 'primary', model: 'gemini-3.5-flash' },
  { role: 'backup',  model: 'gemini-3.5-flash' }
];

/**
 * Cascade for high reliability and fallback safety.
 * Focus: Guaranteed execution by gracefully degrading to lite if standard flash hits rate limits.
 */
export const reliableCascade: CascadeStep[] = [
  { role: 'primary', model: 'gemini-3.5-flash' },
  { role: 'backup',  model: 'gemini-3.5-flash' },
  { role: 'primary', model: 'gemini-3.5-flash-lite' },
  { role: 'backup',  model: 'gemini-3.5-flash-lite' }
];
