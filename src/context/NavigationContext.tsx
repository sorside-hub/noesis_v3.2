import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { ActiveTab } from '../components/navigation/BottomNavPill';

export interface NavigationHistoryEntry {
  view: ActiveTab;
  activeTabId: string | null;
  isMobileSidebarOpen: boolean;
  isMobileRightSidebarOpen: boolean;
  activeModal: string | null;
  seq: number;
}

interface NavigationContextType {
  // Top-level View ('vault' | 'settings')
  view: ActiveTab;
  setView: (tab: ActiveTab) => void;
  navigateView: (tab: ActiveTab) => void;

  // Active Note Tab ID
  activeTabId: string | null;
  navigateToNote: (id: string | null) => void;

  // Mobile Drawers
  isMobileSidebarOpen: boolean;
  setIsMobileSidebarOpen: (open: boolean) => void;
  openMobileSidebar: () => void;
  closeMobileSidebar: () => void;

  isMobileRightSidebarOpen: boolean;
  setIsMobileRightSidebarOpen: (open: boolean) => void;
  openMobileRightSidebar: () => void;
  closeMobileRightSidebar: () => void;

  // Modal / Popup Overlays
  activeModal: string | null;
  openModal: (modalId: string) => void;
  closeModal: () => void;

  // Manual Back Trigger
  goBack: () => void;
}

const NavigationContext = createContext<NavigationContextType | null>(null);

interface NavigationProviderProps {
  children: React.ReactNode;
  activeTabId: string | null;
  onSelectTabId: (id: string | null) => void;
}

