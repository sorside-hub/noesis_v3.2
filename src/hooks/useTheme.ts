import { useState, useEffect } from 'react';
import { db } from '../lib/db';

export type ThemeMode = 'light' | 'dark' | 'system';
const STORAGE_KEY_THEME = 'noesis_theme_mode';

export const useTheme = () => {
  const [theme, setThemeState] = useState<ThemeMode>('system');

  // Load from Dexie on mount
  useEffect(() => {
    db.settings.get(STORAGE_KEY_THEME).then((setting) => {
      if (setting && (setting.value === 'light' || setting.value === 'dark' || setting.value === 'system')) {
        setThemeState(setting.value);
      }
    });
  }, []);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    db.settings.put({ key: STORAGE_KEY_THEME, value: newTheme });
  };

  useEffect(() => {
    const root = document.documentElement;
    
    const applyTheme = () => {
      root.classList.remove('light', 'dark');
      if (theme === 'system') {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        root.classList.add(isDark ? 'dark' : 'light');
      } else {
        root.classList.add(theme);
      }
    };

    applyTheme();

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => applyTheme();
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [theme]);

  return { theme, setTheme };
};
