import { useMemo, useState } from 'react';
import { PiggyBank, ArrowDownToLine, ArrowUpFromLine, Wallet, Landmark, Plus, Info, HandCoins, Receipt } from 'lucide-react';
import { useData, useLookup } from '@/context/DataContext';
import { useToast } from '@/context/ToastContext';
import { PageHeader, Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/ui/StatCard';
import { Tabs, FilterChips } from '@/components/ui/FilterBar';
import { DataTable, type Kolom } from '@/components/ui/DataTable';
import { Badge, type NadaBadge } from '@/components/ui/StatusBadge';
import { BarChart } from '@/components/charts/Charts';
import { Modal } from '@/components/ui/Modal';
import { Input, Select } from '@/components/ui/FormInput';
import { DatePicker } from '@/components/ui/DatePicker';
import { CatatanDemo } from '@/components/ui/States';
import { HARI_INI } from '@/data/dummy';
import type { BarisKas, MutasiModal, Pengeluaran, SumberKas } from '@/types';
import * as F from '@/utils/finance';
import { angka, rupiah, tanggalLabel, tanggalPendek } from '@/utils/format';

type Tab = 'ringkasan' | 'kas' | 'modal' | 'pengeluaran' | 'piutang' | 'utang' | 'labarugi';

export const SUMBER_KAS: Record<SumberKas, { label: string; nada: NadaBadge }> = {
  modal: { label: 'Modal masuk', nada: 'ungu' },
  penarikan_modal: { label: 'Penarikan modal', nada: 'ungu' },
  penjualan_eceran: { label: 'Penjualan eceran', nada: 'hijau' },
  dp_pelanggan: { label: 'DP pelanggan', nada: 'biru' },
  pelunasan_pelanggan: { label: 'Pelunasan pelanggan', nada: 'hijau' },
  dp_supplier: { label: 'Uang muka pembelian', nada: 'kuning' },
  bayar_supplier: { label: 'Bayar supplier', nada: 'brand' },
  pengeluaran: { label: 'Beban operasional', nada: 'merah' },
};

const PERIODE = '1–12 Oktober 2026';

export default function Keuangan() {
  const d = useData();
  const cari = useLookup();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('ringkasan');
  const [fKas, setFKas] = useState<'semua' | 'masuk' | 'keluar'>('semua');
  const [formModal, setFormModal] = useState(false);
  const [formBeban, setFormBeban] = useState(false);

  const lr = F.labaRugi(d);
  const md = F.ringkasanModal(d);
  const kas = F.ringkasanKas(d);
  const pi = F.piutang(d);
  const ut = F.utangSupplier(d);
  const rek = F.rekonsiliasiKas(d);

  const buku = useMemo(() => {
    let s = 0;
    return F.bukuKas(d).map((b) => ({ ...b, saldo: (s += b.masuk - b.keluar) })).reverse();
  }, [d]);
  const harian = useMemo(() => F.rentangHari(HARI_INI, 12).map((h) => {
    const r = F.bukuKas(d).filter((b) => b.tanggal.startsWith(h));
    return { label: tanggalLabel(h), nilai: [r.reduce((s, x) => s + x.masuk, 0), r.reduce((s, x) => s + x.keluar, 0)] };
  }), [d]);

  const kolomKas: Kolom<BarisKas & { saldo: number }>[] = [
    { key: 't', judul: 'Tanggal', render: (b) => tanggalPendek(b.tanggal), sortBy: (b) => b.tanggal },
    { key: 's', judul: 'Jenis', render: (b) => <Badge nada={SUMBER_KAS[b.sumber].nada}>{SUMBER_KAS[b.sumber].label}</Badge> },
    { key: 'k', judul: 'Keterangan', render: (b) => <div><p className="text-gray-900">{b.keterangan}</p><p className="text-xs text-gray-500">{b.referensi}</p></div> },
    { key: 'm', judul: 'Masuk', rata: 'kanan', render: (b) => b.masuk ? <span className="num font-semibold text-emerald-700">{rupiah(b.masuk)}</span> : <span className="text-gray-300">-</span> },
    { key: 'o', judul: 'Keluar', rata: 'kanan', render: (b) => b.keluar ? <span className="num font-semibold text-red-600">{rupiah(b.keluar)}</span> : <span className="text-gray-300">-</span> },
    { key: 'sl', judul: 'Saldo', rata: 'kanan', render: (b) => <span className="num font-bold">{rupiah(b.saldo)}</span> },
  ];

  return (
    <>
      <PageHeader judul="Keuangan" sub={`Periode ${PERIODE}`}
        aksi={<>
          <Button varian="garis" ikon={<PiggyBank className="h-4 w-4" />} onClick={() => setFormModal(true)}>Catat modal</Button>
          <Button ikon={<Plus className="h-4 w-4" />} onClick={() => setFormBeban(true)}>Catat pengeluaran</Button>
        </>} />

      <Card className="mb-4 overflow-hidden">
        <div className="px-4 pt-1">
          <Tabs<Tab> value={tab} onChange={setTab} opsi={[
            { nilai: 'ringkasan', label: 'Ringkasan' }, { nilai: 'kas', label: 'Arus kas' }, { nilai: 'modal', label: 'Modal' },
            { nilai: 'pengeluaran', label: 'Pengeluaran' }, { nilai: 'piutang', label: 'Piutang' }, { nilai: 'utang', label: 'Utang supplier' }, { nilai: 'labarugi', label: 'Laba rugi' },
          ]} />
        </div>
      </Card>

      {tab === 'ringkasan' && (
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-bold text-gray-700">Kas & modal</p>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6">
              <StatCard label="Modal awal" nilai={rupiah(md.awal)} ikon={PiggyBank} warna="abu" />
              <StatCard label="Modal masuk" nilai={rupiah(md.tambahan)} ikon={ArrowDownToLine} warna="abu" keterangan="setoran tambahan" />
              <StatCard label="Penarikan modal" nilai={rupiah(md.penarikan)} ikon={ArrowUpFromLine} warna="abu" keterangan="prive, bukan beban" />
              <StatCard label="Total uang masuk" nilai={rupiah(kas.masuk)} ikon={ArrowDownToLine} warna="hijau" keterangan={`${rupiah(kas.masukOperasi)} dari usaha`} />
              <StatCard label="Total uang keluar" nilai={rupiah(kas.keluar)} ikon={ArrowUpFromLine} warna="merah" />
              <StatCard label="Saldo kas" nilai={rupiah(kas.saldo)} ikon={Wallet} warna="brand" keterangan="bukan laba" onClick={() => setTab('kas')} />
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-bold text-gray-700">Kinerja usaha</p>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
              <StatCard label="Omzet" nilai={rupiah(lr.omzet)} ikon={Receipt} warna="brand" keterangan="eceran + partai selesai" onClick={() => setTab('labarugi')} />
              <StatCard label="HPP" nilai={rupiah(lr.hpp)} ikon={Landmark} warna="abu" keterangan="modal barang terjual" />
              <StatCard label="Laba kotor" nilai={rupiah(lr.labaKotor)} ikon={HandCoins} warna="hijau" keterangan={`margin ${angka(lr.marginKotor * 100, 1)}%`} />
              <StatCard label="Beban operasional" nilai={rupiah(lr.beban)} ikon={ArrowUpFromLine} warna="kuning" onClick={() => setTab('pengeluaran')} />
              <StatCard label="Laba bersih" nilai={rupiah(lr.labaBersih)} ikon={Wallet} warna={lr.labaBersih >= 0 ? 'hijau' : 'merah'} />
            </div>
          </div>

          <div className="grid items-start gap-4 xl:grid-cols-5">
            <Card className="xl:col-span-3">
              <CardHeader judul="Uang masuk vs keluar per hari" sub="Termasuk modal dan pembayaran supplier" />
              <div className="px-3 pb-4"><BarChart data={harian} seri={[{ nama: 'Masuk', warna: '#16A34A' }, { nama: 'Keluar', warna: '#B23A45' }]} /></div>
            </Card>
            <Card className="xl:col-span-2">
              <CardHeader judul="Kenapa saldo kas berbeda dari laba?" sub="Rekonsiliasi saldo kas akhir" />
              <ul className="divide-y divide-gray-100 border-t border-gray-100 text-sm">
                {rek.baris.map((b) => (
                  <li key={b.label} className="flex items-start justify-between gap-3 px-5 py-2.5">
                    <div><p className="font-medium text-gray-800">{b.label}</p><p className="text-xs text-gray-500">{b.ket}</p></div>
                    <span className={`num shrink-0 font-semibold ${b.nilai < 0 ? 'text-red-600' : 'text-gray-900'}`}>{b.nilai < 0 ? '−' : '+'} {rupiah(Math.abs(b.nilai))}</span>
                  </li>
                ))}
                <li className="flex justify-between bg-gray-50 px-5 py-3 font-bold"><span>Saldo kas</span><span className="num">{rupiah(rek.hitung)}</span></li>
              </ul>
              {rek.selisih !== 0 && <p className="px-5 py-2 text-xs text-amber-700">Selisih pembulatan {rupiah(rek.selisih)}.</p>}
            </Card>
          </div>

          <Card className="p-5">
            <div className="flex gap-3">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" />
              <div className="text-sm text-gray-700">
                <p className="font-bold text-gray-900">Aturan pencatatan yang dipakai</p>
                <ul className="mt-2 grid gap-x-8 gap-y-1.5 sm:grid-cols-2">
                  <li>Modal masuk bukan omzet, penarikan modal bukan beban.</li>
                  <li>Saldo kas bukan laba (lihat rekonsiliasi di atas).</li>
                  <li>Pembelian stok masuk ke persediaan; hanya yang terjual menjadi HPP.</li>
                  <li>DP pelanggan adalah bagian dari nilai pesanan, diakui omzet saat pesanan selesai.</li>
                  <li>DP ke supplier dicatat sebagai uang muka pembelian, bukan beban.</li>
                  <li>Setiap pembayaran tercatat satu kali di buku kas, tidak dihitung ganda.</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      )}

      {tab === 'kas' && (
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <FilterChips value={fKas} onChange={setFKas} opsi={[{ nilai: 'semua', label: 'Semua' }, { nilai: 'masuk', label: 'Uang masuk' }, { nilai: 'keluar', label: 'Uang keluar' }]} />
            <p className="text-sm text-gray-500">Saldo akhir <span className="num font-bold text-gray-900">{rupiah(kas.saldo)}</span></p>
          </div>
          <DataTable data={buku.filter((b) => fKas === 'semua' || (fKas === 'masuk' ? b.masuk > 0 : b.keluar > 0))} kolom={kolomKas} rowKey={(b) => b.id} perHalaman={12}
            kartuMobile={(b) => (
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0"><p className="truncate text-sm font-semibold">{b.keterangan}</p><p className="text-xs text-gray-500">{tanggalPendek(b.tanggal)}, {SUMBER_KAS[b.sumber].label}</p></div>
                <div className="text-right"><p className={`num text-sm font-bold ${b.masuk ? 'text-emerald-700' : 'text-red-600'}`}>{b.masuk ? '+' : '−'}{rupiah(b.masuk || b.keluar)}</p><p className="num text-xs text-gray-500">saldo {rupiah(b.saldo)}</p></div>
              </div>
            )} />
        </Card>
      )}

      {tab === 'modal' && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="p-5">
            <p className="text-sm text-gray-500">Modal bersih pemilik</p>
            <p className="num mt-1 text-2xl font-extrabold">{rupiah(md.bersih)}</p>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-gray-500">Modal awal</dt><dd className="num">{rupiah(md.awal)}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Modal masuk</dt><dd className="num">+ {rupiah(md.tambahan)}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Penarikan</dt><dd className="num text-red-600">− {rupiah(md.penarikan)}</dd></div>
            </dl>
            <p className="mt-4 rounded-xl bg-gray-50 p-3 text-xs text-gray-600">Modal adalah uang pemilik yang ditanam ke usaha. Tidak dihitung sebagai omzet maupun laba.</p>
          </Card>
          <Card className="overflow-hidden lg:col-span-2">
            <CardHeader judul="Riwayat modal" aksi={<Button ukur="sm" varian="garis" onClick={() => setFormModal(true)}>Catat modal</Button>} />
            <DataTable data={[...d.modal].reverse()} rowKey={(m) => m.id} kolom={[
              { key: 't', judul: 'Tanggal', render: (m) => tanggalPendek(m.tanggal) },
              { key: 'j', judul: 'Jenis', render: (m) => <Badge nada={m.jenis === 'penarikan' ? 'merah' : 'ungu'}>{m.jenis === 'awal' ? 'Modal awal' : m.jenis === 'tambahan' ? 'Modal masuk' : 'Penarikan'}</Badge> },
              { key: 'k', judul: 'Keterangan', render: (m) => m.keterangan },
              { key: 'n', judul: 'Jumlah', rata: 'kanan', render: (m) => <span className={`num font-bold ${m.jenis === 'penarikan' ? 'text-red-600' : ''}`}>{m.jenis === 'penarikan' ? '−' : '+'}{rupiah(m.jumlah)}</span> },
            ]} />
          </Card>
        </div>
      )}

      {tab === 'pengeluaran' && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="p-5">
            <p className="text-sm text-gray-500">Total beban operasional</p>
            <p className="num mt-1 text-2xl font-extrabold">{rupiah(lr.beban)}</p>
            <ul className="mt-4 space-y-3">
              {[...lr.bebanPerKategori].sort((a, b) => b.nilai - a.nilai).map((k) => (
                <li key={k.kategori}>
                  <div className="flex justify-between text-sm"><span>{k.kategori}</span><span className="num font-semibold">{rupiah(k.nilai)}</span></div>
                  <div className="mt-1 h-1.5 rounded-full bg-gray-100"><div className="h-full rounded-full bg-brand-600" style={{ width: `${(k.nilai / lr.beban) * 100}%` }} /></div>
                </li>
              ))}
            </ul>
            <p className="mt-4 rounded-xl bg-gray-50 p-3 text-xs text-gray-600">Pembelian daging dari supplier tidak dicatat di sini. Itu masuk persediaan dan menjadi HPP saat terjual.</p>
          </Card>
          <Card className="overflow-hidden lg:col-span-2">
            <CardHeader judul="Daftar pengeluaran" aksi={<Button ukur="sm" onClick={() => setFormBeban(true)}>Catat pengeluaran</Button>} />
            <DataTable data={[...d.pengeluaran].reverse()} rowKey={(e) => e.id} kolom={[
              { key: 't', judul: 'Tanggal', render: (e) => tanggalPendek(e.tanggal), sortBy: (e) => e.tanggal },
              { key: 'k', judul: 'Kategori', render: (e) => <Badge nada="abu" titik={false}>{e.kategori}</Badge> },
              { key: 'ket', judul: 'Keterangan', render: (e) => e.keterangan },
              { key: 'n', judul: 'Jumlah', rata: 'kanan', render: (e) => <span className="num font-bold">{rupiah(e.jumlah)}</span>, sortBy: (e) => e.jumlah },
            ]} kartuMobile={(e) => <div className="flex justify-between gap-3"><div><p className="text-sm font-semibold">{e.keterangan}</p><p className="text-xs text-gray-500">{e.kategori}, {tanggalPendek(e.tanggal)}</p></div><span className="num text-sm font-bold">{rupiah(e.jumlah)}</span></div>} />
          </Card>
        </div>
      )}

      {tab === 'piutang' && (
        <Card className="overflow-hidden">
          <CardHeader judul={`Piutang pelanggan ${rupiah(pi.total)}`} sub={`${pi.jumlahPelanggan} pelanggan. Pesanan partai yang sudah dikirim tapi belum lunas, dan transaksi kasir tempo.`} />
          <DataTable data={pi.semua} rowKey={(x) => x.ref} kolom={[
            { key: 'r', judul: 'Referensi', render: (x) => <span className="font-semibold">{x.ref}</span> },
            { key: 'p', judul: 'Pelanggan', render: (x) => cari.pelanggan(x.pelangganId)?.nama },
            { key: 's', judul: 'Sumber', render: (x) => <Badge nada={x.sumber.startsWith('Kasir') ? 'kuning' : 'biru'}>{x.sumber}</Badge> },
            { key: 't', judul: 'Tanggal', render: (x) => tanggalPendek(x.tanggal) },
            { key: 'n', judul: 'Sisa tagihan', rata: 'kanan', render: (x) => <span className="num font-bold text-brand-800">{rupiah(x.nilai)}</span>, sortBy: (x) => x.nilai },
          ]} kartuMobile={(x) => <div className="flex justify-between gap-3"><div><p className="text-sm font-semibold">{cari.pelanggan(x.pelangganId)?.nama}</p><p className="text-xs text-gray-500">{x.ref}, {x.sumber}</p></div><span className="num text-sm font-bold text-brand-800">{rupiah(x.nilai)}</span></div>} />
        </Card>
      )}

      {tab === 'utang' && (
        <Card className="overflow-hidden">
          <CardHeader judul={`Utang supplier ${rupiah(ut.total)}`} sub={`Uang muka pembelian (barang belum datang): ${rupiah(F.uangMukaSupplier(d))}, dicatat terpisah sebagai aset.`} />
          <DataTable data={ut.daftar} rowKey={(b) => b.id} kosong={{ judul: 'Tidak ada utang supplier' }} kolom={[
            { key: 'id', judul: 'No. pembelian', render: (b) => <span className="font-semibold">{b.id}</span> },
            { key: 's', judul: 'Supplier', render: (b) => cari.supplier(b.supplierId)?.nama },
            { key: 't', judul: 'Tanggal', render: (b) => tanggalPendek(b.tanggal) },
            { key: 'n', judul: 'Nilai diterima', rata: 'kanan', render: (b) => <span className="num">{rupiah(F.nilaiPembelian(b))}</span> },
            { key: 'd', judul: 'Dibayar', rata: 'kanan', render: (b) => <span className="num">{rupiah(F.dibayarPembelian(b))}</span> },
            { key: 'u', judul: 'Sisa utang', rata: 'kanan', render: (b) => <span className="num font-bold text-red-600">{rupiah(F.utangPembelian(b))}</span> },
          ]} kartuMobile={(b) => <div className="flex justify-between gap-3"><div><p className="text-sm font-semibold">{cari.supplier(b.supplierId)?.nama}</p><p className="text-xs text-gray-500">{b.id}</p></div><span className="num text-sm font-bold text-red-600">{rupiah(F.utangPembelian(b))}</span></div>} />
        </Card>
      )}

      {tab === 'labarugi' && <LabaRugi />}

      <div className="mt-4"><CatatanDemo>Angka keuangan dihitung dari data contoh. Ini bukan laporan keuangan resmi.</CatatanDemo></div>

      <FormModal buka={formModal} onTutup={() => setFormModal(false)} onSimpan={(m) => { d.tambahModal(m); setFormModal(false); toast({ jenis: 'sukses', judul: 'Modal dicatat (demo)', pesan: `${m.jenis === 'penarikan' ? 'Penarikan' : 'Modal masuk'} ${rupiah(m.jumlah)}.` }); }} />
      <FormBeban buka={formBeban} onTutup={() => setFormBeban(false)} onSimpan={(e) => { d.tambahPengeluaran(e); setFormBeban(false); toast({ jenis: 'sukses', judul: 'Pengeluaran dicatat (demo)', pesan: `${e.kategori}: ${rupiah(e.jumlah)}.` }); }} />
    </>
  );
}

