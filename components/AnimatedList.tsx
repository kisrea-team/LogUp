'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface AnimatedListProps {
    children: React.ReactNode;
    className?: string;
}

const AnimatedList: React.FC<AnimatedListProps> = ({ children, className = '' }) => {
    return (
        <motion.div
            className={className}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
        >
            {children}
        </motion.div>
    );
};

export default AnimatedList;