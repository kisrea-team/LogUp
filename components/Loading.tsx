/*
 * @Date: 2025-08-17
 * @LastEditors: vhko
 * @LastEditTime: 2025-08-17
 * @FilePath: /LogUp/components/Loading.tsx
 * Helllllloo!
 */
'use client';

import * as React from 'react';
import { motion } from 'framer-motion';

interface LoadingProps {
    progress: number;
}

const Loading: React.FC<LoadingProps> = ({ progress }) => {
    return (
        <motion.div
            className="fixed inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
        >
            <div className="flex flex-col items-center">
                <motion.div
                    className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "linear"
                    }}
                />
                <motion.div
                    className="mt-4 w-64"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">加载中...</span>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                        <motion.div
                            className="bg-blue-600 h-2.5 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                        />
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
};

export default Loading;
