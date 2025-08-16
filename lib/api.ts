// Utility functions for API calls with CORS headers
export const apiFetch = async (url: string, options: RequestInit = {}) => {
    // If URL starts with http, use it directly (for external APIs)
    // Otherwise, treat it as a relative path that will be handled by Next.js rewrites
    const fullUrl = url.startsWith('http') ? url : url;
    
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

// Get API base URL from environment or use empty string for relative paths
export const getApiBaseUrl = () => {
    return ''; // Use relative paths for Next.js rewrites
};