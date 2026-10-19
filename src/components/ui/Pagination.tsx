import { ChevronLeft, ChevronRight } from 'lucide-react';

export function Pagination({ halaman, total, perHalaman, onChange }: { halaman: number; total: number; perHalaman: number; onChange: (h: number) => void }) {
  const jumlahHal = Math.max(1, Math.ceil(total / perHalaman));
  if (total <= perHalaman) return null;
  const awal = (halaman - 1) * perHalaman + 1;
  const akhir = Math.min(total, halaman * perHalaman);
  return (
    <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 text-[13px] text-gray-500">
      <span className="num">{awal}–{akhir} dari {total}</span>
      <div className="flex items-center gap-1">
        <button disabled={halaman <= 1} onClick={() => onChange(halaman - 1)} className="grid h-9 w-9 place-items-center rounded-lg ring-1 ring-gray-200 hover:bg-gray-50 disabled:opacity-40" aria-label="Halaman sebelumnya"><ChevronLeft className="h-4 w-4" /></button>
        <span className="num px-2 font-semibold text-gray-700">{halaman} / {jumlahHal}</span>
        <button disabled={halaman >= jumlahHal} onClick={() => onChange(halaman + 1)} className="grid h-9 w-9 place-items-center rounded-lg ring-1 ring-gray-200 hover:bg-gray-50 disabled:opacity-40" aria-label="Halaman berikutnya"><ChevronRight className="h-4 w-4" /></button>
      </div>
    </div>
  );
}
