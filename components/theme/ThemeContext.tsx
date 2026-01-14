'use client';

import React, { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react';

type Theme = 'light' | 'dark' | 'auto';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  currentTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'auto';
    const savedTheme = window.localStorage.getItem('theme') as Theme | null;
    return savedTheme || 'auto';
  });

  const systemTheme = useSyncExternalStore(
    (callback) => {
      if (typeof window === 'undefined') return () => { };
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', callback);
      return () => mediaQuery.removeEventListener('change', callback);
    },
    () => {
      if (typeof window === 'undefined') return 'light' as const;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    },
    () => 'light' as const
  );

  const currentTheme: 'light' | 'dark' = theme === 'auto' ? systemTheme : theme;

  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove('manual-light', 'manual-dark');
    if (theme !== 'auto') html.classList.add(`manual-${theme}`);
    window.localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, currentTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
