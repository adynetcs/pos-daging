import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Varian = 'primer' | 'sekunder' | 'hantu' | 'bahaya' | 'garis';
const kelas: Record<Varian, string> = {
  primer: 'bg-brand-700 text-white hover:bg-brand-800 active:bg-brand-900',
  sekunder: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
  hantu: 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
  bahaya: 'bg-red-600 text-white hover:bg-red-700',
  garis: 'border border-gray-300 bg-white text-gray-800 hover:bg-gray-50',
};
const ukuran = { sm: 'h-9 px-3 text-[13px]', md: 'h-10 px-4', lg: 'h-12 px-5 text-base' };

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  varian?: Varian;
  ukur?: keyof typeof ukuran;
  ikon?: ReactNode;
}
export function Button({ varian = 'primer', ukur = 'md', ikon, className = '', children, ...rest }: Props) {
  return (
    <button type="button" className={`btn ${kelas[varian]} ${ukuran[ukur]} ${className}`} {...rest}>
      {ikon}{children}
    </button>
  );
}
