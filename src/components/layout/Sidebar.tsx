import { LogOut, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNav } from '@/context/NavContext';
import { menuUntuk } from './menu';
import { Logo } from './Logo';

const GRUP = { operasional: 'Operasional', data: 'Data & persediaan', bisnis: 'Bisnis' } as const;

const LABEL_PERAN = { pemilik: 'Pemilik usaha', admin: 'Admin', kasir: 'Kasir' } as const;

function IsiSidebar({ onPilih }: { onPilih?: () => void }) {
  const { halaman, buka } = useNav();
  const { pengguna, logout } = useAuth();
  const menu = menuUntuk(pengguna!.peran);
  return (
    <div className="flex h-full flex-col bg-ink-900 text-white">
      <div className="px-5 pb-5 pt-6"><Logo /></div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4" aria-label="Menu utama">
        {(Object.keys(GRUP) as (keyof typeof GRUP)[]).filter((g) => menu.some((m) => m.grup === g)).map((g) => (
          <div key={g}>
            <p className="px-3 pb-1.5 text-[11px] font-semibold text-white/35">{GRUP[g]}</p>
            <ul className="space-y-0.5">
              {menu.filter((m) => m.grup === g).map((m) => {
                const aktif = halaman === m.key;
                return (
                  <li key={m.key}>
                    <button onClick={() => { buka(m.key); onPilih?.(); }} aria-current={aktif ? 'page' : undefined}
                      className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${aktif ? 'bg-brand-700 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'}`}>
                      <m.ikon className={`h-[18px] w-[18px] ${aktif ? '' : 'text-white/50 group-hover:text-white/80'}`} />
                      {m.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="flex items-center gap-3 border-t border-white/10 px-5 py-4">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-sm font-bold">{pengguna!.nama.charAt(0).toUpperCase()}</span>
        <span className="min-w-0 flex-1 leading-tight"><span className="block truncate text-sm font-semibold">{pengguna!.nama}</span><span className="text-xs text-white/50">{LABEL_PERAN[pengguna!.peran]}</span></span>
        {(
          <button onClick={() => { void logout(); onPilih?.(); }} className="rounded-lg p-2 text-white/50 hover:bg-white/10 hover:text-white" aria-label="Keluar" title="Keluar">
            <LogOut className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export function Sidebar() {
  return <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block" style={{ paddingTop: 'var(--aman-atas)' }}><IsiSidebar /></aside>;
}

export function DrawerMenu({ buka, onTutup }: { buka: boolean; onTutup: () => void }) {
  if (!buka) return null;
  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
      <div className="fade-in absolute inset-0 bg-black/50" onClick={onTutup} />
      <div className="absolute inset-y-0 left-0 w-[82%] max-w-xs shadow-pop" style={{ paddingTop: 'var(--aman-atas)', paddingBottom: 'var(--aman-bawah)', background: '#1F1416' }}>
        <button onClick={onTutup} className="absolute right-3 top-5 z-10 rounded-lg p-2 text-white/60 hover:bg-white/10" aria-label="Tutup menu" style={{ marginTop: 'var(--aman-atas)' }}><X className="h-5 w-5" /></button>
        <IsiSidebar onPilih={onTutup} />
      </div>
    </div>
  );
}
