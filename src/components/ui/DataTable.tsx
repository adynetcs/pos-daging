import { useEffect, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { Pagination } from './Pagination';
import { EmptyState } from './States';

export interface Kolom<T> {
  key: string;
  judul: string;
  render: (row: T) => ReactNode;
  /** Nilai untuk pengurutan; kolom tanpa sortBy tidak bisa diurutkan */
  sortBy?: (row: T) => number | string;
  rata?: 'kiri' | 'kanan' | 'tengah';
  className?: string;
  /** Kelas untuk th & td, mis. 'hidden 2xl:table-cell' */
  kelasKolom?: string;
}

interface Props<T> {
  data: T[];
  kolom: Kolom<T>[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  /** Tampilan kartu untuk layar < md. Jika tidak diberikan, tabel bisa digeser horizontal di dalam wadahnya. */
  kartuMobile?: (row: T) => ReactNode;
  perHalaman?: number;
  kosong?: { judul: string; pesan?: string; aksi?: ReactNode };
  dipilih?: string | null;
}

export function DataTable<T>({ data, kolom, rowKey, onRowClick, kartuMobile, perHalaman = 10, kosong, dipilih }: Props<T>) {
  const [hal, setHal] = useState(1);
  const [sort, setSort] = useState<{ key: string; arah: 1 | -1 } | null>(null);
  useEffect(() => setHal(1), [data.length]);

  const k = sort && kolom.find((c) => c.key === sort.key);
  const urut = k?.sortBy
    ? [...data].sort((a, b) => {
        const x = k.sortBy!(a), y = k.sortBy!(b);
        return (x < y ? -1 : x > y ? 1 : 0) * sort!.arah;
      })
    : data;
  const tampil = urut.slice((hal - 1) * perHalaman, hal * perHalaman);
  const rata = (r?: string) => (r === 'kanan' ? 'text-right' : r === 'tengah' ? 'text-center' : 'text-left');

  if (data.length === 0)
    return <EmptyState judul={kosong?.judul ?? 'Belum ada data'} pesan={kosong?.pesan} aksi={kosong?.aksi} />;

  return (
    <div>
      {kartuMobile && (
        <ul className="divide-y divide-gray-100 md:hidden">
          {tampil.map((r) => (
            <li key={rowKey(r)}>
              {onRowClick ? <button className="w-full px-4 py-3 text-left active:bg-gray-50" onClick={() => onRowClick(r)}>{kartuMobile(r)}</button> : <div className="px-4 py-3">{kartuMobile(r)}</div>}
            </li>
          ))}
        </ul>
      )}
      <div className={`overflow-x-auto ${kartuMobile ? 'hidden md:block' : ''}`}>
        <table className="w-full min-w-max">
          <thead className="border-b border-gray-100 bg-gray-50/70">
            <tr>
              {kolom.map((c) => (
                <th key={c.key} className={`th ${rata(c.rata)} ${c.kelasKolom ?? ''}`} aria-sort={sort?.key === c.key ? (sort.arah === 1 ? 'ascending' : 'descending') : undefined}>
                  {c.sortBy ? (
                    <button className={`inline-flex items-center gap-1 hover:text-gray-800 ${c.rata === 'kanan' ? 'flex-row-reverse' : ''}`}
                      onClick={() => setSort((s) => (s?.key === c.key ? { key: c.key, arah: (s.arah * -1) as 1 | -1 } : { key: c.key, arah: 1 }))}>
                      {c.judul}
                      {sort?.key === c.key && (sort.arah === 1 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                    </button>
                  ) : c.judul}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tampil.map((r) => {
              const id = rowKey(r);
              return (
                <tr key={id} onClick={onRowClick ? () => onRowClick(r) : undefined}
                  className={`${onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''} ${dipilih === id ? 'bg-brand-50/60' : ''}`}>
                  {kolom.map((c) => <td key={c.key} className={`td ${rata(c.rata)} ${c.className ?? ''} ${c.kelasKolom ?? ''}`}>{c.render(r)}</td>)}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Pagination halaman={hal} total={data.length} perHalaman={perHalaman} onChange={setHal} />
    </div>
  );
}
