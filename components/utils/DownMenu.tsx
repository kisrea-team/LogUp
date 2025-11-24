/*
 * @Date: 2025-11-18
 * @LastEditors: vhko
 * @LastEditTime: 2025-11-23
 * @FilePath: /LogUp/components/utils/downMenu.tsx
 * Helllllloo!
 */
'use client';
import { useRef } from 'react';
import {
    Menubar,
    MenubarItem,
    MenubarMenu,
    MenubarContent,
    MenubarTrigger,
} from '@/components/ui/menubar';
import { ChevronLeft } from 'lucide-react';
import { classify } from '@/components/utils/classify';

const apple = (
    <>
        {classify.map((item: any) => (
            <MenubarItem key={item.key}>
                <item.icon />
                <span>{item.label}</span>
            </MenubarItem>
        ))}
    </>
);

const Menudata = [
    { id: 1, name: '热门项目', menucontent: apple },
    { id: 2, name: '近日项目' },
    { id: 3, name: '分类' },
    { id: 4, name: '关于我们' },
];

export function DownMenu() {
    return (
        <div className="flex gap-3 transition-transform duration-1000">
            {Menudata.map((item: any) => {
                // ❗ 每个菜单单独创建自己的 ref
                const triggerRef = useRef<HTMLButtonElement | null>(null);

                return (
                    <Menubar key={item.id} className="flex group">
                        <MenubarMenu>
                            <MenubarTrigger
                                ref={triggerRef}
                                onMouseEnter={() => {
                                    triggerRef.current?.click();
                                }}
                            >
                                {item.name}
                            </MenubarTrigger>

                            <ChevronLeft className="transition-transform duration-200 block group-hover:-rotate-90" />

                            <MenubarContent className="bg-background min-w-[6rem] classify--items">
                                {item.menucontent}
                            </MenubarContent>
                        </MenubarMenu>
                    </Menubar>
                );
            })}
        </div>
    );
}
