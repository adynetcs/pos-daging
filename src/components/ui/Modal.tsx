import { useEffect, useId, useRef, type ReactNode } from 'react';
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

/** Tumpukan modal yang sedang terbuka; hanya modal teratas yang menanggapi tombol Esc. */
const tumpukan: symbol[] = [];

/**
 * Modal di desktop, bottom sheet di HP. Esc & klik latar untuk menutup.
 *
 * Catatan penting: efek di bawah HANYA bergantung pada `buka`. `onTutup` disimpan di ref,
 * karena induk biasanya mengirim fungsi baru di setiap render (mis. `onTutup={() => setX(null)}`).
 * Jika `onTutup` dijadikan dependensi, efek berjalan ulang di setiap ketikan dan memindahkan
 * fokus ke kotak modal, sehingga input hanya menerima satu huruf.
 */
export function Modal({ buka, onTutup, judul, sub, children, footer, lebar = 'md' }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const idJudul = useId();
  const onTutupRef = useRef(onTutup);
  useEffect(() => { onTutupRef.current = onTutup; });

  useEffect(() => {
    if (!buka) return;
    const id = Symbol('modal');
    tumpukan.push(id);
    const sebelumnya = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const f = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && tumpukan[tumpukan.length - 1] === id) onTutupRef.current();
    };
    document.addEventListener('keydown', f);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Fokus awal SEKALI saat dibuka, dan jangan merebut fokus dari input ber-autoFocus di dalam modal.
    if (ref.current && !ref.current.contains(document.activeElement)) ref.current.focus();
    return () => {
      document.removeEventListener('keydown', f);
      document.body.style.overflow = prev;
      tumpukan.splice(tumpukan.indexOf(id), 1);
      // Kembalikan fokus ke tombol yang membuka modal (aksesibilitas keyboard).
      if (sebelumnya && document.contains(sebelumnya)) sebelumnya.focus();
    };
  }, [buka]);

  if (!buka) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby={idJudul}>
      <div className="fade-in absolute inset-0 bg-ink-900/50" onClick={onTutup} />
      <div ref={ref} tabIndex={-1}
        className={`sheet-in relative flex max-h-[92dvh] w-full flex-col rounded-t-3xl bg-white shadow-pop outline-none sm:max-h-[88vh] sm:rounded-2xl ${lebarKelas[lebar]}`}
        style={{ paddingBottom: 'var(--aman-bawah)' }}>
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-gray-300 sm:hidden" />
        <header className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
          <div className="min-w-0">
            <h2 id={idJudul} className="text-base font-bold text-gray-900">{judul}</h2>
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
