import { USAHA } from '@/data/dummy';

export function Logo({ kecil }: { kecil?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className={`grid shrink-0 place-items-center rounded-xl bg-brand-700 ${kecil ? 'h-8 w-8' : 'h-10 w-10'}`}>
        <svg viewBox="0 0 32 32" className={kecil ? 'h-5 w-5' : 'h-6 w-6'} aria-hidden="true">
          <path d="M6 9c-2-1-3-3-2.5-5 2 .3 3.6 1.5 4.3 3.2M26 9c2-1 3-3 2.5-5-2 .3-3.6 1.5-4.3 3.2" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M8 8.5c2.4-1.6 5-2.3 8-2.3s5.6.7 8 2.3c1 3.8.3 8.6-2.2 12.4-1.4 2.2-3.5 4.6-5.8 4.6s-4.4-2.4-5.8-4.6C7.7 17.1 7 12.3 8 8.5z" fill="#fff" />
          <ellipse cx="16" cy="21" rx="3.6" ry="2.6" fill="#841D28" />
          <circle cx="12.2" cy="13.5" r="1.3" fill="#841D28" /><circle cx="19.8" cy="13.5" r="1.3" fill="#841D28" />
        </svg>
      </span>
      {!kecil && (
        <div className="leading-tight">
          <p className="text-[16px] font-extrabold tracking-tight text-white">{USAHA.nama}</p>
          <p className="text-[11px] text-white/55">{USAHA.tagline}</p>
        </div>
      )}
    </div>
  );
}
