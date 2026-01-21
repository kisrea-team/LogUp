/*
 * @Date: 2025-09-15
 * @LastEditors: vhko
 * @LastEditTime: 2026-01-21
 * @FilePath: /LogUp/components/theme/ThemeToggle.tsx
 * Helllllloo!
 */
'use client';
import { useState } from 'react';
import { useTheme } from './ThemeContext';
import { Button } from '../ui/button';
import { Sun, Moon, Baseline } from 'lucide-react';

export default function ThemeToggle() {
    const { theme, setTheme, currentTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    if (!mounted) {
        return null;
    }
    // 自动模式按钮
    const toggleAutoMode = () => {
        if (theme === 'auto') {
            // 如果当前是自动模式，切换到手动模式（使用当前实际应用的主题）
            setTheme(currentTheme);
        } else {
            // 如果当前是手动模式，切换到自动模式
            setTheme('auto');
        }
    };

    // 主题切换按钮 (auto -> light -> dark -> auto)
    const toggleTheme = () => {
        if (theme === 'auto') {
            setTheme('light');
        } else if (theme === 'light') {
            setTheme('dark');
        } else {
            setTheme('auto');
        }
    };

    // 获取自动模式按钮的图标和状态
    const getAutoButtonContent = () => {
        const isAuto = theme === 'auto';
        return {
            icon: <Baseline className="h-5 w-5" />,
            isActive: isAuto,
            title: isAuto ? '自动模式 (已启用)' : '自动模式',
        };
    };

    // 获取主题切换按钮的图标和状态
    const getThemeButtonContent = () => {
        const actualTheme = theme === 'auto' ? currentTheme : theme;
        let icon;
        let title;

        if (theme === 'auto') {
            icon = <Baseline className="size-6" />;
            title = `自动模式: ${actualTheme === 'light' ? '浅色' : '深色'}`;
        } else if (theme === 'light') {
            icon = <Sun className="size-6" />;
            title = '手动模式: 浅色';
            document.documentElement.classList.remove('dark');
        } else {
            icon = <Moon className="size-6" />;
            title = '手动模式: 深色';
            document.documentElement.classList.add('dark');
        }

        return {
            icon,
            isActive: true,
            title,
        };
    };
    // 主题按钮内容
    const themeButton = getThemeButtonContent();

    return (
        <div className="flex gap-1">
            {/* 主题切换按钮 */}
            <Button
                onClick={toggleTheme}
                variant="ghost"
                size="sm"
                className={`hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 ${
                    themeButton.isActive ? 'dark:bg-gray-700' : ''
                }`}
                style={{
                    backgroundColor: 'transparent',
                }}
                title={themeButton.title}
            >
                {themeButton.icon}
            </Button>
        </div>
    );
}
