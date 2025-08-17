/*
 * @Date: 2025-08-17
 * @LastEditors: vhko
 * @LastEditTime: 2025-08-17
 * @FilePath: /LogUp/components/Loading.tsx
 * Helllllloo!
 */
'use client';

import * as React from 'react';

import { Progress } from '@/components/ui/progress';

interface LoadingProps {
    progress: number;
}

const Loading: React.FC<LoadingProps> = ({ progress }) => {
    return (
        <div className='fixed inset-0 flex items-center justify-center bg-white/70 z-50'>
            <Progress value={progress} className="flex items-center w-[33vh]" />
        </div>
    );
};
export default Loading;
