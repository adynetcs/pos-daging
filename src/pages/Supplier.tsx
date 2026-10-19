import { useState } from 'react';
import { Phone, MapPin, User } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { useNav } from '@/context/NavContext';
import { PageHeader, Card } from '@/components/ui/Card';
import { SearchInput } from '@/components/ui/SearchInput';
import { FilterBar } from '@/components/ui/FilterBar';
import { DataTable, type Kolom } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { CatatanDemo } from '@/components/ui/States';
import type { Supplier as TSupplier } from '@/types';
import { dibayarPembelian, nilaiPembelian, utangPembelian, uangMukaPembelian } from '@/utils/finance';
import { rupiah, tanggalPendek } from '@/utils/format';

export default function Supplier() {
  const { supplier, pembelian } = useData();
  const { buka } = useNav();
  const [q, setQ] = useState('');
  const [detail, setDetail] = useState<TSupplier | null>(null);
  const st = (id: string) => {
    const pb = pembelian.filter((b) => b.supplierId === id);
    return { pb, total: pb.filter((b) => b.statusPenerimaan !== 'dipesan').reduce((s, b) => s + nilaiPembelian(b), 0), utang: pb.reduce((s, b) => s + utangPembelian(b), 0), um: pb.reduce((s, b) => s + uangMukaPembelian(b), 0) };
  };
  const kolom: Kolom<TSupplier>[] = [
    { key: 'n', judul: 'Supplier', render: (s) => <div><p className="font-semibold text-gray-900">{s.nama}</p><p className="text-xs text-gray-500">{s.komoditas}</p></div>, sortBy: (s) => s.nama },
    { key: 'k', judul: 'Kontak', render: (s) => <div><p>{s.kontak}</p><p className="text-xs text-gray-500">{s.telepon}</p></div> },
    { key: 'a', judul: 'Alamat', render: (s) => <span className="text-gray-500">{s.alamat}</span> },
    { key: 'j', judul: 'Pembelian', rata: 'kanan', render: (s) => <span className="num">{st(s.id).pb.length}x</span> },
    { key: 't', judul: 'Total diterima', rata: 'kanan', render: (s) => <span className="num">{rupiah(st(s.id).total)}</span>, sortBy: (s) => st(s.id).total },
    { key: 'u', judul: 'Sisa utang', rata: 'kanan', render: (s) => <span className={`num font-bold ${st(s.id).utang ? 'text-red-600' : 'text-gray-400'}`}>{rupiah(st(s.id).utang)}</span>, sortBy: (s) => st(s.id).utang },
  ];
  const s = detail ? st(detail.id) : null;
  return (
    <>
      <PageHeader judul="Supplier" sub="Pemasok daging dan produk kemasan." aksi={<Button varian="garis" onClick={() => buka('pembelian')}>Lihat pembelian</Button>} />
      <Card className="overflow-hidden">
        <FilterBar><SearchInput value={q} onChange={setQ} placeholder="Cari supplier…" className="sm:w-72" /></FilterBar>
        <DataTable data={supplier.filter((x) => !q || `${x.nama} ${x.kontak}`.toLowerCase().includes(q.toLowerCase()))} kolom={kolom} rowKey={(x) => x.id} onRowClick={setDetail}
          kartuMobile={(x) => <div className="flex justify-between gap-3"><div><p className="text-sm font-semibold">{x.nama}</p><p className="text-xs text-gray-500">{x.kontak}, {x.telepon}</p></div><div className="text-right"><p className="text-[11px] text-gray-500">Utang</p><p className="num text-sm font-bold text-red-600">{rupiah(st(x.id).utang)}</p></div></div>} />
      </Card>
      <div className="mt-4"><CatatanDemo>Data supplier contoh.</CatatanDemo></div>
      <Modal buka={!!detail} onTutup={() => setDetail(null)} judul={detail?.nama ?? ''} sub={detail?.komoditas} lebar="md">
        {detail && s && (
          <>
            <div className="space-y-1.5 text-sm">
              <p className="flex gap-2"><User className="h-4 w-4 text-gray-400" />{detail.kontak}</p>
              <p className="flex gap-2"><Phone className="h-4 w-4 text-gray-400" />{detail.telepon}</p>
              <p className="flex gap-2"><MapPin className="h-4 w-4 text-gray-400" />{detail.alamat}</p>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              {[['Total diterima', rupiah(s.total)], ['Sisa utang', rupiah(s.utang)], ['Uang muka', rupiah(s.um)]].map(([a, b]) => <div key={a} className="rounded-xl bg-gray-50 p-3"><p className="text-xs text-gray-500">{a}</p><p className="num text-sm font-bold">{b}</p></div>)}
            </div>
            <p className="mt-5 text-sm font-bold">Riwayat pembelian</p>
            <ul className="mt-2 divide-y divide-gray-100 rounded-xl border border-gray-200">
              {s.pb.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-2 px-3 py-2.5 text-sm">
                  <span><span className="font-semibold">{b.id}</span><span className="block text-xs text-gray-500">{tanggalPendek(b.tanggal)}, dibayar {rupiah(dibayarPembelian(b))}</span></span>
                  <span className="flex items-center gap-2">{utangPembelian(b) > 0 ? <Badge nada="merah">Utang {rupiah(utangPembelian(b))}</Badge> : b.statusPenerimaan === 'dipesan' ? <Badge nada="kuning">Dipesan</Badge> : <Badge nada="hijau">Lunas</Badge>}<span className="num font-bold">{rupiah(nilaiPembelian(b))}</span></span>
                </li>
              ))}
            </ul>
          </>
        )}
      </Modal>
    </>
  );
}
