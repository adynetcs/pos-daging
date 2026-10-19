import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

type ToastJenis = 'sukses' | 'gagal' | 'peringatan' | 'info';
interface Toast { id: number; jenis: ToastJenis; judul: string; pesan?: string }

const Ctx = createContext<(t: Omit<Toast, 'id'>) => void>(() => {});
export const useToast = () => useContext(Ctx);

const gaya: Record<ToastJenis, { ikon: typeof Info; kelas: string }> = {
  sukses: { ikon: CheckCircle2, kelas: 'text-emerald-600' },
  gagal: { ikon: XCircle, kelas: 'text-red-600' },
  peringatan: { ikon: AlertTriangle, kelas: 'text-amber-600' },
  info: { ikon: Info, kelas: 'text-sky-600' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [list, setList] = useState<Toast[]>([]);
  const tutup = (id: number) => setList((l) => l.filter((x) => x.id !== id));
  const tampil = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Date.now() + Math.random();
    setList((l) => [...l.slice(-3), { ...t, id }]);
    setTimeout(() => tutup(id), 4200);
  }, []);
  return (
    <Ctx.Provider value={tampil}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 z-[70] flex flex-col items-center gap-2 px-3 lg:left-auto lg:right-6 lg:items-end"
        style={{ top: 'calc(var(--aman-atas) + var(--tinggi-header) + 8px)' }} aria-live="polite">
        {list.map((t) => {
          const G = gaya[t.jenis];
          return (
            <div key={t.id} role="status" className="toast-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-gray-200 bg-white p-3.5 shadow-pop">
              <G.ikon className={`mt-0.5 h-5 w-5 shrink-0 ${G.kelas}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900">{t.judul}</p>
                {t.pesan && <p className="mt-0.5 text-[13px] text-gray-600">{t.pesan}</p>}
              </div>
              <button onClick={() => tutup(t.id)} className="rounded p-0.5 text-gray-400 hover:text-gray-700" aria-label="Tutup notifikasi"><X className="h-4 w-4" /></button>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}
