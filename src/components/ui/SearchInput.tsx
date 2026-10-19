import { Search, X } from 'lucide-react';

interface Props { value: string; onChange: (v: string) => void; placeholder?: string; className?: string; autoFocus?: boolean }
export function SearchInput({ value, onChange, placeholder = 'Cari…', className = '', autoFocus }: Props) {
  return (
    <label className={`relative block ${className}`}>
      <span className="sr-only">{placeholder}</span>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <input
        type="search" value={value} autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="input pl-9 pr-9 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button type="button" onClick={() => onChange('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:text-gray-700" aria-label="Hapus pencarian">
          <X className="h-4 w-4" />
        </button>
      )}
    </label>
  );
}
