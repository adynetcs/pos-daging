import type { ReactNode } from 'react';
import type { StatusPesanan } from '@/types';

export type NadaBadge = 'hijau' | 'kuning' | 'merah' | 'biru' | 'abu' | 'brand' | 'ungu';
const kelas: Record<NadaBadge, string> = {
  hijau: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  kuning: 'bg-amber-50 text-amber-800 ring-amber-600/25',
  merah: 'bg-red-50 text-red-700 ring-red-600/20',
  biru: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  abu: 'bg-gray-100 text-gray-600 ring-gray-500/20',
  brand: 'bg-brand-50 text-brand-700 ring-brand-600/20',
  ungu: 'bg-violet-50 text-violet-700 ring-violet-600/20',
};

export function Badge({ nada = 'abu', children, titik = true }: { nada?: NadaBadge; children: ReactNode; titik?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${kelas[nada]}`}>
      {titik && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />}
      {children}
    </span>
  );
}

export const STATUS_PESANAN: Record<StatusPesanan, { label: string; nada: NadaBadge }> = {
  draft: { label: 'Draft', nada: 'abu' },
  menunggu_dp: { label: 'Menunggu DP', nada: 'kuning' },
  proses: { label: 'Dalam proses', nada: 'biru' },
  siap_kirim: { label: 'Siap dikirim', nada: 'ungu' },
  selesai: { label: 'Selesai', nada: 'hijau' },
  batal: { label: 'Dibatalkan', nada: 'merah' },
};
export const StatusPesananBadge = ({ status }: { status: StatusPesanan }) => (
  <Badge nada={STATUS_PESANAN[status].nada}>{STATUS_PESANAN[status].label}</Badge>
);

export function statusStok(stok: number, min: number): { label: string; nada: NadaBadge } {
  if (stok <= 0) return { label: 'Habis', nada: 'merah' };
  if (stok < min) return { label: 'Menipis', nada: 'merah' };
  if (stok < min * 1.5) return { label: 'Perlu dipantau', nada: 'kuning' };
  return { label: 'Normal', nada: 'hijau' };
}
export const StokBadge = ({ stok, min }: { stok: number; min: number }) => {
  const s = statusStok(stok, min);
  return <Badge nada={s.nada}>{s.label}</Badge>;
};
