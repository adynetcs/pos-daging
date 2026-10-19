import { LayoutDashboard, ClipboardList, ShoppingCart, Warehouse, Menu } from 'lucide-react';
import { useNav } from '@/context/NavContext';
import type { PageKey } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { bolehBuka } from './menu';

/** Navigasi bawah untuk HP: menu tersering + tombol Kasir besar di tengah. */
export function MobileNav({ onLainnya }: { onLainnya: () => void }) {
  const { halaman, buka } = useNav();
  const { pengguna } = useAuth();
  const item = (key: PageKey, label: string, Ikon: typeof Menu) => {
    if (!bolehBuka(pengguna!.peran, key)) return <span className="flex-1" />;
    const aktif = halaman === key;
    return (
      <button onClick={() => buka(key)} aria-current={aktif ? 'page' : undefined}
        className={`flex h-full flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${aktif ? 'text-brand-700' : 'text-gray-500'}`}>
        <Ikon className="h-[21px] w-[21px]" strokeWidth={aktif ? 2.4 : 2} />{label}
      </button>
    );
  };
  const kasirAktif = halaman === 'kasir';
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur lg:hidden"
      style={{ paddingBottom: 'var(--aman-bawah)' }} aria-label="Navigasi bawah">
      <div className="mx-auto flex h-[var(--tinggi-nav)] max-w-lg items-stretch px-1">
        {item('dashboard', 'Beranda', LayoutDashboard)}
        {item('pesanan', 'Pesanan', ClipboardList)}
        <div className="flex flex-1 items-center justify-center">
          <button onClick={() => buka('kasir')} aria-label="Buka kasir"
            className={`flex h-[52px] w-[52px] flex-col items-center justify-center rounded-2xl text-white shadow-card ${kasirAktif ? 'bg-brand-900' : 'bg-brand-700'}`}>
            <ShoppingCart className="h-[22px] w-[22px]" />
            <span className="text-[10px] font-bold leading-tight">Kasir</span>
          </button>
        </div>
        {item('stok', 'Stok', Warehouse)}
        <button onClick={onLainnya} className="flex h-full flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold text-gray-500">
          <Menu className="h-[21px] w-[21px]" />Lainnya
        </button>
      </div>
    </nav>
  );
}
