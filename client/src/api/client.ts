import axios from 'axios';

const TOKEN_KEY = 'tsi_token';
// Mirrors STORAGE_KEY in hooks/useServiceLocation.ts. The hook persists the
// active banner selection to localStorage on every change; the interceptor
// below reads it back so every API call carries the current location.
const SERVICE_LOCATION_KEY = 'tsi_svcLocation';

export const getToken = (): string | null => sessionStorage.getItem(TOKEN_KEY);
export const setToken = (token: string): void => sessionStorage.setItem(TOKEN_KEY, token);
export const removeToken = (): void => sessionStorage.removeItem(TOKEN_KEY);

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;

  // Send the user's active service location on every request. Backend
  // location-scoped endpoints read this via ControllerBase.GetActiveServiceLocation().
  // Mirrors cloud's canonical wire (Steve's f1797dd).
  try {
    const loc = localStorage.getItem(SERVICE_LOCATION_KEY);
    if (loc) config.headers['X-Service-Location'] = loc;
  } catch { /* localStorage may be unavailable (SSR, private browsing) */ }

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
