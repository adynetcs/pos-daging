import { useEffect, useState } from 'react';
import { Plus, Truck, HandCoins, PackageCheck, Clock, Trash2, Wallet } from 'lucide-react';
import { useData, useLookup, pesanGalat } from '@/context/DataContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { PageHeader, Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/ui/StatCard';
import { FilterBar, FilterChips } from '@/components/ui/FilterBar';
import { SearchInput } from '@/components/ui/SearchInput';
import { DataTable, type Kolom } from '@/components/ui/DataTable';
import { Badge, type NadaBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { Input, Select } from '@/components/ui/FormInput';
import { Catatan } from '@/components/ui/States';
import type { Pembelian as TPembelian, StatusPenerimaan } from '@/types';
import * as F from '@/utils/finance';
import { nilaiBaris } from '@/utils/calc';
import { angka, berat, qtySatuan, rupiah, tanggalPendek } from '@/utils/format';

const TERIMA: Record<StatusPenerimaan, { label: string; nada: NadaBadge }> = {
  dipesan: { label: 'Belum diterima', nada: 'kuning' }, sebagian: { label: 'Sebagian', nada: 'biru' }, diterima: { label: 'Diterima', nada: 'hijau' },
};
const BAYAR: Record<ReturnType<typeof F.statusBayarPembelian>, { label: string; nada: NadaBadge }> = {
  lunas: { label: 'Lunas', nada: 'hijau' }, dp: { label: 'DP dibayar', nada: 'biru' }, sebagian: { label: 'Belum lunas', nada: 'merah' }, belum: { label: 'Belum dibayar', nada: 'merah' },
};

export default function Pembelian() {
  const d = useData();
  const { pembelian } = d;
  const cari = useLookup();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [f, setF] = useState<'semua' | 'utang' | 'dipesan'>('semua');
  const [detail, setDetail] = useState<string | null>(null);
  const [baru, setBaru] = useState(false);
  const [bayar, setBayar] = useState<string | null>(null);
  const { pengguna } = useAuth();

  const kgDiterima = (b: TPembelian) => b.items.filter((i) => cari.produk(i.produkId)?.satuan === 'kg').reduce((s, i) => s + i.qtyTerima, 0);
  const kgDipesan = (b: TPembelian) => b.items.filter((i) => cari.produk(i.produkId)?.satuan === 'kg').reduce((s, i) => s + i.qtyPesan, 0);
  const daftar = pembelian.filter((b) => (f === 'semua' || (f === 'utang' ? F.utangPembelian(b) > 0 : b.statusPenerimaan === 'dipesan'))
    && (!q || `${b.id} ${cari.supplier(b.supplierId)?.nama}`.toLowerCase().includes(q.toLowerCase()))).sort((a, b) => b.id.localeCompare(a.id));

  const kolom: Kolom<TPembelian>[] = [
    { key: 'id', judul: 'No. pembelian', render: (b) => <span className="font-semibold text-gray-900">{b.id}</span>, sortBy: (b) => b.id },
    { key: 's', judul: 'Supplier', render: (b) => cari.supplier(b.supplierId)?.nama },
    { key: 't', judul: 'Tanggal', render: (b) => tanggalPendek(b.tanggal) },
    { key: 'i', judul: 'Jenis daging', render: (b) => <span className="text-gray-500">{b.items.map((i) => cari.produk(i.produkId)?.nama.replace('Daging ', '')).join(', ')}</span> },
    { key: 'b', judul: 'Pesan / terima', rata: 'kanan', render: (b) => <span className="num">{berat(kgDipesan(b))} / {b.statusPenerimaan === 'dipesan' ? '-' : berat(kgDiterima(b))}</span> },
    { key: 'tot', judul: 'Total', rata: 'kanan', render: (b) => <span className="num font-semibold">{rupiah(F.nilaiPembelian(b))}</span>, sortBy: F.nilaiPembelian },
    { key: 'dp', judul: 'DP supplier', rata: 'kanan', render: (b) => <span className="num text-gray-500">{F.dpSupplier(b) ? rupiah(F.dpSupplier(b)) : '-'}</span> },
    { key: 'paid', judul: 'Dibayar', rata: 'kanan', render: (b) => <span className="num">{rupiah(F.dibayarPembelian(b))}</span> },
    { key: 'u', judul: 'Sisa utang', rata: 'kanan', render: (b) => <span className={`num font-bold ${F.utangPembelian(b) ? 'text-red-600' : 'text-gray-400'}`}>{rupiah(F.utangPembelian(b))}</span>, sortBy: F.utangPembelian },
    { key: 'st', judul: 'Penerimaan', render: (b) => <Badge nada={TERIMA[b.statusPenerimaan].nada}>{TERIMA[b.statusPenerimaan].label}</Badge> },
    { key: 'sb', judul: 'Pembayaran', render: (b) => <Badge nada={BAYAR[F.statusBayarPembelian(b)].nada}>{BAYAR[F.statusBayarPembelian(b)].label}</Badge> },
  ];

  const det = pembelian.find((b) => b.id === detail);
  const totalBulan = pembelian.filter((b) => b.statusPenerimaan !== 'dipesan').reduce((s, b) => s + F.nilaiPembelian(b), 0);

  return (
    <>
      <PageHeader judul="Pembelian" sub="Pembelian daging dari supplier. Masuk ke persediaan, bukan beban."
        aksi={pengguna?.peran !== 'kasir' ? <Button ikon={<Plus className="h-4 w-4" />} onClick={() => setBaru(true)}>Buat pembelian</Button> : undefined} />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Pembelian diterima" nilai={rupiah(totalBulan)} ikon={Truck} warna="abu" keterangan="sejak awal pencatatan" />
        <StatCard label="Utang supplier" nilai={rupiah(F.utangSupplier(d).total)} ikon={HandCoins} warna="merah" onClick={() => setF('utang')} />
        <StatCard label="Uang muka pembelian" nilai={rupiah(F.uangMukaSupplier(d))} ikon={Wallet} warna="biru" keterangan="aset, barang belum datang" />
        <StatCard label="Menunggu barang" nilai={pembelian.filter((b) => b.statusPenerimaan === 'dipesan').length} ikon={Clock} warna="kuning" onClick={() => setF('dipesan')} />
      </div>
      <Card className="overflow-hidden">
        <FilterBar>
          <SearchInput value={q} onChange={setQ} placeholder="Cari supplier atau nomor…" className="sm:w-72" />
          <FilterChips value={f} onChange={setF} opsi={[{ nilai: 'semua', label: 'Semua' }, { nilai: 'utang', label: 'Ada utang' }, { nilai: 'dipesan', label: 'Belum diterima' }]} />
        </FilterBar>
        <DataTable data={daftar} kolom={kolom} rowKey={(b) => b.id} onRowClick={(b) => setDetail(b.id)}
          kartuMobile={(b) => (
            <div>
              <div className="flex justify-between gap-2"><span className="text-sm font-bold">{cari.supplier(b.supplierId)?.nama}</span><span className="num text-sm font-bold">{rupiah(F.nilaiPembelian(b))}</span></div>
              <p className="text-xs text-gray-500">{b.id}, {tanggalPendek(b.tanggal)}</p>
              <div className="mt-2 flex flex-wrap gap-1.5"><Badge nada={TERIMA[b.statusPenerimaan].nada}>{TERIMA[b.statusPenerimaan].label}</Badge><Badge nada={BAYAR[F.statusBayarPembelian(b)].nada}>{BAYAR[F.statusBayarPembelian(b)].label}</Badge></div>
            </div>
          )} />
      </Card>
      <div className="mt-4"><Catatan>DP ke supplier dicatat sebagai uang muka pembelian. Biaya operasional (sewa, gaji, BBM) dicatat di Keuangan.</Catatan></div>

      <Modal buka={!!det} onTutup={() => setDetail(null)} judul={det?.id ?? ''} sub={det ? `${cari.supplier(det.supplierId)?.nama}, ${tanggalPendek(det.tanggal)}` : ''} lebar="lg"
        footer={det && <>{F.utangPembelian(det) > 0 && <Button ikon={<Wallet className="h-4 w-4" />} onClick={() => setBayar(det.id)}>Bayar supplier</Button>}<Button varian="garis" onClick={() => setDetail(null)}>Tutup</Button></>}>
        {det && (
          <>
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="bg-gray-50"><tr><th className="th">Produk</th><th className="th text-right">Dipesan</th><th className="th text-right">Diterima</th><th className="th text-right">Selisih</th><th className="th text-right">Harga beli</th><th className="th text-right">Subtotal</th></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {det.items.map((i) => {
                    const p = cari.produk(i.produkId)!;
                    const sel = det.statusPenerimaan === 'dipesan' ? 0 : i.qtyPesan - i.qtyTerima;
                    return (
                      <tr key={i.produkId}>
                        <td className="td font-medium">{p.nama}</td>
                        <td className="td num text-right">{qtySatuan(i.qtyPesan, p.satuan)}</td>
                        <td className="td num text-right">{det.statusPenerimaan === 'dipesan' ? '-' : qtySatuan(i.qtyTerima, p.satuan)}</td>
                        <td className={`td num text-right ${sel > 0 ? 'text-amber-700' : 'text-gray-400'}`}>{sel > 0 ? `−${qtySatuan(sel, p.satuan)}` : '-'}</td>
                        <td className="td num text-right">{rupiah(i.harga)}</td>
                        <td className="td num text-right font-semibold">{rupiah(nilaiBaris(det.statusPenerimaan === 'dipesan' ? i.qtyPesan : i.qtyTerima, i.harga))}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm font-bold">Pembayaran</p>
                <ul className="mt-2 space-y-2">
                  {det.pembayaran.map((p) => (
                    <li key={p.id} className="flex justify-between rounded-xl border border-gray-200 px-3 py-2 text-sm">
                      <span><span className="font-semibold">{p.jenis === 'dp' ? 'Uang muka (DP)' : p.jenis === 'lunas' ? 'Lunas' : 'Pelunasan'}</span><span className="block text-xs text-gray-500">{tanggalPendek(p.tanggal)}, {p.id}</span></span>
                      <span className="num font-bold">{rupiah(p.jumlah)}</span>
                    </li>
                  ))}
                  {!det.pembayaran.length && <li className="text-sm text-gray-500">Belum ada pembayaran.</li>}
                </ul>
              </div>
              <dl className="space-y-2 rounded-xl bg-gray-50 p-4 text-sm">
                <div className="flex justify-between"><dt className="text-gray-500">Nilai barang</dt><dd className="num">{rupiah(F.nilaiPembelian(det) - det.biayaTambahan)}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Biaya tambahan ({det.keteranganBiaya ?? '-'})</dt><dd className="num">{rupiah(det.biayaTambahan)}</dd></div>
                <div className="flex justify-between font-bold"><dt>Total pembelian</dt><dd className="num">{rupiah(F.nilaiPembelian(det))}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Total dibayar</dt><dd className="num">{rupiah(F.dibayarPembelian(det))}</dd></div>
                <div className="flex justify-between border-t border-gray-200 pt-2 font-bold"><dt>Sisa utang</dt><dd className="num text-red-600">{rupiah(F.utangPembelian(det))}</dd></div>
                {det.statusPenerimaan === 'dipesan' && <p className="pt-1 text-xs text-gray-500">Barang belum diterima: DP dicatat sebagai uang muka, utang belum timbul. Terima barang lewat menu Stok.</p>}
                <p className="pt-1 text-xs text-gray-500">Biaya tambahan (ongkir/es) menambah nilai persediaan, bukan beban operasional.</p>
              </dl>
            </div>
          </>
        )}
      </Modal>

      <BayarSupplier id={bayar} onTutup={() => setBayar(null)} onSelesai={(id, jumlah) => { setBayar(null); toast({ jenis: 'sukses', judul: 'Pembayaran supplier tersimpan', pesan: `${rupiah(jumlah)} untuk ${id}.` }); }} />
      {baru && <FormPembelian onTutup={() => setBaru(false)} onSelesai={(id) => { setBaru(false); setDetail(null); toast({ jenis: 'sukses', judul: `Pembelian ${id} tersimpan`, pesan: 'Terima barang lewat menu Stok saat barang datang.' }); }} />}
    </>
  );
}

function BayarSupplier({ id, onTutup, onSelesai }: { id: string | null; onTutup: () => void; onSelesai: (id: string, jumlah: number) => void }) {
  const { pembelian, bayarPembelian } = useData();
  const b = pembelian.find((x) => x.id === id);
  const [n, setN] = useState('');
  const [metode, setMetode] = useState<'tunai' | 'transfer' | 'qris'>('transfer');
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState('');
  useEffect(() => { if (id) { const x = pembelian.find((y) => y.id === id); setN(x ? String(F.utangPembelian(x)) : ''); setGalat(''); } }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!b) return null;
  const v = parseInt(n.replace(/\D/g, ''), 10) || 0;
  const sisa = F.utangPembelian(b);
  return (
    <Modal buka onTutup={onTutup} judul="Bayar supplier" sub={`${b.id}, sisa utang ${rupiah(sisa)}`} lebar="sm"
      footer={<><Button varian="garis" onClick={onTutup} disabled={proses}>Batal</Button><Button disabled={!v || v > sisa || proses} onClick={async () => {
        setProses(true); setGalat('');
        try { await bayarPembelian(b.id, v, metode); onSelesai(b.id, v); } catch (e) { setGalat(pesanGalat(e)); } finally { setProses(false); }
      }}>{proses ? 'Menyimpan…' : 'Simpan pembayaran'}</Button></>}>
      <div className="space-y-4">
        <Input label="Nominal" awalan="Rp" inputMode="numeric" value={v ? angka(v) : ''} onChange={(e) => setN(e.target.value)} error={v > sisa ? 'Melebihi sisa utang.' : undefined} bantuan="Mengurangi utang supplier dan saldo kas." />
        <Select label="Metode" value={metode} onChange={(e) => setMetode(e.target.value as 'tunai' | 'transfer' | 'qris')} opsi={[{ nilai: 'transfer', label: 'Transfer' }, { nilai: 'tunai', label: 'Tunai' }, { nilai: 'qris', label: 'QRIS' }]} />
        {galat && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{galat}</p>}
      </div>
    </Modal>
  );
}

function FormPembelian({ onTutup, onSelesai }: { onTutup: () => void; onSelesai: (id: string) => void }) {
  const { supplier, produk, buatPembelian } = useData();
  const awal = produk.find((p) => p.aktif) ?? produk[0];
  const [sid, setSid] = useState(supplier[0]?.id ?? '');
  const [items, setItems] = useState<{ produkId: string; qty: string; harga: string }[]>(awal ? [{ produkId: awal.id, qty: '', harga: String(awal.hpp) }] : []);
  const [biaya, setBiaya] = useState('');
  const [dp, setDp] = useState('');
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState('');
  const num = (s: string) => parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;
  const total = items.reduce((s, i) => s + nilaiBaris(num(i.qty), num(i.harga)), 0) + num(biaya);
  const vdp = num(dp);
  const valid = !!sid && items.some((i) => num(i.qty) > 0) && vdp <= total;
  const simpan = async () => {
    setProses(true); setGalat('');
    try {
      const id = await buatPembelian({
        id_supplier: sid, biaya_tambahan: num(biaya), ket_biaya: 'Ongkir', dp: vdp, metode: 'transfer',
        items: items.filter((i) => num(i.qty) > 0).map((i) => ({ id_produk: i.produkId, qty: num(i.qty), harga: num(i.harga) })),
      });
      onSelesai(id);
    } catch (e) { setGalat(pesanGalat(e)); } finally { setProses(false); }
  };
  if (!supplier.length || !produk.length) {
    return (
      <Modal buka onTutup={onTutup} judul="Buat pembelian" lebar="sm">
        <p className="text-sm text-gray-600">{!supplier.length ? 'Belum ada supplier. Tambahkan supplier dulu di menu Supplier.' : 'Belum ada produk. Tambahkan produk dulu di menu Produk.'}</p>
      </Modal>
    );
  }
  return (
    <Modal buka onTutup={onTutup} judul="Buat pembelian" sub="Pesanan ke supplier. Stok bertambah setelah barang diterima." lebar="lg"
      footer={<><Button varian="garis" onClick={onTutup} disabled={proses}>Batal</Button><Button disabled={!valid || proses} onClick={() => void simpan()}>{proses ? 'Menyimpan…' : 'Simpan pembelian'}</Button></>}>
      <Select label="Supplier" value={sid} onChange={(e) => setSid(e.target.value)} opsi={supplier.map((s) => ({ nilai: s.id, label: `${s.nama} (${s.komoditas})` }))} />
      <div className="mt-4 space-y-2">
        {items.map((it, k) => (
          <div key={k} className="grid grid-cols-[1fr_auto] gap-2 rounded-xl bg-gray-50 p-3 sm:grid-cols-[1.6fr_1fr_1fr_auto] sm:items-end">
            <div className="col-span-2 sm:col-span-1"><label className="text-xs font-semibold text-gray-600">Produk</label>
              <select className="input mt-1" value={it.produkId} onChange={(e) => setItems((l) => l.map((x, j) => (j === k ? { ...x, produkId: e.target.value, harga: String(produk.find((p) => p.id === e.target.value)!.hpp) } : x)))}>
                {produk.map((p) => <option key={p.id} value={p.id}>{p.nama}</option>)}</select></div>
            <div><label className="text-xs font-semibold text-gray-600">Berat/jumlah pesan</label><input inputMode="decimal" className="input num mt-1" value={it.qty} onChange={(e) => setItems((l) => l.map((x, j) => (j === k ? { ...x, qty: e.target.value } : x)))} /></div>
            <div><label className="text-xs font-semibold text-gray-600">Harga beli</label><input inputMode="numeric" className="input num mt-1" value={angka(num(it.harga))} onChange={(e) => setItems((l) => l.map((x, j) => (j === k ? { ...x, harga: e.target.value.replace(/\D/g, '') } : x)))} /></div>
            <button className="row-start-1 col-start-2 self-start rounded-lg p-2 text-gray-400 hover:text-red-600 sm:row-auto sm:col-auto sm:self-end" onClick={() => setItems((l) => l.filter((_, j) => j !== k))} aria-label="Hapus"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
        <Button varian="hantu" ukur="sm" ikon={<Plus className="h-4 w-4" />} onClick={() => setItems((l) => [...l, { produkId: awal.id, qty: '', harga: String(awal.hpp) }])}>Tambah item</Button>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Input label="Biaya tambahan (ongkir, es)" awalan="Rp" inputMode="numeric" value={num(biaya) ? angka(num(biaya)) : ''} onChange={(e) => setBiaya(e.target.value.replace(/\D/g, ''))} />
        <Input label="DP ke supplier" awalan="Rp" inputMode="numeric" value={vdp ? angka(vdp) : ''} onChange={(e) => setDp(e.target.value.replace(/\D/g, ''))} error={vdp > total ? 'Melebihi total.' : undefined} bantuan="Dicatat sebagai uang muka" />
        <div className="rounded-xl border border-gray-200 p-3"><p className="text-xs text-gray-500">Estimasi total</p><p className="num text-lg font-extrabold">{rupiah(total)}</p><p className="text-xs text-gray-500">Final mengikuti berat diterima</p></div>
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-gray-500"><PackageCheck className="h-4 w-4" />Status awal: belum diterima. DP dicatat sebagai uang muka (transfer).</div>
      {galat && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{galat}</p>}
    </Modal>
  );
}
