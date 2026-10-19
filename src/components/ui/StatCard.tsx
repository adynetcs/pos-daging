import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

type Nada = 'brand' | 'hijau' | 'kuning' | 'merah' | 'biru' | 'abu';
const nada: Record<Nada, string> = {
  brand: 'bg-brand-50 text-brand-700',
  hijau: 'bg-emerald-50 text-emerald-700',
  kuning: 'bg-amber-50 text-amber-700',
  merah: 'bg-red-50 text-red-600',
  biru: 'bg-sky-50 text-sky-700',
  abu: 'bg-gray-100 text-gray-600',
};

interface Props {
  label: string;
  nilai: ReactNode;
  ikon: LucideIcon;
  warna?: Nada;
  keterangan?: ReactNode;
  onClick?: () => void;
}
export function StatCard({ label, nilai, ikon: Ikon, warna = 'brand', keterangan, onClick }: Props) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag onClick={onClick} className={`card block w-full min-w-0 p-4 text-left ${onClick ? 'transition-colors hover:border-brand-200' : ''}`}>
      <span className="flex items-center gap-2.5">
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${nada[warna]}`}><Ikon className="h-4 w-4" /></span>
        <span className="min-w-0 text-[13px] font-medium leading-tight text-gray-500">{label}</span>
      </span>
      <span className="num mt-2.5 block break-words text-[17px] font-extrabold leading-tight text-gray-900 sm:text-xl">{nilai}</span>
      {keterangan && <span className="mt-1 block text-xs text-gray-500">{keterangan}</span>}
    </Tag>
  );
}
