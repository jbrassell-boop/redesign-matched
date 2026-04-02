import { useState, useCallback } from 'react';
import { login as apiLogin, logout as apiLogout, type LoginResponse } from '../api/auth';
import { getToken } from '../api/client';

interface AuthState {
  token: string | null;
  username: string | null;
  role: string | null;
}

export const useAuth = () => {
  const [auth, setAuth] = useState<AuthState>(() => ({
    token: getToken(),
    username: localStorage.getItem('tsi_username'),
    role: localStorage.getItem('tsi_role'),
  }));

  const login = useCallback(async (username: string, password: string): Promise<void> => {
    const data: LoginResponse = await apiLogin(username, password);
    localStorage.setItem('tsi_username', data.username);
    localStorage.setItem('tsi_role', data.role);
    setAuth({ token: data.token, username: data.username, role: data.role });
  }, []);

  const logout = useCallback((): void => {
    localStorage.removeItem('tsi_username');
    localStorage.removeItem('tsi_role');
    setAuth({ token: null, username: null, role: null });
    apiLogout();
  }, []);

  return {
    isAuthenticated: !!auth.token,
    username: auth.username,
    role: auth.role,
    login,
    logout,
  };
};
