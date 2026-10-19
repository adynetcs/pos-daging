import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';
import type { ReactNode } from 'react';

export function EmptyState({ ikon: Ikon = Inbox, judul, pesan, aksi }: { ikon?: LucideIcon; judul: string; pesan?: string; aksi?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gray-100 text-gray-400"><Ikon className="h-6 w-6" /></span>
      <p className="mt-3 text-sm font-bold text-gray-800">{judul}</p>
      {pesan && <p className="mt-1 max-w-xs text-[13px] text-gray-500">{pesan}</p>}
      {aksi && <div className="mt-4">{aksi}</div>}
    </div>
  );
}

export function LoadingState({ baris = 5 }: { baris?: number }) {
  return (
    <div className="space-y-3 p-4" aria-busy="true" aria-label="Memuat data">
      {Array.from({ length: baris }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="skeleton h-9 w-9 rounded-lg" />
          <div className="flex-1 space-y-2"><div className="skeleton h-3 w-2/5 rounded" /><div className="skeleton h-3 w-1/4 rounded" /></div>
          <div className="skeleton h-3 w-16 rounded" />
        </div>
      ))}
    </div>
  );
}

export function DemoBadge({ className = '' }: { className?: string }) {
  return (
    <span title="Belum terhubung ke backend. Data hanya contoh dan tidak disimpan."
      className={`inline-flex items-center gap-1.5 rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800 ${className}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />DEMO
    </span>
  );
}

export function CatatanDemo({ children }: { children: ReactNode }) {
  return <p className="text-xs text-gray-500"><DemoBadge className="mr-1.5 align-middle" />{children}</p>;
}
