'use client';

import React, { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark' | 'auto';

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    currentTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<Theme>(() => {
        if (typeof window === 'undefined') return 'auto';
        return (localStorage.getItem('theme') as Theme) || 'auto';
    });

    const systemTheme = useSyncExternalStore<'light' | 'dark'>(
        (callback) => {
            if (typeof window === 'undefined') return () => {};
            const media = window.matchMedia('(prefers-color-scheme: dark)');
            media.addEventListener('change', callback);
            return () => media.removeEventListener('change', callback);
        },
        () => (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
        () => 'light',
    );

    const currentTheme: 'light' | 'dark' = theme === 'auto' ? systemTheme : theme;

    /**
     * 唯一职责：控制 .dark
     */
    useEffect(() => {
        const html = document.documentElement;

        html.classList.remove('dark');

        if (currentTheme === 'dark') {
            html.classList.add('dark');
        }

        localStorage.setItem('theme', theme);
    }, [theme, currentTheme]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme, currentTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) {
        throw new Error('useTheme must be used within ThemeProvider');
    }
    return ctx;
}
