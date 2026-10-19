import type { ReactNode } from 'react';

export interface OpsiFilter<T extends string> { nilai: T; label: string; jumlah?: number }

/** Deretan chip filter yang bisa digeser di layar kecil */
export function FilterChips<T extends string>({ opsi, value, onChange, label }: {
  opsi: OpsiFilter<T>[]; value: T; onChange: (v: T) => void; label?: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 py-0.5">
      {opsi.map((o) => {
        const aktif = o.nilai === value;
        return (
          <button key={o.nilai} role="tab" aria-selected={aktif} onClick={() => onChange(o.nilai)}
            className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold transition-colors ${aktif ? 'bg-brand-700 text-white' : 'bg-white text-gray-600 ring-1 ring-inset ring-gray-200 hover:bg-gray-50'}`}>
            {o.label}
            {o.jumlah !== undefined && <span className={`num rounded-full px-1.5 text-[11px] ${aktif ? 'bg-white/20' : 'bg-gray-100 text-gray-500'}`}>{o.jumlah}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Wadah baris filter: pencarian + kontrol tambahan */
export function FilterBar({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center">{children}</div>;
}

export function Tabs<T extends string>({ opsi, value, onChange }: { opsi: OpsiFilter<T>[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="no-scrollbar flex gap-1 overflow-x-auto border-b border-gray-200" role="tablist">
      {opsi.map((o) => (
        <button key={o.nilai} role="tab" aria-selected={o.nilai === value} onClick={() => onChange(o.nilai)}
          className={`-mb-px shrink-0 border-b-2 px-3.5 py-2.5 text-sm font-semibold transition-colors ${o.nilai === value ? 'border-brand-700 text-brand-800' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
