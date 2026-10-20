import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, ApiError, type PenggunaSesi } from '@/services/api';

interface Auth {
  pengguna: PenggunaSesi | null;
  memuat: boolean;
  galat: string | null;
  login: (akun: string, pin: string) => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<Auth | null>(null);
export const useAuth = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth harus di dalam AuthProvider');
  return c;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [pengguna, setPengguna] = useState<PenggunaSesi | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState<string | null>(null);

  useEffect(() => {
    api.me()
      .then(setPengguna)
      .catch((e: ApiError) => { if (e.status !== 401) setGalat(e.message); })
      .finally(() => setMemuat(false));
  }, []);

  const login = useCallback(async (akun: string, pin: string) => {
    setGalat(null);
    setPengguna(await api.login(akun, pin));
  }, []);

  const logout = useCallback(async () => {
    try { await api.logout(); } catch { /* tetap keluar di sisi browser */ }
    setPengguna(null);
  }, []);

  return <Ctx.Provider value={{ pengguna, memuat, galat, login, logout }}>{children}</Ctx.Provider>;
}
