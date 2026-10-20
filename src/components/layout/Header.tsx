import { useMemo, useRef, useState, useEffect } from 'react';
import { hariIni, sekarang } from '@/utils/waktu';
import { Bell, CalendarDays, Menu, Package, ClipboardList, Users, AlertTriangle, Wallet, RefreshCw } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { useNav } from '@/context/NavContext';
import { useData } from '@/context/DataContext';
import { labelHalaman } from './menu';
import { SearchInput } from '@/components/ui/SearchInput';
import { jam, tanggalHari, tanggalJam } from '@/utils/format';
import { useAuth } from '@/context/AuthContext';

function PencarianGlobal() {
  const { produk, pelanggan, pesanan } = useData();
  const { buka } = useNav();
  const [q, setQ] = useState('');
  const [fokus, setFokus] = useState(false);
  const hasil = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (s.length < 2) return [];
    return [
      ...produk.filter((p) => p.nama.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s)).slice(0, 4).map((p) => ({ id: p.id, ikon: Package, teks: p.nama, sub: p.sku, ke: 'produk' as const })),
      ...pelanggan.filter((p) => p.nama.toLowerCase().includes(s)).slice(0, 3).map((p) => ({ id: p.id, ikon: Users, teks: p.nama, sub: p.jenis === 'partai' ? 'Pelanggan partai' : 'Pelanggan eceran', ke: 'pelanggan' as const })),
      ...pesanan.filter((p) => p.id.toLowerCase().includes(s)).slice(0, 3).map((p) => ({ id: p.id, ikon: ClipboardList, teks: p.id, sub: 'Pesanan partai', ke: 'pesanan' as const })),
    ];
  }, [q, produk, pelanggan, pesanan]);
  return (
    <div className="relative w-full max-w-md" onBlur={() => setTimeout(() => setFokus(false), 150)} onFocus={() => setFokus(true)}>
      <SearchInput value={q} onChange={setQ} placeholder="Cari produk, pelanggan, atau nomor pesanan…" />
      {fokus && q.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-pop">
          {hasil.length === 0 ? <p className="px-4 py-3 text-sm text-gray-500">Tidak ada hasil untuk “{q}”.</p> : (
            <ul className="max-h-80 overflow-y-auto py-1">
              {hasil.map((h) => (
                <li key={h.ke + h.id}>
                  <button onMouseDown={() => { buka(h.ke); setQ(''); }} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50">
                    <h.ikon className="h-4 w-4 text-gray-400" />
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-gray-800">{h.teks}</span><span className="text-xs text-gray-500">{h.sub}</span></span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function Notifikasi() {
  const { notifikasi, bacaSemuaNotifikasi } = useData();
  const [buka, setBuka] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const f = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setBuka(false); };
    document.addEventListener('mousedown', f);
    return () => document.removeEventListener('mousedown', f);
  }, []);
  const belum = notifikasi.filter((n) => !n.dibaca).length;
  const ikon = { stok: AlertTriangle, pesanan: ClipboardList, bayar: Wallet };
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setBuka((b) => !b)} className="relative grid h-10 w-10 place-items-center rounded-xl text-gray-600 hover:bg-gray-100" aria-label={`Notifikasi, ${belum} belum dibaca`}>
        <Bell className="h-5 w-5" />
        {belum > 0 && <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">{belum}</span>}
      </button>
      {buka && (
        <div className="absolute right-0 top-full z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-pop">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <p className="text-sm font-bold">Notifikasi</p>
            <button onClick={bacaSemuaNotifikasi} className="text-xs font-semibold text-brand-700 hover:underline">Tandai semua dibaca</button>
          </div>
          <ul className="max-h-96 divide-y divide-gray-100 overflow-y-auto">
            {notifikasi.map((n) => {
              const I = ikon[n.jenis];
              return (
                <li key={n.id} className={`flex gap-3 px-4 py-3 ${n.dibaca ? '' : 'bg-brand-50/40'}`}>
                  <I className={`mt-0.5 h-4 w-4 shrink-0 ${n.jenis === 'stok' ? 'text-red-500' : 'text-gray-400'}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{n.judul}</p>
                    <p className="text-[13px] text-gray-600">{n.isi}</p>
                    <p className="mt-1 text-[11px] text-gray-400">{tanggalJam(n.waktu)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Jam WIB yang berjalan */
function Jam() {
  const [, setDetak] = useState(0);
  useEffect(() => { const t = setInterval(() => setDetak((x) => x + 1), 30_000); return () => clearInterval(t); }, []);
  return <span><span className="font-semibold text-gray-800">{tanggalHari(hariIni())}</span>, {jam(sekarang())} WIB</span>;
}

/** Muat ulang data dari Sheets (mis. setelah ada perubahan dari perangkat lain). */
function TombolSegarkan() {
  const { muatUlang, memuatUlang } = useData();
  const toast = useToast();
  return (
    <button onClick={() => muatUlang().catch((e: Error) => toast({ jenis: 'gagal', judul: 'Gagal memuat ulang', pesan: e.message }))} disabled={memuatUlang}
      className="grid h-10 w-10 place-items-center rounded-xl text-gray-600 hover:bg-gray-100 disabled:opacity-60" aria-label="Muat ulang data" title="Muat ulang data dari Google Sheets">
      <RefreshCw className={`h-[18px] w-[18px] ${memuatUlang ? 'animate-spin' : ''}`} />
    </button>
  );
}

export function Header({ onMenu }: { onMenu: () => void }) {
  const { halaman } = useNav();
  const { pengguna } = useAuth();
  return (
    <header className="sticky top-0 z-20 border-b border-gray-200/80 bg-white/95 backdrop-blur" style={{ paddingTop: 'var(--aman-atas)' }}>
      <div className="flex h-[var(--tinggi-header)] items-center gap-2 px-3 sm:gap-3 sm:px-4 lg:px-8">
        <button onClick={onMenu} className="-ml-1 grid h-10 w-10 place-items-center rounded-xl text-gray-700 hover:bg-gray-100 lg:hidden" aria-label="Buka menu"><Menu className="h-5 w-5" /></button>
        <div className="min-w-0 flex-1 lg:hidden">
          <p className="truncate text-base font-bold text-gray-900">{labelHalaman(halaman)}</p>
        </div>
        <div className="hidden flex-1 lg:block"><PencarianGlobal /></div>
        <TombolSegarkan />
        <div className="hidden items-center gap-2 rounded-xl border border-gray-200 px-3 py-1.5 text-xs text-gray-600 xl:flex">
          <CalendarDays className="h-4 w-4 text-gray-400" />
          <Jam />
        </div>
        <Notifikasi />
        <div className="hidden items-center gap-2.5 pl-1 sm:flex">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-800">{pengguna!.nama.charAt(0).toUpperCase()}</span>
          <span className="hidden leading-tight md:block"><span className="block text-sm font-semibold">{pengguna!.nama}</span><span className="text-xs capitalize text-gray-500">{pengguna!.peran}</span></span>
        </div>
      </div>
      {halaman === 'dashboard' && <div className="px-4 pb-3 lg:hidden"><PencarianGlobal /></div>}
    </header>
  );
}
