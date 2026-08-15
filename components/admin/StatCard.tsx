'use client';
import { motion } from 'framer-motion';

// 统计卡片：淡入 + hover 抬升
export function StatCard({
  label,
  value,
  sub,
  delay = 0,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: 'easeOut' }}
      whileHover={{ y: -3 }}
      className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
    >
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-gray-900 tabular-nums leading-tight">{value}</p>
      {sub && <p className="mt-1.5 text-xs text-gray-400">{sub}</p>}
    </motion.div>
  );
}

export default StatCard;
