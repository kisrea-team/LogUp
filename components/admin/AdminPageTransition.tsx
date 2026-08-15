'use client';
import { motion } from 'framer-motion';

// 页面切换过渡：每次路由变化淡入上移
export default function AdminPageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="p-4 sm:p-6 lg:p-8"
    >
      {children}
    </motion.div>
  );
}