export const NavigationProvider: React.FC<NavigationProviderProps> = ({
  children,
  activeTabId,
  onSelectTabId,
}) => {
  const [view, setView] = useState<ActiveTab>('vault');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobileRightSidebarOpen, setIsMobileRightSidebarOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const isPopStateNavigatingRef = useRef(false);
  const currentSeqRef = useRef(1);

  // Safe wrapper for history pushState / replaceState
  const safePushState = (entry: NavigationHistoryEntry) => {
    try {
      if (typeof window !== 'undefined' && window.history && typeof window.history.pushState === 'function') {
        window.history.pushState(entry, '', window.location.href);
      }
    } catch (err) {
      console.warn('History pushState restricted in current frame environment:', err);
    }
  };

  const safeReplaceState = (entry: NavigationHistoryEntry) => {
    try {
      if (typeof window !== 'undefined' && window.history && typeof window.history.replaceState === 'function') {
        window.history.replaceState(entry, '', window.location.href);
      }
    } catch (err) {
      console.warn('History replaceState restricted in current frame environment:', err);
    }
  };

  const safeHistoryBack = () => {
    try {
      if (typeof window !== 'undefined' && window.history && typeof window.history.back === 'function') {
        window.history.back();
      }
    } catch (err) {
      console.warn('History back restricted in current frame environment:', err);
    }
  };

  // Initialize history state on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initialEntry: NavigationHistoryEntry = {
      view: 'vault',
      activeTabId,
      isMobileSidebarOpen: false,
      isMobileRightSidebarOpen: false,
      activeModal: null,
      seq: 1,
    };

    // Use replaceState to establish base state without creating redundant history entries
    safeReplaceState(initialEntry);
  }, []);

  // Listen for browser/phone Back & Forward popstate events
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state as NavigationHistoryEntry | null;
      if (!state) return;

      isPopStateNavigatingRef.current = true;
      currentSeqRef.current = state.seq || 1;

      // 1. Sync View
      if (state.view) {
        setView(state.view);
      }

      // 2. Sync Active Note
      if (state.activeTabId !== undefined) {
        onSelectTabId(state.activeTabId);
      }

      // 3. Sync Mobile Sidebars
      setIsMobileSidebarOpen(!!state.isMobileSidebarOpen);
      setIsMobileRightSidebarOpen(!!state.isMobileRightSidebarOpen);

      // 4. Sync Modal
      setActiveModal(state.activeModal || null);

      // Reset flag after state batching completes
      setTimeout(() => {
        isPopStateNavigatingRef.current = false;
      }, 60);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [onSelectTabId]);

  // Navigate between top-level views ('vault' <-> 'settings')
  const navigateView = useCallback(
    (newView: ActiveTab) => {
      if (newView === view && !isMobileSidebarOpen && !isMobileRightSidebarOpen && !activeModal) {
        return;
      }

      if (!isPopStateNavigatingRef.current) {
        currentSeqRef.current += 1;
        const nextEntry: NavigationHistoryEntry = {
          view: newView,
          activeTabId,
          isMobileSidebarOpen: false,
          isMobileRightSidebarOpen: false,
          activeModal: null,
          seq: currentSeqRef.current,
        };
        safePushState(nextEntry);
      }

      setView(newView);
      setIsMobileSidebarOpen(false);
      setIsMobileRightSidebarOpen(false);
      setActiveModal(null);
    },
    [view, activeTabId, isMobileSidebarOpen, isMobileRightSidebarOpen, activeModal]
  );

  // Navigate to a specific note
  const navigateToNote = useCallback(
    (newNoteId: string | null) => {
      const isSameNote = newNoteId === activeTabId && view === 'vault';

      if (!isPopStateNavigatingRef.current && (!isSameNote || isMobileSidebarOpen || isMobileRightSidebarOpen || activeModal)) {
        currentSeqRef.current += 1;
        const nextEntry: NavigationHistoryEntry = {
          view: 'vault',
          activeTabId: newNoteId,
          isMobileSidebarOpen: false,
          isMobileRightSidebarOpen: false,
          activeModal: null,
          seq: currentSeqRef.current,
        };
        safePushState(nextEntry);
      }

      setView('vault');
      onSelectTabId(newNoteId);
      setIsMobileSidebarOpen(false);
      setIsMobileRightSidebarOpen(false);
      setActiveModal(null);
    },
    [activeTabId, view, isMobileSidebarOpen, isMobileRightSidebarOpen, activeModal, onSelectTabId]
  );

  // Open Left Mobile Sidebar
  const openMobileSidebar = useCallback(() => {
    if (isMobileSidebarOpen) return;

    if (!isPopStateNavigatingRef.current) {
      currentSeqRef.current += 1;
      const nextEntry: NavigationHistoryEntry = {
        view,
        activeTabId,
        isMobileSidebarOpen: true,
        isMobileRightSidebarOpen: false,
        activeModal: null,
        seq: currentSeqRef.current,
      };
      safePushState(nextEntry);
    }

    setIsMobileSidebarOpen(true);
    setIsMobileRightSidebarOpen(false);
  }, [isMobileSidebarOpen, view, activeTabId]);

  // Close Left Mobile Sidebar
  const closeMobileSidebar = useCallback(() => {
    if (!isMobileSidebarOpen) return;

    if (window.history.state?.isMobileSidebarOpen) {
      safeHistoryBack();
    } else {
      setIsMobileSidebarOpen(false);
    }
  }, [isMobileSidebarOpen]);

  // Open Right Mobile Sidebar
  const openMobileRightSidebar = useCallback(() => {
    if (isMobileRightSidebarOpen) return;

    if (!isPopStateNavigatingRef.current) {
      currentSeqRef.current += 1;
      const nextEntry: NavigationHistoryEntry = {
        view,
        activeTabId,
        isMobileSidebarOpen: false,
        isMobileRightSidebarOpen: true,
        activeModal: null,
        seq: currentSeqRef.current,
      };
      safePushState(nextEntry);
    }

    setIsMobileRightSidebarOpen(true);
    setIsMobileSidebarOpen(false);
  }, [isMobileRightSidebarOpen, view, activeTabId]);

  // Close Right Mobile Sidebar
  const closeMobileRightSidebar = useCallback(() => {
    if (!isMobileRightSidebarOpen) return;

    if (window.history.state?.isMobileRightSidebarOpen) {
      safeHistoryBack();
    } else {
      setIsMobileRightSidebarOpen(false);
    }
  }, [isMobileRightSidebarOpen]);

  // Open Modal with Back-Stack support
  const openModal = useCallback(
    (modalId: string) => {
      if (activeModal === modalId) return;

      if (!isPopStateNavigatingRef.current) {
        currentSeqRef.current += 1;
        const nextEntry: NavigationHistoryEntry = {
          view,
          activeTabId,
          isMobileSidebarOpen,
          isMobileRightSidebarOpen,
          activeModal: modalId,
          seq: currentSeqRef.current,
        };
        safePushState(nextEntry);
      }

      setActiveModal(modalId);
    },
    [activeModal, view, activeTabId, isMobileSidebarOpen, isMobileRightSidebarOpen]
  );

  // Close Modal with Back-Stack support
  const closeModal = useCallback(() => {
    if (!activeModal) return;

    if (window.history.state?.activeModal) {
      safeHistoryBack();
    } else {
      setActiveModal(null);
    }
  }, [activeModal]);

  const goBack = useCallback(() => {
    safeHistoryBack();
  }, []);

  return (
    <NavigationContext.Provider
      value={{
        view,
        setView,
        navigateView,
        activeTabId,
        navigateToNote,
        isMobileSidebarOpen,
        setIsMobileSidebarOpen,
        openMobileSidebar,
        closeMobileSidebar,
        isMobileRightSidebarOpen,
        setIsMobileRightSidebarOpen,
        openMobileRightSidebar,
        closeMobileRightSidebar,
        activeModal,
        openModal,
        closeModal,
        goBack,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = (): NavigationContextType => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};
