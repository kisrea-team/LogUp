'use client';
import { motion } from 'framer-motion';

// 列表/表格行：交错淡入
export function MotionList({
  children,
  className = '',
  stagger = 0.05,
}: {
  children: React.ReactNode;
  className?: string;
  stagger?: number;
}) {
  return (
    <div className={className}>
      {Array.isArray(children)
        ? children.map((child, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * stagger, ease: 'easeOut' }}
            >
              {child}
            </motion.div>
          ))
        : children}
    </div>
  );
}

export default MotionList;
