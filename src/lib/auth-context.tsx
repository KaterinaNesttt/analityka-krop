import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, clearTokens, getAccess, setTokens } from './api';

export type Role = 'superuser' | 'admin' | 'moderator' | 'user';
export type UserStatus = 'pending' | 'approved' | 'blocked';

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  status: UserStatus;
}

interface AuthCtx {
  user: AuthUser | null;
  loading: boolean;
  apiUnreachable: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<{ status: UserStatus }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiUnreachable, setApiUnreachable] = useState(false);

  const loadMe = async () => {
    if (!getAccess()) { setLoading(false); return; }
    try {
      const data = await api<{ user: AuthUser }>('/api/auth/me');
      setUser(data.user);
      setApiUnreachable(false);
    } catch (e: any) {
      if (e?.message?.includes('Failed to fetch') || e?.name === 'TypeError') {
        setApiUnreachable(true);
      } else {
        clearTokens();
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadMe(); }, []);

  const login = async (email: string, password: string) => {
    try {
      const data = await api<{ access: string; refresh: string; user: AuthUser }>(
        '/api/auth/login',
        { method: 'POST', body: { email, password }, auth: false },
      );
      setTokens(data.access, data.refresh);
      setUser(data.user);
      setApiUnreachable(false);
    } catch (e: any) {
      if (e?.message?.includes('Failed to fetch')) {
        setApiUnreachable(true);
        throw new Error('API недоступний. Перевірте VITE_API_URL і деплой Worker.');
      }
      throw e;
    }
  };

  const register = async (email: string, password: string, name?: string) => {
    const data = await api<{ status: UserStatus }>(
      '/api/auth/register',
      { method: 'POST', body: { email, password, name }, auth: false },
    );
    return { status: data.status };
  };

  const logout = async () => {
    const rt = localStorage.getItem('ak.refresh');
    try { await api('/api/auth/logout', { method: 'POST', body: { refresh: rt }, auth: false }); } catch { setApiUnreachable(true); }
    clearTokens();
    setUser(null);
  };

  return (
    <Ctx.Provider value={{ user, loading, apiUnreachable, login, register, logout, refresh: loadMe }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth must be used inside AuthProvider');
  return c;
}
