import { useEffect, useState } from 'react';
import { Phone, MapPin, User, Plus } from 'lucide-react';
import { useData, pesanGalat } from '@/context/DataContext';
import { useToast } from '@/context/ToastContext';
import { Input } from '@/components/ui/FormInput';
import { EmptyState } from '@/components/ui/States';
import { useNav } from '@/context/NavContext';
import { PageHeader, Card } from '@/components/ui/Card';
import { SearchInput } from '@/components/ui/SearchInput';
import { FilterBar } from '@/components/ui/FilterBar';
import { DataTable, type Kolom } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Catatan } from '@/components/ui/States';
import type { Supplier as TSupplier } from '@/types';
import { dibayarPembelian, nilaiPembelian, utangPembelian, uangMukaPembelian } from '@/utils/finance';
import { rupiah, tanggalPendek } from '@/utils/format';

export default function Supplier() {
  const { supplier, pembelian, simpanSupplier } = useData();
  const toast = useToast();
  const [form, setForm] = useState(false);
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
      <PageHeader judul="Supplier" sub="Pemasok daging dan produk kemasan." aksi={<>
        <Button varian="garis" onClick={() => buka('pembelian')}>Lihat pembelian</Button>
        <Button ikon={<Plus className="h-4 w-4" />} onClick={() => setForm(true)}>Tambah supplier</Button>
      </>} />
      <Card className="overflow-hidden">
        <FilterBar><SearchInput value={q} onChange={setQ} placeholder="Cari supplier…" className="sm:w-72" /></FilterBar>
        {supplier.length === 0 ? <EmptyState judul="Belum ada supplier" pesan="Tambahkan pemasok sebelum membuat pembelian." aksi={<Button onClick={() => setForm(true)}>Tambah supplier</Button>} /> :
        <DataTable data={supplier.filter((x) => !q || `${x.nama} ${x.kontak}`.toLowerCase().includes(q.toLowerCase()))} kolom={kolom} rowKey={(x) => x.id} onRowClick={setDetail}
          kartuMobile={(x) => <div className="flex justify-between gap-3"><div><p className="text-sm font-semibold">{x.nama}</p><p className="text-xs text-gray-500">{x.kontak}, {x.telepon}</p></div><div className="text-right"><p className="text-[11px] text-gray-500">Utang</p><p className="num text-sm font-bold text-red-600">{rupiah(st(x.id).utang)}</p></div></div>} />}
      </Card>
      <div className="mt-4"><Catatan>Data supplier tersimpan di Google Sheets.</Catatan></div>
      <FormSupplier buka={form} onTutup={() => setForm(false)} onSimpan={async (x) => { await simpanSupplier(x); setForm(false); toast({ jenis: 'sukses', judul: 'Supplier tersimpan', pesan: x.nama }); }} />
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

function FormSupplier({ buka, onTutup, onSimpan }: { buka: boolean; onTutup: () => void; onSimpan: (s: Omit<TSupplier, 'id'>) => Promise<void> }) {
  const KOSONG = { nama: '', kontak: '', telepon: '', alamat: '', komoditas: '' };
  const [f, setF] = useState(KOSONG);
  const [err, setErr] = useState('');
  const [proses, setProses] = useState(false);
  useEffect(() => { if (buka) { setF(KOSONG); setErr(''); } }, [buka]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Modal buka={buka} onTutup={onTutup} judul="Tambah supplier" lebar="sm"
      footer={<><Button varian="garis" onClick={onTutup} disabled={proses}>Batal</Button><Button disabled={proses} onClick={async () => {
        if (!f.nama.trim()) return setErr('Nama supplier wajib diisi.');
        setProses(true); setErr('');
        try { await onSimpan(f); } catch (e) { setErr(pesanGalat(e)); } finally { setProses(false); }
      }}>{proses ? 'Menyimpan…' : 'Simpan supplier'}</Button></>}>
      <div className="space-y-4">
        <Input label="Nama supplier" value={f.nama} onChange={(e) => setF({ ...f, nama: e.target.value })} placeholder="mis. CV Sumber Sapi" />
        <Input label="Nama kontak" value={f.kontak} onChange={(e) => setF({ ...f, kontak: e.target.value })} />
        <Input label="Telepon" type="tel" inputMode="tel" value={f.telepon} onChange={(e) => setF({ ...f, telepon: e.target.value })} />
        <Input label="Alamat" value={f.alamat} onChange={(e) => setF({ ...f, alamat: e.target.value })} />
        <Input label="Komoditas" value={f.komoditas} onChange={(e) => setF({ ...f, komoditas: e.target.value })} placeholder="mis. Daging sapi" />
        {err && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{err}</p>}
      </div>
    </Modal>
  );
}
