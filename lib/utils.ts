import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 检查管理员是否已登录
export function checkAdminAuth(): boolean {
  // 检查localStorage（1天过期）
  const localAuth = localStorage.getItem('adminAuth');
  if (localAuth) {
    try {
      const authData = JSON.parse(localAuth);
      if (authData.isLoggedIn && authData.loginTime) {
        const loginTime = new Date(authData.loginTime);
        const now = new Date();
        const diffHours = (now.getTime() - loginTime.getTime()) / (1000 * 60 * 60);
        
        // 如果超过1天（24小时），清除认证数据
        if (diffHours > 24) {
          localStorage.removeItem('adminAuth');
          return false;
        }
        return true;
      }
    } catch (e) {
      // 如果解析失败，清除无效数据
      localStorage.removeItem('adminAuth');
    }
  }

  // 检查sessionStorage（3小时过期）
  const sessionAuth = sessionStorage.getItem('adminAuth');
  if (sessionAuth) {
    try {
      const authData = JSON.parse(sessionAuth);
      if (authData.isLoggedIn && authData.loginTime) {
        const loginTime = new Date(authData.loginTime);
        const now = new Date();
        const diffHours = (now.getTime() - loginTime.getTime()) / (1000 * 60 * 60);
        
        // 如果超过3小时，清除认证数据
        if (diffHours > 3) {
          sessionStorage.removeItem('adminAuth');
          return false;
        }
        return true;
      }
    } catch (e) {
      // 如果解析失败，清除无效数据
      sessionStorage.removeItem('adminAuth');
    }
  }

  // 检查cookie（备用方案）
  const cookies = document.cookie.split(';');
  const adminCookie = cookies.find(cookie => cookie.trim().startsWith('adminLoggedIn='));
  if (adminCookie && adminCookie.split('=')[1] === 'true') {
    return true;
  }

  return false;
}

// 清除所有认证数据
export function clearAdminAuth(): void {
  localStorage.removeItem('adminAuth');
  sessionStorage.removeItem('adminAuth');
  document.cookie = 'adminLoggedIn=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
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
