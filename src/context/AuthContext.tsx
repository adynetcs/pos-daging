import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, ApiError, IS_DEMO, type PenggunaSesi } from '@/services/api';

interface Auth {
  pengguna: PenggunaSesi | null;
  memuat: boolean;
  galat: string | null;
  login: (akun: string, pin: string) => Promise<void>;
  logout: () => Promise<void>;
}

const PENGGUNA_DEMO: PenggunaSesi = { id_pengguna: 'demo', nama: 'Ady', username: 'ady', email: 'demo@contoh.id', peran: 'pemilik' };
const Ctx = createContext<Auth | null>(null);
export const useAuth = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth harus di dalam AuthProvider');
  return c;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [pengguna, setPengguna] = useState<PenggunaSesi | null>(IS_DEMO ? PENGGUNA_DEMO : null);
  const [memuat, setMemuat] = useState(!IS_DEMO);
  const [galat, setGalat] = useState<string | null>(null);

  useEffect(() => {
    if (IS_DEMO) return;
    api.me()
      .then(setPengguna)
      .catch((e: ApiError) => { if (e.status !== 401) setGalat(e.message); })
      .finally(() => setMemuat(false));
  }, []);

  const login = useCallback(async (akun: string, pin: string) => {
    setGalat(null);
    const u = await api.login(akun, pin);
    setPengguna(u);
  }, []);

  const logout = useCallback(async () => {
    if (!IS_DEMO) { try { await api.logout(); } catch { /* tetap keluar di sisi browser */ } }
    setPengguna(IS_DEMO ? PENGGUNA_DEMO : null);
  }, []);

  return <Ctx.Provider value={{ pengguna, memuat, galat, login, logout }}>{children}</Ctx.Provider>;
}
