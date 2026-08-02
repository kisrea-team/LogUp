'use client';
import { motion } from 'framer-motion';

// 统一区块卡片：淡入上移 + hover 微抬升
export function AdminCard({
  title,
  description,
  children,
  className = '',
  delay = 0,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: 'easeOut' }}
      whileHover={{ y: -2 }}
      className={`rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md ${className}`}
    >
      {title && (
        <div className="px-6 py-4 border-b border-gray-100 flex items-baseline justify-between">
          <div>
            {title && <h2 className="text-base font-semibold text-gray-900">{title}</h2>}
            {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
          </div>
        </div>
      )}
      {children}
    </motion.section>
  );
}

export default AdminCard;
