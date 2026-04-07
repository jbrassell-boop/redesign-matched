import axios from 'axios';

const TOKEN_KEY = 'tsi_token';

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string): void => localStorage.setItem(TOKEN_KEY, token);
export const removeToken = (): void => localStorage.removeItem(TOKEN_KEY);

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      removeToken();
      window.location.href = '/login';
    }
    const msg = error.response?.data?.error
      || error.response?.data?.message
      || error.response?.data?.detail
      || (typeof error.response?.data === 'string' ? error.response.data : null)
      || error.message
      || 'An unexpected error occurred';
    return Promise.reject(new Error(msg));
  }
);

export default apiClient;
