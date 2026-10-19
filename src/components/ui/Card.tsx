import type { ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`card min-w-0 ${className}`}>{children}</section>;
}

export function CardHeader({ judul, sub, aksi }: { judul: ReactNode; sub?: ReactNode; aksi?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-4">
      <div className="min-w-0">
        <h2 className="text-[15px] font-bold text-gray-900">{judul}</h2>
        {sub && <p className="mt-0.5 text-[13px] text-gray-500">{sub}</p>}
      </div>
      {aksi && <div className="shrink-0">{aksi}</div>}
    </div>
  );
}

export function PageHeader({ judul, sub, aksi }: { judul: string; sub?: ReactNode; aksi?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-xl font-extrabold tracking-tight text-gray-900 sm:text-2xl">{judul}</h1>
        {sub && <p className="mt-1 text-sm text-gray-500">{sub}</p>}
      </div>
      {aksi && <div className="flex flex-wrap gap-2">{aksi}</div>}
    </div>
  );
}
