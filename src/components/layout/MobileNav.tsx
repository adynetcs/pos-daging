import { LayoutDashboard, ClipboardList, ShoppingCart, Warehouse, Menu } from 'lucide-react';
import { useNav } from '@/context/NavContext';
import type { PageKey } from '@/types';

/** Navigasi bawah untuk HP: menu tersering + tombol Kasir besar di tengah. */
export function MobileNav({ onLainnya }: { onLainnya: () => void }) {
  const { halaman, buka } = useNav();
  const item = (key: PageKey, label: string, Ikon: typeof Menu) => {
    const aktif = halaman === key;
    return (
      <button onClick={() => buka(key)} aria-current={aktif ? 'page' : undefined}
        className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${aktif ? 'text-brand-700' : 'text-gray-500'}`}>
        <Ikon className="h-[22px] w-[22px]" strokeWidth={aktif ? 2.4 : 2} />{label}
      </button>
    );
  };
  const kasirAktif = halaman === 'kasir';
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom,0px)' }} aria-label="Navigasi bawah">
      <div className="mx-auto flex max-w-lg items-end px-2">
        {item('dashboard', 'Beranda', LayoutDashboard)}
        {item('pesanan', 'Pesanan', ClipboardList)}
        <div className="flex flex-1 justify-center">
          <button onClick={() => buka('kasir')} aria-label="Buka kasir"
            className={`-mt-5 mb-1 flex h-[60px] w-[60px] flex-col items-center justify-center rounded-2xl text-white shadow-pop ring-4 ring-white ${kasirAktif ? 'bg-brand-900' : 'bg-brand-700'}`}>
            <ShoppingCart className="h-6 w-6" />
            <span className="text-[10px] font-bold">Kasir</span>
          </button>
        </div>
        {item('stok', 'Stok', Warehouse)}
        <button onClick={onLainnya} className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold text-gray-500">
          <Menu className="h-[22px] w-[22px]" />Lainnya
        </button>
      </div>
    </nav>
  );
}