export function LabaRugi({ periode }: { periode?: F.Periode }) {
  const d = useData();
  const lr = F.labaRugi(d, periode);
  const baris = (label: string, nilai: number, opt: { tebal?: boolean; minus?: boolean; inden?: boolean; garis?: boolean } = {}) => (
    <div className={`flex justify-between px-5 py-2.5 text-sm ${opt.garis ? 'border-t border-gray-200 bg-gray-50' : ''} ${opt.tebal ? 'font-bold text-gray-900' : 'text-gray-700'}`}>
      <span className={opt.inden ? 'pl-4' : ''}>{label}</span>
      <span className="num">{opt.minus ? `(${rupiah(nilai)})` : rupiah(nilai)}</span>
    </div>
  );
  return (
    <Card className="mx-auto max-w-2xl overflow-hidden">
      <CardHeader judul="Laporan laba rugi" sub={periode ? `${tanggalPendek(periode.dari)} – ${tanggalPendek(periode.sampai)}` : PERIODE} />
      <div className="border-t border-gray-100 pb-2">
        {baris('Pendapatan (omzet)', lr.omzet, { tebal: true })}
        {baris('Penjualan eceran (setelah diskon)', lr.omzetEceran, { inden: true })}
        {baris('Pesanan partai selesai', lr.omzetPartai, { inden: true })}
        {baris('Harga pokok penjualan (HPP)', lr.hpp, { minus: true })}
        {baris('Laba kotor', lr.labaKotor, { tebal: true, garis: true })}
        {baris('Beban operasional', lr.beban, { tebal: true })}
        {lr.bebanPerKategori.map((k) => <div key={k.kategori}>{baris(k.kategori, k.nilai, { inden: true, minus: true })}</div>)}
        <div className={`mx-5 mt-2 flex justify-between rounded-xl px-4 py-3 text-base font-extrabold ${lr.labaBersih >= 0 ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>
          <span>Laba bersih</span><span className="num">{rupiah(lr.labaBersih)}</span>
        </div>
        <p className="px-5 pt-3 text-xs text-gray-500">Tidak termasuk: modal masuk/penarikan, DP pesanan yang belum dikirim, dan pembelian stok yang belum terjual.</p>
      </div>
    </Card>
  );
}

function FormModal({ buka, onTutup, onSimpan }: { buka: boolean; onTutup: () => void; onSimpan: (m: MutasiModal) => void }) {
  const [jenis, setJenis] = useState<'tambahan' | 'penarikan'>('tambahan');
  const [tgl, setTgl] = useState(HARI_INI);
  const [n, setN] = useState('');
  const [ket, setKet] = useState('');
  const v = parseInt(n.replace(/\D/g, ''), 10) || 0;
  return (
    <Modal buka={buka} onTutup={onTutup} judul="Catat modal" sub="Setoran atau penarikan oleh pemilik" lebar="sm"
      footer={<><Button varian="garis" onClick={onTutup}>Batal</Button><Button disabled={!v} onClick={() => { onSimpan({ id: `MD-${Date.now().toString().slice(-4)}`, tanggal: tgl, jenis, jumlah: v, keterangan: ket || (jenis === 'penarikan' ? 'Penarikan pemilik' : 'Setoran modal') }); setN(''); setKet(''); }}>Simpan</Button></>}>
      <div className="space-y-4">
        <Select label="Jenis" value={jenis} onChange={(e) => setJenis(e.target.value as 'tambahan' | 'penarikan')} opsi={[{ nilai: 'tambahan', label: 'Modal masuk (setoran)' }, { nilai: 'penarikan', label: 'Penarikan modal (prive)' }]} />
        <DatePicker label="Tanggal" value={tgl} onChange={setTgl} />
        <Input label="Jumlah" awalan="Rp" inputMode="numeric" value={v ? angka(v) : ''} onChange={(e) => setN(e.target.value)} />
        <Input label="Keterangan" value={ket} onChange={(e) => setKet(e.target.value)} placeholder="Opsional" />
      </div>
    </Modal>
  );
}

function FormBeban({ buka, onTutup, onSimpan }: { buka: boolean; onTutup: () => void; onSimpan: (e: Pengeluaran) => void }) {
  const [kat, setKat] = useState<Pengeluaran['kategori']>('Transportasi');
  const [tgl, setTgl] = useState(HARI_INI);
  const [n, setN] = useState('');
  const [ket, setKet] = useState('');
  const v = parseInt(n.replace(/\D/g, ''), 10) || 0;
  return (
    <Modal buka={buka} onTutup={onTutup} judul="Catat pengeluaran" sub="Beban operasional, bukan pembelian stok" lebar="sm"
      footer={<><Button varian="garis" onClick={onTutup}>Batal</Button><Button disabled={!v || !ket} onClick={() => { onSimpan({ id: `EX-${Date.now().toString().slice(-4)}`, tanggal: tgl, kategori: kat, jumlah: v, keterangan: ket }); setN(''); setKet(''); }}>Simpan</Button></>}>
      <div className="space-y-4">
        <Select label="Kategori" value={kat} onChange={(e) => setKat(e.target.value as Pengeluaran['kategori'])}
          opsi={(['Sewa', 'Listrik & Air', 'Gaji', 'Kemasan', 'Transportasi', 'Lain-lain'] as const).map((k) => ({ nilai: k, label: k }))} />
        <DatePicker label="Tanggal" value={tgl} onChange={setTgl} />
        <Input label="Jumlah" awalan="Rp" inputMode="numeric" value={v ? angka(v) : ''} onChange={(e) => setN(e.target.value)} />
        <Input label="Keterangan" value={ket} onChange={(e) => setKet(e.target.value)} placeholder="Mis. BBM pengiriman" />
      </div>
    </Modal>
  );
}
