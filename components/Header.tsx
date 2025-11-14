/*
 * @Date: 2025-08-31
 * @LastEditors: vhko
 * @LastEditTime: 2025-11-14
 * @FilePath: /LogUp/components/Header.tsx
 * Helllllloo!
 */
import ThemeToggle from './theme/ThemeToggle';
import { ChevronDown, ChevronLeft, Search } from 'lucide-react';
import { Input } from './ui/input';
import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupInput,
    InputGroupText,
    InputGroupTextarea,
} from '@/components/ui/input-group';
// import ThemeTest from './theme/ThemeTest';
const data = [
    { id: 1, name: '热门项目' },
    { id: 2, name: '近日项目' },
    { id: 3, name: '分类' },
    { id: 4, name: '关于我们' },
];

export default function Header() {
    return (
        <>
            <header className="bg-background sticky top-0 dark:border-gray-700 dark:bg-gray-900">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="py-2 flex items-center justify-between">
                        <h1 className="text-xl font-bold dark:text-white">LogUp!</h1>
                        <InputGroup className="flex rounded-[999] bg-trans border-transparent border w-[160px] h-8">
                            <InputGroupInput placeholder="搜索" />
                            <InputGroupAddon>
                                <Search />
                            </InputGroupAddon>
                        </InputGroup>
                        <div className="flex gap-3 transition-transform duration-1000">
                            {data.map((item) => (
                                <div key={item.id} className="flex group">
                                    <h1>{item.name}</h1>
                                    <ChevronLeft className="transition-transform duration-200 block group-hover:-rotate-90" />
                                    {/* <ChevronDown className="transition-transform duration-1000 hidden group-hover:block" /> */}
                                </div>
                            ))}
                        </div>
                        <ThemeToggle />
                    </div>
                </div>
            </header>
            {/* <ThemeTest /> */}
        </>
    );
}
