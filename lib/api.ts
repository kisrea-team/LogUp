// API 请求工具
export const apiFetch = async (url: string, options: RequestInit = {}) => {
  // 相对路径以 /api 前缀解析（Next.js route handlers）
  const fullUrl = url.startsWith('http') ? url : `/api${url}`;

  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  const mergedOptions: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  return fetch(fullUrl, mergedOptions);
};
