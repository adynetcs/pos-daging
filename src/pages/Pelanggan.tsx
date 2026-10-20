import { useEffect, useState } from 'react';
import { Plus, Phone, MapPin } from 'lucide-react';
import { useData, pesanGalat } from '@/context/DataContext';
import { useToast } from '@/context/ToastContext';
import { PageHeader, Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FilterBar, FilterChips } from '@/components/ui/FilterBar';
import { SearchInput } from '@/components/ui/SearchInput';
import { DataTable, type Kolom } from '@/components/ui/DataTable';
import { Badge, StatusPesananBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { Input, Select } from '@/components/ui/FormInput';
import { Catatan, EmptyState } from '@/components/ui/States';
import type { JenisPelanggan, Pelanggan as TPelanggan } from '@/types';
import { piutang, totalPesanan, totalTrx } from '@/utils/finance';
import { TerimaPiutangModal, type Piutang } from '@/components/bisnis/TerimaPiutang';
import { rupiah, tanggalPendek } from '@/utils/format';

export default function Pelanggan() {
  const d = useData();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [j, setJ] = useState<'semua' | JenisPelanggan>('semua');
  const [detail, setDetail] = useState<TPelanggan | null>(null);
  const [form, setForm] = useState(false);
  const [terima, setTerima] = useState<Piutang | null>(null);
  const pi = piutang(d);

  const statistik = (id: string) => {
    const trx = d.transaksi.filter((t) => t.pelangganId === id);
    const ps = d.pesanan.filter((p) => p.pelangganId === id && p.status !== 'batal');
    return {
      jumlah: trx.length + ps.length,
      nilai: trx.reduce((s, t) => s + totalTrx(t), 0) + ps.reduce((s, p) => s + totalPesanan(p), 0),
      piutang: pi.semua.filter((x) => x.pelangganId === id).reduce((s, x) => s + x.nilai, 0),
      trx, ps,
    };
  };
  const daftar = d.pelanggan.filter((c) => c.id !== 'PLG-0000' && (j === 'semua' || c.jenis === j) && (!q || `${c.nama} ${c.telepon}`.toLowerCase().includes(q.toLowerCase())));

  const kolom: Kolom<TPelanggan>[] = [
    { key: 'n', judul: 'Nama', render: (c) => <span className="font-semibold text-gray-900">{c.nama}</span>, sortBy: (c) => c.nama },
    { key: 't', judul: 'Telepon', render: (c) => c.telepon },
    { key: 'a', judul: 'Alamat', render: (c) => <span className="block max-w-[260px] truncate text-gray-500">{c.alamat}</span> },
    { key: 'j', judul: 'Jenis', render: (c) => <Badge nada={c.jenis === 'partai' ? 'brand' : 'abu'} titik={false}>{c.jenis === 'partai' ? 'Partai' : 'Eceran'}</Badge> },
    { key: 'x', judul: 'Transaksi', rata: 'kanan', render: (c) => <span className="num">{statistik(c.id).jumlah}</span>, sortBy: (c) => statistik(c.id).jumlah },
    { key: 'v', judul: 'Total belanja', rata: 'kanan', render: (c) => <span className="num">{rupiah(statistik(c.id).nilai)}</span>, sortBy: (c) => statistik(c.id).nilai },
    { key: 'p', judul: 'Piutang', rata: 'kanan', render: (c) => { const v = statistik(c.id).piutang; return <span className={`num font-bold ${v ? 'text-brand-800' : 'text-gray-400'}`}>{rupiah(v)}</span>; }, sortBy: (c) => statistik(c.id).piutang },
  ];
  const s = detail ? statistik(detail.id) : null;

  return (
    <>
      <PageHeader judul="Pelanggan" sub={`Total piutang ${rupiah(pi.total)} dari ${pi.jumlahPelanggan} pelanggan.`} aksi={<Button ikon={<Plus className="h-4 w-4" />} onClick={() => setForm(true)}>Tambah pelanggan</Button>} />
      <Card className="overflow-hidden">
        <FilterBar>
          <SearchInput value={q} onChange={setQ} placeholder="Cari nama atau telepon…" className="sm:w-72" />
          <FilterChips value={j} onChange={setJ} opsi={[{ nilai: 'semua', label: 'Semua' }, { nilai: 'partai', label: 'Partai' }, { nilai: 'eceran', label: 'Eceran' }]} />
        </FilterBar>
        <DataTable data={daftar} kolom={kolom} rowKey={(c) => c.id} onRowClick={setDetail}
          kartuMobile={(c) => (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0"><p className="truncate text-sm font-semibold">{c.nama}</p><p className="text-xs text-gray-500">{c.telepon}, {c.jenis}</p></div>
              <div className="text-right"><p className="text-[11px] text-gray-500">Piutang</p><p className="num text-sm font-bold text-brand-800">{rupiah(statistik(c.id).piutang)}</p></div>
            </div>
          )} />
      </Card>
      <div className="mt-4"><Catatan>Transaksi kasir tanpa nama tercatat sebagai Pelanggan Umum. Piutang = transaksi tempo dan sisa tagihan pesanan yang sudah dikirim.</Catatan></div>

      <Modal buka={!!detail} onTutup={() => setDetail(null)} judul={detail?.nama ?? ''} sub={detail?.jenis === 'partai' ? 'Pelanggan partai' : 'Pelanggan eceran'} lebar="md">
        {detail && s && (
          <>
            <div className="space-y-1.5 text-sm">
              <p className="flex gap-2"><Phone className="h-4 w-4 text-gray-400" />{detail.telepon}</p>
              <p className="flex gap-2"><MapPin className="h-4 w-4 shrink-0 text-gray-400" />{detail.alamat}</p>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              {[['Transaksi', String(s.jumlah)], ['Total belanja', rupiah(s.nilai)], ['Piutang', rupiah(s.piutang)]].map(([a, b]) => (
                <div key={a} className="rounded-xl bg-gray-50 p-3"><p className="text-xs text-gray-500">{a}</p><p className="num text-sm font-bold">{b}</p></div>
              ))}
            </div>
            {pi.semua.some((x) => x.pelangganId === detail.id) && (
              <>
                <p className="mt-5 text-sm font-bold">Piutang belum lunas</p>
                <ul className="mt-2 divide-y divide-gray-100 rounded-xl border border-amber-200 bg-amber-50/40">
                  {pi.semua.filter((x) => x.pelangganId === detail.id).map((x) => (
                    <li key={x.ref} className="flex items-center justify-between gap-2 px-3 py-2.5 text-sm">
                      <span><span className="font-semibold">{x.ref}</span><span className="block text-xs text-gray-500">{x.sumber}, {tanggalPendek(x.tanggal)}</span></span>
                      <span className="flex items-center gap-2"><span className="num font-bold text-brand-800">{rupiah(x.nilai)}</span><Button ukur="sm" varian="garis" onClick={() => setTerima(x)}>Terima bayar</Button></span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <p className="mt-5 text-sm font-bold">Riwayat transaksi</p>
            {s.jumlah === 0 ? <EmptyState judul="Belum ada transaksi" /> : (
              <ul className="mt-2 divide-y divide-gray-100 rounded-xl border border-gray-200">
                {s.ps.map((p) => <li key={p.id} className="flex items-center justify-between gap-2 px-3 py-2.5 text-sm"><span><span className="font-semibold">{p.id}</span><span className="block text-xs text-gray-500">Pesanan partai, {tanggalPendek(p.tanggal)}</span></span><span className="flex items-center gap-2"><StatusPesananBadge status={p.status} /><span className="num font-bold">{rupiah(totalPesanan(p))}</span></span></li>)}
                {[...s.trx].reverse().slice(0, 8).map((t) => <li key={t.id} className="flex items-center justify-between gap-2 px-3 py-2.5 text-sm"><span><span className="font-semibold">{t.id}</span><span className="block text-xs text-gray-500">Kasir, {tanggalPendek(t.tanggal)}{t.pembayaran.some((b) => b.metode === 'tempo') ? ', tempo' : ''}</span></span><span className="num font-bold">{rupiah(totalTrx(t))}</span></li>)}
              </ul>
            )}
          </>
        )}
      </Modal>
      <TerimaPiutangModal piutang={terima} onTutup={() => setTerima(null)} />
      <FormPelanggan buka={form} onTutup={() => setForm(false)} onSimpan={async (c) => { await d.simpanPelanggan(c); setForm(false); toast({ jenis: 'sukses', judul: 'Pelanggan tersimpan', pesan: c.nama }); }} />
    </>
  );
}

function FormPelanggan({ buka, onTutup, onSimpan }: { buka: boolean; onTutup: () => void; onSimpan: (c: Omit<TPelanggan, 'id'>) => Promise<void> }) {
  const KOSONG = { nama: '', telepon: '', alamat: '', jenis: 'eceran' as JenisPelanggan };
  const [f, setF] = useState(KOSONG);
  const [err, setErr] = useState('');
  const [proses, setProses] = useState(false);
  useEffect(() => { if (buka) { setF(KOSONG); setErr(''); } }, [buka]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Modal buka={buka} onTutup={onTutup} judul="Tambah pelanggan" lebar="sm"
      footer={<><Button varian="garis" onClick={onTutup} disabled={proses}>Batal</Button><Button disabled={proses} onClick={async () => {
        if (!f.nama.trim()) return setErr('Nama wajib diisi.');
        setProses(true); setErr('');
        try { await onSimpan(f); } catch (e) { setErr(pesanGalat(e)); } finally { setProses(false); }
      }}>{proses ? 'Menyimpan…' : 'Simpan pelanggan'}</Button></>}>
      <div className="space-y-4">
        <Input label="Nama" value={f.nama} error={err && !f.nama.trim() ? err : undefined} onChange={(e) => setF({ ...f, nama: e.target.value })} />
        <Input label="Nomor telepon" type="tel" inputMode="tel" value={f.telepon} onChange={(e) => setF({ ...f, telepon: e.target.value })} placeholder="08…" />
        <Input label="Alamat" value={f.alamat} onChange={(e) => setF({ ...f, alamat: e.target.value })} />
        <Select label="Jenis pelanggan" value={f.jenis} onChange={(e) => setF({ ...f, jenis: e.target.value as JenisPelanggan })} opsi={[{ nilai: 'eceran', label: 'Eceran' }, { nilai: 'partai', label: 'Partai (pesanan besar)' }]} />
        {err && f.nama.trim() && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{err}</p>}
      </div>
    </Modal>
  );
}
