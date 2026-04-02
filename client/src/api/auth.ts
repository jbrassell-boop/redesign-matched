import apiClient, { setToken, removeToken } from './client';

export interface LoginResponse {
  token: string;
  username: string;
  role: string;
  expiresAt: string;
}

export const login = async (username: string, password: string): Promise<LoginResponse> => {
  const { data } = await apiClient.post<LoginResponse>('/auth/login', { username, password });
  setToken(data.token);
  return data;
};

export const logout = (): void => {
  removeToken();
  window.location.href = '/login';
};
