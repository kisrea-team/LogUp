'use client';

import { useTheme } from './ThemeContext';

export default function ThemeTest() {
  const { theme, setTheme, currentTheme } = useTheme();

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-lg font-semibold">主题测试</h2>
      <div className="space-y-2">
        <p>当前主题: {theme}</p>
        <p>应用的主题: {currentTheme}</p>
        <div className="flex gap-2">
          <button
            onClick={() => setTheme('light')}
            className="px-3 py-2 bg-blue-500 text-white rounded"
          >
            浅色模式
          </button>
          <button
            onClick={() => setTheme('dark')}
            className="px-3 py-2 bg-gray-800 text-white rounded"
          >
            深色模式
          </button>
          <button
            onClick={() => setTheme('auto')}
            className="px-3 py-2 bg-green-500 text-white rounded"
          >
            自动模式
          </button>
        </div>
      </div>
      <div className="p-4 theme-test-bg theme-test-text border rounded">
        <p>这是测试文本，用来验证主题切换效果。</p>
        <p className="bg-blue-500 dark:bg-blue-700 text-white p-2 rounded mt-2">
          这个div使用了Tailwind的dark:前缀
        </p>
      </div>
    </div>
  );
}