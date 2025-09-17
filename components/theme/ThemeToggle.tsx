/*
 * @Date: 2025-09-15
 * @LastEditors: vhko
 * @LastEditTime: 2025-09-16
 * @FilePath: /LogUp/components/theme/ThemeToggle.tsx
 * Helllllloo!
 */
'use client';

import { useTheme } from './ThemeContext';
import { Button } from '../ui/button';
import { Sun, Moon, Monitor } from 'lucide-react';

export default function ThemeToggle() {
    const { theme, setTheme, currentTheme } = useTheme();
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

    // 明暗模式切换按钮
    const toggleLightDark = () => {
        if (theme === 'auto') {
            // 如果当前是自动模式，切换到手动模式并设置为当前实际主题的相反模式
            setTheme(currentTheme === 'light' ? 'dark' : 'light');
        } else {
            // 如果当前是手动模式，在明暗之间切换
            setTheme(theme === 'light' ? 'dark' : 'light');
        }
    };

    // 获取自动模式按钮的图标和状态
    const getAutoButtonContent = () => {
        const isAuto = theme === 'auto';
        return {
            icon: <Monitor className="h-5 w-5" />,
            isActive: isAuto,
            title: isAuto ? '自动模式 (已启用)' : '自动模式',
        };
    };

    // 获取明暗切换按钮的图标和状态
    const getLightDarkButtonContent = () => {
        const isAuto = theme === 'auto';
        const actualTheme = isAuto ? currentTheme : theme;

        return {
            icon:
                actualTheme === 'light' ? (
                    <Sun className="size-6" />
                ) : (
                    <Moon className="size-6" />
                ),
            isActive: !isAuto,
            title: isAuto
                ? `当前: ${actualTheme === 'light' ? '浅色' : '深色'}`
                : `手动模式: ${actualTheme === 'light' ? '浅色' : '深色'}`,
        };
    };
    const autoButton = getAutoButtonContent();
    const lightDarkButton = getLightDarkButtonContent();

    return (
        <div className="flex gap-1">
            {/* 自动模式按钮 */}
            {/* <Button
                onClick={toggleAutoMode}
                variant="ghost"
                size="sm"
                className={`hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 ${
                    autoButton.isActive ? 'bg-gray-200 dark:bg-gray-600' : ''
                }`}
                title={autoButton.title}
            >
                {autoButton.icon}
            </Button> */}

            {/* 明暗模式切换按钮 */}
            <Button
                onClick={toggleLightDark}
                variant="ghost"
                size="sm"
                className={`hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 ${
                    lightDarkButton.isActive ? '' : ''
                }`}
                title={lightDarkButton.title}
            >
                {lightDarkButton.icon}
            </Button>
        </div>
    );
}
