/*
 * @Date: 2025-08-31
 * @LastEditors: vhko
 * @LastEditTime: 2025-11-24
 * @FilePath: /LogUp/components/Header.tsx
 * Helllllloo!
 */
import { DownMenu } from './utils/DownMenu';
import ThemeToggle from './theme/ThemeToggle';
import { Search } from 'lucide-react';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
export default function Header() {
    return (
        <header className="bg-background sticky top-0 dark:border-gray-700 dark:bg-gray-900">
            <div className="max-w-layout mx-auto">
                <div className="py-2 flex items-center justify-between">
                    <div className="flex gap-1">
                        <h1 className="text-2xl font-bold dark:text-white">LogUp</h1>
                        <InputGroup className="flex rounded-[999] bg-trans border-transparent border w-[160px] h-8">
                            <InputGroupInput placeholder="搜索" />
                            <InputGroupAddon>
                                <Search />
                            </InputGroupAddon>
                        </InputGroup>
                    </div>
                    <DownMenu />
                    <ThemeToggle />
                </div>
            </div>
        </header>
    );
}
