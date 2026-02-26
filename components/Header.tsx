/*
 * @Date: 2025-08-31
 * @LastEditors: vhko
 * @LastEditTime: 2026-01-21
 * @FilePath: /LogUp/components/Header.tsx
 * Helllllloo!
 */
import { DownMenu } from './utils/DownMenu';
import ThemeToggle from './theme/ThemeToggle';
import { Search } from 'lucide-react';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
export default function Header() {
    return (
        <header className="bg-background sticky top-0 z-30 border-b border-gray-100 dark:border-gray-800 dark:bg-gray-900">
            <div className="max-w-layout mx-auto">
                <div className="py-2 px-4 sm:px-6 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <h1 className="text-2xl font-bold dark:text-white shrink-0">LogUp</h1>
                        <div className="hidden sm:flex">
                            <InputGroup className="flex rounded-[999] bg-trans border-transparent border w-[160px] h-8 dark:bg-black">
                                <InputGroupInput placeholder="搜索" className='text-black dark:text-white' />
                                <InputGroupAddon>
                                    <Search/>
                                </InputGroupAddon>
                            </InputGroup>
                        </div>
                    </div>
                    <div className="hidden sm:flex">
                        <DownMenu />
                    </div>
                    <ThemeToggle />
                </div>
            </div>
        </header>
    );
}
