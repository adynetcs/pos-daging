import { CalendarDays } from 'lucide-react';
import { tanggalPendek } from '@/utils/format';

/** Input tanggal native (picker bawaan HP lebih nyaman) dengan tampilan format Indonesia. */
export function DatePicker({ value, onChange, label, min, max }: { value: string; onChange: (v: string) => void; label?: string; min?: string; max?: string }) {
  return (
    <label className="relative block">
      {label && <span className="label">{label}</span>}
      <span className="input flex items-center gap-2 pr-3">
        <CalendarDays className="h-4 w-4 shrink-0 text-gray-400" />
        <span className="num flex-1 truncate">{value ? tanggalPendek(value) : 'Pilih tanggal'}</span>
      </span>
      <input type="date" value={value} min={min} max={max} onChange={(e) => e.target.value && onChange(e.target.value)}
        aria-label={label ?? 'Tanggal'}
        className="absolute inset-x-0 bottom-0 h-[42px] w-full cursor-pointer opacity-0" />
    </label>
  );
}

export function RentangTanggal({ dari, sampai, onChange }: { dari: string; sampai: string; onChange: (d: string, s: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:w-80">
      <DatePicker value={dari} max={sampai} onChange={(v) => onChange(v, sampai)} />
      <DatePicker value={sampai} min={dari} onChange={(v) => onChange(dari, v)} />
    </div>
  );
}
