import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface Props {
  buka: boolean;
  onTutup: () => void;
  judul: ReactNode;
  sub?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  lebar?: 'sm' | 'md' | 'lg' | 'xl';
}
const lebarKelas = { sm: 'sm:max-w-md', md: 'sm:max-w-xl', lg: 'sm:max-w-3xl', xl: 'sm:max-w-5xl' };

/** Modal di desktop, bottom sheet di HP. Esc & klik latar untuk menutup. */
export function Modal({ buka, onTutup, judul, sub, children, footer, lebar = 'md' }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!buka) return;
    const f = (e: KeyboardEvent) => e.key === 'Escape' && onTutup();
    document.addEventListener('keydown', f);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    return () => { document.removeEventListener('keydown', f); document.body.style.overflow = prev; };
  }, [buka, onTutup]);
  if (!buka) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true">
      <div className="fade-in absolute inset-0 bg-ink-900/50" onClick={onTutup} />
      <div ref={ref} tabIndex={-1}
        className={`sheet-in relative flex max-h-[92dvh] w-full flex-col rounded-t-3xl bg-white shadow-pop outline-none sm:max-h-[88vh] sm:rounded-2xl ${lebarKelas[lebar]}`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-gray-300 sm:hidden" />
        <header className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-gray-900">{judul}</h2>
            {sub && <p className="mt-0.5 text-[13px] text-gray-500">{sub}</p>}
          </div>
          <button onClick={onTutup} className="-mr-1 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label="Tutup"><X className="h-5 w-5" /></button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-gray-100 px-5 py-3.5">{footer}</footer>}
      </div>
    </div>
  );
}
