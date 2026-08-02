import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 退出登录：调用服务端登出接口清除 HttpOnly 会话 cookie
export async function clearAdminAuth(): Promise<void> {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch (e) {
    console.error('退出登录失败:', e);
  }
}

export function formatRelativeTime(input: string | number | Date): string {
  const date = input instanceof Date ? input : new Date(input);
  const time = date.getTime();
  if (!Number.isFinite(time)) return String(input ?? '');

  const now = Date.now();
  const diffMs = now - time;

  const absMs = Math.abs(diffMs);
  const future = diffMs < 0;

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const month = 30 * day;
  const year = 365 * day;

  const format = (value: number, unit: string) => `${value}${unit}${future ? '后' : '前'}`;

  if (absMs < 30 * 1000) return future ? '马上' : '刚刚';
  if (absMs < hour) return format(Math.max(1, Math.floor(absMs / minute)), '分钟');
  if (absMs < day) return format(Math.floor(absMs / hour), '小时');
  if (absMs < month) return format(Math.floor(absMs / day), '天');
  if (absMs < year) return format(Math.floor(absMs / month), '个月');
  return format(Math.floor(absMs / year), '年');
}
