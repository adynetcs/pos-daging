import { ChevronRight, X } from 'lucide-react';
import { useNav } from '@/context/NavContext';
import { MENU } from './menu';
import { Logo } from './Logo';
import { IS_DEMO } from '@/services/api';

const GRUP = { operasional: 'Operasional', data: 'Data & persediaan', bisnis: 'Bisnis' } as const;

function IsiSidebar({ onPilih }: { onPilih?: () => void }) {
  const { halaman, buka } = useNav();
  return (
    <div className="flex h-full flex-col bg-ink-900 text-white">
      <div className="px-5 pb-5 pt-6"><Logo /></div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4" aria-label="Menu utama">
        {(Object.keys(GRUP) as (keyof typeof GRUP)[]).map((g) => (
          <div key={g}>
            <p className="px-3 pb-1.5 text-[11px] font-semibold text-white/35">{GRUP[g]}</p>
            <ul className="space-y-0.5">
              {MENU.filter((m) => m.grup === g).map((m) => {
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
      {IS_DEMO && (
        <div className="mx-3 mb-3 rounded-xl border border-amber-400/25 bg-amber-400/10 p-3 text-[12px] text-amber-100/90">
          <p className="font-bold text-amber-300">Mode demo</p>
          <p className="mt-0.5 text-amber-100/70">Data contoh, tidak tersimpan ke database.</p>
        </div>
      )}
      <button onClick={() => { buka('pengaturan'); onPilih?.(); }} className="flex items-center gap-3 border-t border-white/10 px-5 py-4 text-left hover:bg-white/5">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-sm font-bold">A</span>
        <span className="flex-1 leading-tight"><span className="block text-sm font-semibold">Ady</span><span className="text-xs text-white/50">Pemilik usaha</span></span>
        <ChevronRight className="h-4 w-4 text-white/40" />
      </button>
    </div>
  );
}

export function Sidebar() {
  return <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block" style={{ paddingTop: 'env(safe-area-inset-top,0px)' }}><IsiSidebar /></aside>;
}

export function DrawerMenu({ buka, onTutup }: { buka: boolean; onTutup: () => void }) {
  if (!buka) return null;
  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
      <div className="fade-in absolute inset-0 bg-black/50" onClick={onTutup} />
      <div className="absolute inset-y-0 left-0 w-[82%] max-w-xs shadow-pop" style={{ paddingTop: 'env(safe-area-inset-top,0px)', background: '#1F1416' }}>
        <button onClick={onTutup} className="absolute right-3 top-5 z-10 rounded-lg p-2 text-white/60 hover:bg-white/10" aria-label="Tutup menu" style={{ marginTop: 'env(safe-area-inset-top,0px)' }}><X className="h-5 w-5" /></button>
        <IsiSidebar onPilih={onTutup} />
      </div>
    </div>
  );
}
