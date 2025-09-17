/*
 * @Date: 2025-08-31
 * @LastEditors: vhko
 * @LastEditTime: 2025-09-15
 * @FilePath: /LogUp/components/Header.tsx
 * Helllllloo!
 */
import ThemeToggle from './theme/ThemeToggle';
// import ThemeTest from './theme/ThemeTest';

export default function Header() {
    return (
        <>
            <header className="bg-background sticky top-0 border-b border-gray-200 dark:border-gray-700 dark:bg-gray-900">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="py-2 flex items-center justify-between">
                        <h1 className="text-xl font-bold dark:text-white">LogUp!</h1>
                        <ThemeToggle />
                    </div>
                </div>
            </header>
            {/* <ThemeTest /> */}
        </>
    );
}
