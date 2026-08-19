import { NoteEditor } from './features/editor/components/NoteEditor';
import { SettingsView } from './features/settings/components/SettingsView';
import { ChatView } from './features/chat/components/ChatView';
import { BottomNavPill } from './components/navigation/BottomNavPill';
import { ActivityBar } from './components/navigation/ActivityBar';
import { useVault } from './hooks/useVault';
import { useTheme } from './hooks/useTheme';
import { Loader2 } from 'lucide-react';
import { NavigationProvider, useNavigation } from './context/NavigationContext';

function AppContent({ vaultState }: { vaultState: ReturnType<typeof useVault> }) {
  const { view, navigateView, navigateToNote } = useNavigation();

  return (
    <div className="h-screen w-screen overflow-hidden bg-bg-primary text-text-primary relative flex flex-row font-sans">
      {/* Desktop Left Activity Bar */}
      <ActivityBar 
        activeTab={view} 
        onTabChange={navigateView} 
        onCreateNote={async () => {
          if (vaultState.vault) {
            const newId = await vaultState.createNote(null, 'Untitled');
            if (newId) {
              navigateToNote(newId);
            } else {
              navigateView('vault');
            }
          }
        }}
      />

      {/* Main Content Views */}
      <div className="flex-1 overflow-hidden relative flex flex-col">
        {/* Vault & Editor View */}
        <div className={`absolute inset-0 ${view === 'vault' ? 'block' : 'hidden'}`}>
          <NoteEditor vaultState={vaultState as any} />
        </div>

        {/* Chat / Ask AI View */}
        <div className={`absolute inset-0 ${view === 'chat' ? 'block' : 'hidden'}`}>
          <ChatView vault={vaultState.vault} />
        </div>

        {/* Settings View */}
        <div className={`absolute inset-0 ${view === 'settings' ? 'block' : 'hidden'}`}>
          <SettingsView vault={vaultState.vault} />
        </div>
      </div>

      {/* 2. Floating Bottom Navigation Pill (Mobile Only - Auto-hides on scroll down) */}
      <BottomNavPill activeTab={view} onTabChange={navigateView} />
    </div>
  );
}

export default function App() {
  const vaultState = useVault();
  useTheme(); // Initialize theme sync

  // Show loading screen while Dexie initializes
  if (!vaultState.vault) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-bg-primary text-text-muted">
        <Loader2 className="w-8 h-8 animate-spin text-text-secondary mb-4" />
        <p className="font-medium">Memuat Ruang Kerja...</p>
      </div>
    );
  }

  return (
    <NavigationProvider
      activeTabId={vaultState.vault.activeTabId}
      onSelectTabId={vaultState.setActiveTabId}
    >
      <AppContent vaultState={vaultState} />
    </NavigationProvider>
  );
}

