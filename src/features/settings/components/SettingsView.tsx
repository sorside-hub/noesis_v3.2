import React from 'react';
import { 
  Sun, 
  Moon, 
  Laptop, 
  Palette, 
  BookOpen, 
  Layers, 
  Check, 
  HardDrive, 
  Keyboard
} from 'lucide-react';
import { useTheme, ThemeMode } from '../../../hooks/useTheme';
import { VaultData, FileNode } from '../../../types/vault';
import { ApiKeyStatusSection } from './ApiKeyStatusSection';

interface SettingsViewProps {
  vault: VaultData;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ vault }) => {
  const { theme, setTheme } = useTheme();

  const allNodes = Object.values(vault.nodes) as FileNode[];
  const totalFiles = allNodes.filter((n) => n.type === 'file').length;
  const totalFolders = allNodes.filter((n) => n.type === 'folder').length;

  const themeOptions: { value: ThemeMode; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: 'Light Mode', icon: <Sun size={18} className="text-amber-500" /> },
    { value: 'dark', label: 'Dark Mode', icon: <Moon size={18} className="text-blue-400" /> },
    { value: 'system', label: 'System Match', icon: <Laptop size={18} className="text-text-muted" /> },
  ];

  return (
    <div className="w-full h-full overflow-y-auto bg-bg-primary text-text-primary select-text">
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-10 space-y-8 pb-28">
        <header>
          <h1 className="text-xl md:text-2xl font-bold text-text-heading tracking-tight">Settings</h1>
          <p className="text-sm text-text-muted mt-1">Preferences, connections, and local storage.</p>
        </header>

        {/* 1. APPEARANCE */}
        <section>
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2.5 px-1 flex items-center gap-2">
            <Palette size={14} /> Appearance
          </h2>
          <div className="bg-bg-surface border border-border-default rounded-xl overflow-hidden divide-y divide-border-subtle shadow-xs">
            {themeOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className="w-full flex items-center justify-between p-3.5 hover:bg-bg-hover transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="shrink-0">{opt.icon}</div>
                  <span className="text-sm font-medium text-text-heading">{opt.label}</span>
                </div>
                {theme === opt.value && <Check size={18} className="text-accent-primary" />}
              </button>
            ))}
          </div>
        </section>

        {/* 2. API KEYS & FAILOVER */}
        <section>
          <ApiKeyStatusSection />
        </section>

        {/* 3. VAULT INFO */}
        <section>
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2.5 px-1 flex items-center gap-2">
            <HardDrive size={14} /> Vault & Storage
          </h2>
          <div className="bg-bg-surface border border-border-default rounded-xl overflow-hidden divide-y divide-border-subtle shadow-xs">
            <div className="flex items-center justify-between p-3.5">
               <div className="flex items-center gap-3">
                 <BookOpen size={16} className="text-text-secondary" />
                 <span className="text-sm font-medium text-text-heading">Total Notes</span>
               </div>
               <span className="text-sm text-text-muted font-mono">{totalFiles}</span>
            </div>
            <div className="flex items-center justify-between p-3.5">
               <div className="flex items-center gap-3">
                 <Layers size={16} className="text-text-secondary" />
                 <span className="text-sm font-medium text-text-heading">Total Folders</span>
               </div>
               <span className="text-sm text-text-muted font-mono">{totalFolders}</span>
            </div>
            <div className="flex items-center justify-between p-3.5">
               <div className="flex items-center gap-3">
                 <HardDrive size={16} className="text-text-secondary" />
                 <span className="text-sm font-medium text-text-heading">Storage Engine</span>
               </div>
               <span className="text-sm text-text-muted">IndexedDB (Local)</span>
            </div>
          </div>
        </section>
        
        {/* 4. SHORTCUTS */}
        <section>
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2.5 px-1 flex items-center gap-2">
            <Keyboard size={14} /> Markdown Shortcuts
          </h2>
          <div className="bg-bg-surface border border-border-default rounded-xl overflow-hidden divide-y divide-border-subtle shadow-xs">
            {[
              { label: 'Wikilink', keys: '[[Note Name]]' },
              { label: 'Tags', keys: '#tag-name' },
              { label: 'Bold', keys: '**bold**' },
              { label: 'Italic', keys: '*italic*' },
              { label: 'Heading', keys: '# H1  ## H2' },
              { label: 'Code Block', keys: '```code```' },
            ].map((shortcut, idx) => (
              <div key={idx} className="flex items-center justify-between p-3.5">
                <span className="text-sm font-medium text-text-heading">{shortcut.label}</span>
                <kbd className="px-2 py-1 bg-bg-primary border border-border-default rounded text-[11px] font-mono text-text-secondary">
                  {shortcut.keys}
                </kbd>
              </div>
            ))}
          </div>
        </section>

        <div className="text-center pt-6 pb-2 text-text-muted">
          <p className="text-xs font-mono">Noesis Workspace v1.2.0</p>
        </div>
      </div>
    </div>
  );
};
