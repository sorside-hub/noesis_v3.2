import React, { useState, useEffect } from 'react';
import { 
  Key, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  MessageSquare, 
  Cpu, 
  ShieldCheck, 
  Edit3, 
  Check, 
  X
} from 'lucide-react';
import { 
  KeySlotId, 
  KeySlotInfo, 
  KeyHealthStatus, 
  SystemKeysOverviewResponse 
} from '../../../lib/ai/types';
import { 
  checkAllKeysOverview, 
  checkSingleKeySlot, 
  getLocalKeyOverride, 
  setLocalKeyOverride
} from '../../../lib/ai/keyManager';

export const ApiKeyStatusSection: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [testingSlot, setTestingSlot] = useState<KeySlotId | null>(null);
  const [overview, setOverview] = useState<SystemKeysOverviewResponse | null>(null);
  
  // Custom edit states for user local key overrides
  const [editingSlot, setEditingSlot] = useState<KeySlotId | null>(null);
  const [tempKeyInput, setTempKeyInput] = useState<string>('');

  const fetchStatus = async (forceRefresh = false) => {
    setLoading(true);
    try {
      const data = await checkAllKeysOverview(forceRefresh);
      setOverview(data);
    } catch (err) {
      console.error('Gagal mengambil status API key:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleTestSingleSlot = async (slotId: KeySlotId) => {
    setTestingSlot(slotId);
    try {
      const result = await checkSingleKeySlot(slotId);
      
      setOverview((prev) => {
        if (!prev) return null;
        const currentSlot = prev.slots[slotId];
        const updatedSlot: KeySlotInfo = {
          ...currentSlot,
          status: result.status,
          latencyMs: result.latencyMs,
          message: result.message,
          lastCheckedAt: result.timestamp,
        };

        return {
          ...prev,
          slots: {
            ...prev.slots,
            [slotId]: updatedSlot,
          },
        };
      });
    } catch (err) {
      console.error(`Gagal menguji slot ${slotId}:`, err);
    } finally {
      setTestingSlot(null);
    }
  };

  const handleStartEdit = (slotId: KeySlotId) => {
    setEditingSlot(slotId);
    setTempKeyInput(getLocalKeyOverride(slotId));
  };

  const handleSaveCustomKey = (slotId: KeySlotId) => {
    setLocalKeyOverride(slotId, tempKeyInput);
    setEditingSlot(null);
    handleTestSingleSlot(slotId);
  };

  const handleClearCustomKey = (slotId: KeySlotId) => {
    setLocalKeyOverride(slotId, '');
    setEditingSlot(null);
    handleTestSingleSlot(slotId);
  };

  const getStatusIcon = (status: KeyHealthStatus | 'checking') => {
    switch (status) {
      case 'active': return <CheckCircle2 size={14} className="text-status-success" />;
      case 'missing': return <Key size={14} className="text-text-muted opacity-60" />;
      case 'checking': return <RefreshCw size={14} className="text-status-info animate-spin" />;
      default: return <XCircle size={14} className="text-status-error" />; // quota_exceeded, invalid_key, error
    }
  };

  const getStatusText = (status: KeyHealthStatus | 'checking') => {
    switch (status) {
      case 'active': return 'Connected';
      case 'missing': return 'Off';
      case 'checking': return 'Checking...';
      default: return 'Disconnected'; // quota_exceeded, invalid_key, error
    }
  };

  const renderSlotRow = (slotId: KeySlotId, slotInfo?: KeySlotInfo, icon?: React.ReactNode) => {
    if (!slotInfo) return null;
    const isEditing = editingSlot === slotId;
    const isTestingThis = testingSlot === slotId;

    return (
      <div key={slotId} className="flex flex-col p-3.5 group transition-colors hover:bg-bg-hover/50">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="text-text-secondary shrink-0">{icon}</div>
            <div className="flex flex-col truncate">
              <span className="text-sm font-medium text-text-heading truncate">
                {slotInfo.label}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            {!isEditing && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-bg-primary rounded-md border border-border-default">
                {getStatusIcon(isTestingThis ? 'checking' : slotInfo.status)}
                <span className="text-[10px] font-medium text-text-secondary hidden sm:inline-block">
                  {getStatusText(isTestingThis ? 'checking' : slotInfo.status)}
                </span>
              </div>
            )}
            
            {!isEditing && (
              <div className="flex items-center sm:opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => handleStartEdit(slotId)}
                  className="p-1.5 text-text-muted hover:text-text-primary hover:bg-bg-surface rounded-md cursor-pointer"
                  title="Edit Local Key"
                >
                  <Edit3 size={14} />
                </button>
                <button
                  type="button"
                  disabled={isTestingThis || loading}
                  onClick={() => handleTestSingleSlot(slotId)}
                  className="p-1.5 text-text-muted hover:text-accent-primary hover:bg-bg-surface rounded-md disabled:opacity-50 cursor-pointer"
                  title="Test Connection"
                >
                  <RefreshCw size={14} className={isTestingThis ? 'animate-spin' : ''} />
                </button>
              </div>
            )}
          </div>
        </div>

        {isEditing && (
          <div className="mt-3 flex items-center gap-2 pt-3 border-t border-border-subtle">
            <input
              type="password"
              value={tempKeyInput}
              onChange={(e) => setTempKeyInput(e.target.value)}
              placeholder="API Key (AIzaSy...)"
              className="flex-1 text-xs font-mono bg-bg-primary border border-border-default rounded-md px-2.5 py-1.5 text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
            />
            <button
              type="button"
              onClick={() => handleSaveCustomKey(slotId)}
              className="p-1.5 bg-accent-primary text-white rounded-md hover:opacity-90 cursor-pointer"
            >
              <Check size={14} />
            </button>
            {slotInfo.isCustom && (
              <button
                type="button"
                onClick={() => handleClearCustomKey(slotId)}
                className="p-1.5 bg-status-error-bg text-status-error rounded-md hover:opacity-80 cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
            <button
              type="button"
              onClick={() => setEditingSlot(null)}
              className="p-1.5 bg-bg-hover border border-border-default text-text-muted rounded-md hover:text-text-primary cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2.5 px-1 flex items-center gap-2">
        <ShieldCheck size={14} /> API Connectivity
      </h2>
      <div className="bg-bg-surface border border-border-default rounded-xl overflow-hidden divide-y divide-border-subtle shadow-xs">
        <div className="flex items-center justify-between p-3.5 bg-bg-primary/30">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-text-secondary">Failover Pairs Status</span>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={() => fetchStatus(true)}
            className="text-[11px] flex items-center gap-1.5 font-medium text-accent-primary hover:text-accent-secondary disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Testing...' : 'Test All Keys'}
          </button>
        </div>

        {renderSlotRow('chat_primary', overview?.slots.chat_primary, <MessageSquare size={16} className="text-accent-primary" />)}
        {renderSlotRow('chat_backup', overview?.slots.chat_backup, <MessageSquare size={16} className="text-text-muted" />)}
        {renderSlotRow('feature_primary', overview?.slots.feature_primary, <Cpu size={16} className="text-emerald-500" />)}
        {renderSlotRow('feature_backup', overview?.slots.feature_backup, <Cpu size={16} className="text-text-muted" />)}
      </div>
    </>
  );
};
