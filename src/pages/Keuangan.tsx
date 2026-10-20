import { useEffect, useMemo, useState } from 'react';
import { PiggyBank, ArrowDownToLine, ArrowUpFromLine, Wallet, Landmark, Plus, Info, HandCoins, Receipt } from 'lucide-react';
import { useData, useLookup, pesanGalat } from '@/context/DataContext';
import { useToast } from '@/context/ToastContext';
import { PageHeader, Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/ui/StatCard';
import { Tabs, FilterChips } from '@/components/ui/FilterBar';
import { DataTable, type Kolom } from '@/components/ui/DataTable';
import { Badge, type NadaBadge } from '@/components/ui/StatusBadge';
import { BarChart } from '@/components/charts/Charts';
import { TerimaPiutangModal, type Piutang } from '@/components/bisnis/TerimaPiutang';
import { Modal } from '@/components/ui/Modal';
import { Input, Select } from '@/components/ui/FormInput';
import { DatePicker } from '@/components/ui/DatePicker';
import { Catatan } from '@/components/ui/States';
import { awalBulan, hariIni } from '@/utils/waktu';
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
  refund_pelanggan: { label: 'Pengembalian ke pelanggan', nada: 'merah' },
  dp_supplier: { label: 'Uang muka pembelian', nada: 'kuning' },
  bayar_supplier: { label: 'Bayar supplier', nada: 'brand' },
  pengeluaran: { label: 'Beban operasional', nada: 'merah' },
};


