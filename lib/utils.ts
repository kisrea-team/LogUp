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
