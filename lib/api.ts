// Utility functions for API calls with CORS headers
export const apiFetch = async (url: string, options: RequestInit = {}) => {
    const defaultHeaders = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
    };

    const mergedOptions: RequestInit = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers,
        },
    };

    return fetch(url, mergedOptions);
};

// Get API base URL from environment or use empty string for relative paths
export const getApiBaseUrl = () => {
    return process.env.NEXT_PUBLIC_API_BASE_URL || '';
};