export default function Keuangan() {
  const d = useData();
  const cari = useLookup();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('ringkasan');
  const [fKas, setFKas] = useState<'semua' | 'masuk' | 'keluar'>('semua');
  const [formModal, setFormModal] = useState(false);
  const [formBeban, setFormBeban] = useState(false);
  const [terimaPiutang, setTerimaPiutang] = useState<Piutang | null>(null);

  const [modeP, setModeP] = useState<'bulan' | 'semua'>('bulan');
  const periode: F.Periode | undefined = modeP === 'bulan' ? { dari: awalBulan(), sampai: hariIni() } : undefined;
  const labelPeriode = periode ? `${tanggalPendek(periode.dari)} – ${tanggalPendek(periode.sampai)}` : 'sejak awal pencatatan';
  const lr = F.labaRugi(d, periode);
  const md = F.ringkasanModal(d, periode);
  const kas = F.ringkasanKas(d, periode);
  const pi = F.piutang(d);
  const ut = F.utangSupplier(d);
  const rek = F.rekonsiliasiKas(d);

  const buku = useMemo(() => {
    let s = 0;
    return F.bukuKas(d).map((b) => ({ ...b, saldo: (s += b.masuk - b.keluar) })).reverse();
  }, [d]);
  const harian = useMemo(() => F.rentangHari(hariIni(), 12).map((h) => {
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
      <PageHeader judul="Keuangan" sub={`Periode ${labelPeriode}. Saldo kas selalu posisi saat ini.`}
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

      {(tab === 'ringkasan' || tab === 'labarugi') && (
        <div className="mb-4"><FilterChips label="Periode" value={modeP} onChange={setModeP} opsi={[{ nilai: 'bulan', label: 'Bulan ini' }, { nilai: 'semua', label: 'Semua waktu' }]} /></div>
      )}
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
              <CardHeader judul="Kenapa saldo kas berbeda dari laba?" sub="Rekonsiliasi saldo kas saat ini (seluruh periode)" />
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
            { key: 'a', judul: '', rata: 'kanan', render: (x) => <Button ukur="sm" varian="garis" onClick={() => setTerimaPiutang(x)}>Terima bayar</Button> },
          ]} kosong={{ judul: 'Tidak ada piutang', pesan: 'Semua tagihan pelanggan sudah lunas.' }}
            kartuMobile={(x) => <div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold">{cari.pelanggan(x.pelangganId)?.nama}</p><p className="text-xs text-gray-500">{x.ref}, {x.sumber}</p><p className="num text-sm font-bold text-brand-800">{rupiah(x.nilai)}</p></div><Button ukur="sm" varian="garis" onClick={() => setTerimaPiutang(x)}>Terima bayar</Button></div>} />
          <TerimaPiutangModal piutang={terimaPiutang} onTutup={() => setTerimaPiutang(null)} />
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

      {tab === 'labarugi' && <LabaRugi periode={periode} />}

      <div className="mt-4"><Catatan>Dihitung dari data Google Sheets dengan pencatatan sederhana untuk UMKM. Bukan laporan keuangan resmi/audit.</Catatan></div>

      <FormModal buka={formModal} adaModalAwal={d.modal.some((m) => m.jenis === 'awal')} onTutup={() => setFormModal(false)} onSimpan={async (m) => { await d.tambahModal(m); setFormModal(false); toast({ jenis: 'sukses', judul: 'Modal tersimpan', pesan: `${m.jenis === 'penarikan' ? 'Penarikan' : m.jenis === 'awal' ? 'Modal awal' : 'Modal masuk'} ${rupiah(m.jumlah)}.` }); }} />
      <FormBeban buka={formBeban} onTutup={() => setFormBeban(false)} onSimpan={async (e) => { await d.tambahPengeluaran(e); setFormBeban(false); toast({ jenis: 'sukses', judul: 'Pengeluaran tersimpan', pesan: `${e.kategori}: ${rupiah(e.jumlah)}.` }); }} />
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
      <CardHeader judul="Laporan laba rugi" sub={periode ? `${tanggalPendek(periode.dari)} – ${tanggalPendek(periode.sampai)}` : 'Sejak awal pencatatan'} />
      <div className="border-t border-gray-100 pb-2">
        {baris('Pendapatan (omzet)', lr.omzet, { tebal: true })}
        {baris('Penjualan eceran (setelah diskon)', lr.omzetEceran, { inden: true })}
        {baris('Pesanan partai selesai', lr.omzetPartai, { inden: true })}
        {baris('Harga pokok penjualan (HPP)', lr.hpp, { minus: true })}
        {baris('Laba kotor', lr.labaKotor, { tebal: true, garis: true })}
        {lr.pendapatanLain > 0 && baris('Pendapatan lain-lain (DP pesanan batal yang hangus)', lr.pendapatanLain)}
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

type InputModal = { jenis: MutasiModal['jenis']; tanggal: string; jumlah: number; keterangan: string };
function FormModal({ buka, adaModalAwal, onTutup, onSimpan }: { buka: boolean; adaModalAwal: boolean; onTutup: () => void; onSimpan: (m: InputModal) => Promise<void> }) {
  const [jenis, setJenis] = useState<MutasiModal['jenis']>('tambahan');
  const [tgl, setTgl] = useState(hariIni());
  const [n, setN] = useState('');
  const [ket, setKet] = useState('');
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState('');
  useEffect(() => {
    if (!buka) return;
    // Modal awal Rp7.000.000 hanya usulan nilai rencana; pemilik tetap bisa mengubahnya.
    setJenis(adaModalAwal ? 'tambahan' : 'awal'); setN(adaModalAwal ? '' : '7000000'); setKet(''); setTgl(hariIni()); setGalat('');
  }, [buka, adaModalAwal]);
  const v = parseInt(n.replace(/\D/g, ''), 10) || 0;
  return (
    <Modal buka={buka} onTutup={onTutup} judul="Catat modal" sub="Uang pemilik yang masuk atau ditarik dari usaha" lebar="sm"
      footer={<><Button varian="garis" onClick={onTutup} disabled={proses}>Batal</Button><Button disabled={!v || proses} onClick={async () => {
        setProses(true); setGalat('');
        try { await onSimpan({ tanggal: tgl, jenis, jumlah: v, keterangan: ket || (jenis === 'penarikan' ? 'Penarikan pemilik' : jenis === 'awal' ? 'Modal awal' : 'Setoran modal') }); }
        catch (e) { setGalat(pesanGalat(e)); } finally { setProses(false); }
      }}>{proses ? 'Menyimpan…' : 'Simpan'}</Button></>}>
      <div className="space-y-4">
        <Select label="Jenis" value={jenis} onChange={(e) => setJenis(e.target.value as MutasiModal['jenis'])}
          opsi={[...(adaModalAwal ? [] : [{ nilai: 'awal', label: 'Modal awal' }]), { nilai: 'tambahan', label: 'Modal masuk (setoran)' }, { nilai: 'penarikan', label: 'Penarikan modal (prive)' }]} />
        <DatePicker label="Tanggal" value={tgl} max={hariIni()} onChange={setTgl} />
        <Input label="Jumlah" awalan="Rp" inputMode="numeric" value={v ? angka(v) : ''} onChange={(e) => setN(e.target.value)}
          bantuan={jenis === 'awal' ? 'Rencana modal awal Rp7.000.000. Ubah sesuai uang yang benar-benar disetor.' : undefined} />
        <Input label="Keterangan" value={ket} onChange={(e) => setKet(e.target.value)} placeholder="Opsional" />
        {galat && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{galat}</p>}
      </div>
    </Modal>
  );
}

type InputBeban = { kategori: Pengeluaran['kategori']; tanggal: string; jumlah: number; keterangan: string; metode: string };
function FormBeban({ buka, onTutup, onSimpan }: { buka: boolean; onTutup: () => void; onSimpan: (e: InputBeban) => Promise<void> }) {
  const [kat, setKat] = useState<Pengeluaran['kategori']>('Transportasi');
  const [tgl, setTgl] = useState(hariIni());
  const [n, setN] = useState('');
  const [ket, setKet] = useState('');
  const [metode, setMetode] = useState('tunai');
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState('');
  useEffect(() => { if (buka) { setN(''); setKet(''); setTgl(hariIni()); setGalat(''); } }, [buka]);
  const v = parseInt(n.replace(/\D/g, ''), 10) || 0;
  return (
    <Modal buka={buka} onTutup={onTutup} judul="Catat pengeluaran" sub="Beban operasional, bukan pembelian stok" lebar="sm"
      footer={<><Button varian="garis" onClick={onTutup} disabled={proses}>Batal</Button><Button disabled={!v || !ket || proses} onClick={async () => {
        setProses(true); setGalat('');
        try { await onSimpan({ tanggal: tgl, kategori: kat, jumlah: v, keterangan: ket, metode }); }
        catch (e) { setGalat(pesanGalat(e)); } finally { setProses(false); }
      }}>{proses ? 'Menyimpan…' : 'Simpan'}</Button></>}>
      <div className="space-y-4">
        <Select label="Kategori" value={kat} onChange={(e) => setKat(e.target.value as Pengeluaran['kategori'])}
          opsi={(['Sewa', 'Listrik & Air', 'Gaji', 'Kemasan', 'Transportasi', 'Lain-lain'] as const).map((k) => ({ nilai: k, label: k }))} />
        <DatePicker label="Tanggal" value={tgl} max={hariIni()} onChange={setTgl} />
        <Input label="Jumlah" awalan="Rp" inputMode="numeric" value={v ? angka(v) : ''} onChange={(e) => setN(e.target.value)} />
        <Input label="Keterangan" value={ket} onChange={(e) => setKet(e.target.value)} placeholder="Mis. BBM pengiriman" />
        <Select label="Dibayar dengan" value={metode} onChange={(e) => setMetode(e.target.value)} opsi={[{ nilai: 'tunai', label: 'Tunai' }, { nilai: 'transfer', label: 'Transfer' }, { nilai: 'qris', label: 'QRIS' }]} />
        {galat && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{galat}</p>}
      </div>
    </Modal>
  );
}
