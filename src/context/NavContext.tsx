import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { PageKey } from '@/types';

const HALAMAN: PageKey[] = ['dashboard', 'kasir', 'pesanan', 'produk', 'stok', 'pembelian', 'pelanggan', 'supplier', 'keuangan', 'laporan', 'pengaturan'];
const dariHash = (): PageKey => {
  const h = window.location.hash.replace('#/', '') as PageKey;
  return HALAMAN.includes(h) ? h : 'dashboard';
};

interface Nav { halaman: PageKey; buka: (h: PageKey) => void }
const Ctx = createContext<Nav>({ halaman: 'dashboard', buka: () => {} });
export const useNav = () => useContext(Ctx);

/** Router hash sederhana (#/kasir) — aman untuk hosting statis seperti Vercel. */
export function NavProvider({ children }: { children: ReactNode }) {
  const [halaman, setHalaman] = useState<PageKey>(dariHash);
  useEffect(() => {
    const f = () => setHalaman(dariHash());
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);
  const buka = (h: PageKey) => {
    if (h === halaman) return;
    try { window.location.hash = `/${h}`; } catch { /* lingkungan tanpa hash */ }
    setHalaman(h);
    window.scrollTo({ top: 0 });
  };
  return <Ctx.Provider value={{ halaman, buka }}>{children}</Ctx.Provider>;
}
