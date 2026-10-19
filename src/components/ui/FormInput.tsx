import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { useId } from 'react';

export function Field({ label, bantuan, error, children, htmlFor }: { label: string; bantuan?: ReactNode; error?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="label">{label}</label>
      {children}
      {error ? <p className="mt-1 text-xs font-medium text-red-600">{error}</p> : bantuan && <p className="mt-1 text-xs text-gray-500">{bantuan}</p>}
    </div>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { label: string; bantuan?: ReactNode; error?: string; akhiran?: string; awalan?: string };
export function Input({ label, bantuan, error, akhiran, awalan, className = '', ...rest }: InputProps) {
  const id = useId();
  return (
    <Field label={label} bantuan={bantuan} error={error} htmlFor={id}>
      <div className="relative">
        {awalan && <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-500">{awalan}</span>}
        <input id={id} className={`input ${awalan ? 'pl-10' : ''} ${akhiran ? 'pr-12' : ''} ${error ? 'border-red-400' : ''} ${className}`} {...rest} />
        {akhiran && <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-500">{akhiran}</span>}
      </div>
    </Field>
  );
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { label: string; opsi: { nilai: string; label: string }[]; bantuan?: ReactNode };
export function Select({ label, opsi, bantuan, className = '', ...rest }: SelectProps) {
  const id = useId();
  return (
    <Field label={label} bantuan={bantuan} htmlFor={id}>
      <select id={id} className={`input appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 fill=%22none%22 stroke=%22%236b7280%22 stroke-width=%222%22 viewBox=%220 0 24 24%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[right_0.75rem_center] bg-no-repeat pr-9 ${className}`} {...rest}>
        {opsi.map((o) => <option key={o.nilai} value={o.nilai}>{o.label}</option>)}
      </select>
    </Field>
  );
}

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string };
export function Textarea({ label, className = '', ...rest }: TextareaProps) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id}>
      <textarea id={id} rows={3} className={`input resize-none ${className}`} {...rest} />
    </Field>
  );
}

export function Toggle({ label, keterangan, checked, onChange }: { label: string; keterangan?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 py-2">
      <span>
        <span className="block text-sm font-semibold text-gray-800">{label}</span>
        {keterangan && <span className="block text-xs text-gray-500">{keterangan}</span>}
      </span>
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-brand-700' : 'bg-gray-300'}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
    </label>
  );
}
