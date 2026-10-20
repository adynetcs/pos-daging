import { useMemo, useState } from 'react';
import { Boxes, Weight, AlertTriangle, PackageX, PackagePlus, SlidersHorizontal, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { useData, useLookup, pesanGalat } from '@/context/DataContext';
import { useToast } from '@/context/ToastContext';
import { PageHeader, Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/ui/StatCard';
import { FilterBar, FilterChips, Tabs } from '@/components/ui/FilterBar';
import { SearchInput } from '@/components/ui/SearchInput';
import { DataTable, type Kolom } from '@/components/ui/DataTable';
import { Badge, StokBadge, statusStok, type NadaBadge } from '@/components/ui/StatusBadge';
import { ProductThumb, LABEL_KATEGORI } from '@/components/ui/ProductThumb';
import { Modal } from '@/components/ui/Modal';
import { Select, Textarea } from '@/components/ui/FormInput';
import { EmptyState, Catatan } from '@/components/ui/States';
import { ProgressBar } from '@/components/charts/Charts';
import { hariIni, selisihHari } from '@/utils/waktu';
import { useAuth } from '@/context/AuthContext';
import type { BatchStok, JenisMutasi, MutasiStok, Produk } from '@/types';
import { barisPenjualan, nilaiPersediaan } from '@/utils/finance';
import { angka, berat, qtySatuan, rupiah, tanggalJam, tanggalPendek } from '@/utils/format';

type Tab = 'persediaan' | 'mutasi' | 'batch';
type FStatus = 'semua' | 'menipis' | 'normal';

export const MUTASI: Record<JenisMutasi, { label: string; nada: NadaBadge; warna: string }> = {
  masuk: { label: 'Stok masuk', nada: 'hijau', warna: 'bg-emerald-500' },
  terjual: { label: 'Terjual', nada: 'biru', warna: 'bg-sky-500' },
  rusak: { label: 'Rusak', nada: 'merah', warna: 'bg-red-500' },
  susut: { label: 'Susut berat', nada: 'kuning', warna: 'bg-amber-500' },
  koreksi: { label: 'Koreksi', nada: 'abu', warna: 'bg-gray-400' },
  batal: { label: 'Kembali (transaksi batal)', nada: 'ungu', warna: 'bg-violet-400' },
};

export default function Stok() {
  const d = useData();
  const { produk, mutasiStok, batch, pembelian } = d;
  const cari = useLookup();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('persediaan');
  const [q, setQ] = useState('');
  const [fs, setFs] = useState<FStatus>('semua');
  const [adj, setAdj] = useState(false);
  const [terima, setTerima] = useState(false);
  const { pengguna } = useAuth();
  const bolehUbah = pengguna?.peran !== 'kasir';

  const aktif = produk.filter((p) => p.aktif);
  const totalKg = aktif.filter((p) => p.satuan === 'kg').reduce((s, p) => s + p.stok, 0);
  const totalPcs = aktif.filter((p) => p.satuan === 'pcs').reduce((s, p) => s + p.stok, 0);
  const menipis = aktif.filter((p) => p.stok < p.stokMinimum);
  const hilang = mutasiStok.filter((m) => m.jenis === 'rusak' || m.jenis === 'susut');
  const hilangKg = hilang.filter((m) => cari.produk(m.produkId)?.satuan === 'kg').reduce((s, m) => s - m.qty, 0);
  const hilangNilai = hilang.reduce((s, m) => s - m.qty * (cari.produk(m.produkId)?.hpp ?? 0), 0);

  // Pergerakan stok berbobot (kg) bulan berjalan untuk visual
  const gerak = useMemo(() => {
    const isKg = (id: string) => cari.produk(id)?.satuan === 'kg';
    const masuk = pembelian.filter((b) => b.statusPenerimaan !== 'dipesan').flatMap((b) => b.items).filter((i) => isKg(i.produkId)).reduce((s, i) => s + i.qtyTerima, 0);
    const terjual = barisPenjualan(d).filter((r) => isKg(r.produkId)).reduce((s, r) => s + r.qty, 0);
    const per = (j: JenisMutasi) => mutasiStok.filter((m) => m.jenis === j && isKg(m.produkId)).reduce((s, m) => s + Math.abs(m.qty), 0);
    return [
      { j: 'masuk' as const, v: masuk }, { j: 'terjual' as const, v: terjual },
      { j: 'rusak' as const, v: per('rusak') }, { j: 'susut' as const, v: per('susut') }, { j: 'koreksi' as const, v: per('koreksi') }, { j: 'batal' as const, v: per('batal') },
    ];
  }, [d, pembelian, mutasiStok, cari]);
  const maxGerak = Math.max(...gerak.map((g) => g.v));

  const daftar = aktif.filter((p) => {
    const s = q.trim().toLowerCase();
    const st = statusStok(p.stok, p.stokMinimum).label;
    return (!s || p.nama.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s))
      && (fs === 'semua' || (fs === 'menipis' ? p.stok < p.stokMinimum : st === 'Normal' || st === 'Perlu dipantau'));
  });

  const kolomStok: Kolom<Produk>[] = [
    { key: 'p', judul: 'Produk', render: (p) => <div className="flex items-center gap-3"><ProductThumb produk={p} ukuran="sm" /><div><p className="font-semibold text-gray-900">{p.nama}</p><p className="text-xs text-gray-500">{p.sku}</p></div></div>, sortBy: (p) => p.nama },
    { key: 'k', judul: 'Kategori', render: (p) => LABEL_KATEGORI[p.kategori] },
    { key: 's', judul: 'Stok tersedia', rata: 'kanan', render: (p) => <span className="num font-bold">{qtySatuan(p.stok, p.satuan)}</span>, sortBy: (p) => p.stok / p.stokMinimum },
    { key: 'm', judul: 'Minimum', rata: 'kanan', render: (p) => <span className="num text-gray-500">{qtySatuan(p.stokMinimum, p.satuan)}</span> },
    { key: 'lvl', judul: 'Level', render: (p) => <div className="w-28"><ProgressBar nilai={p.stok / (p.stokMinimum * 2)} warna={p.stok < p.stokMinimum ? 'bg-red-500' : p.stok < p.stokMinimum * 1.5 ? 'bg-amber-500' : 'bg-emerald-500'} /></div> },
    { key: 'n', judul: 'Nilai (HPP)', rata: 'kanan', render: (p) => <span className="num">{rupiah(p.stok * p.hpp)}</span>, sortBy: (p) => p.stok * p.hpp },
    { key: 'st', judul: 'Status', render: (p) => <StokBadge stok={p.stok} min={p.stokMinimum} /> },
  ];

  const kolomMutasi: Kolom<MutasiStok>[] = [
    { key: 't', judul: 'Waktu', render: (m) => tanggalJam(m.tanggal), sortBy: (m) => m.tanggal },
    { key: 'p', judul: 'Produk', render: (m) => <span className="font-medium text-gray-900">{cari.produk(m.produkId)?.nama}</span> },
    { key: 'j', judul: 'Jenis', render: (m) => <Badge nada={MUTASI[m.jenis].nada}>{MUTASI[m.jenis].label}</Badge> },
    { key: 'q', judul: 'Jumlah', rata: 'kanan', render: (m) => <span className={`num font-bold ${m.qty > 0 ? 'text-emerald-700' : 'text-gray-800'}`}>{m.qty > 0 ? '+' : '−'}{qtySatuan(Math.abs(m.qty), cari.produk(m.produkId)?.satuan ?? 'kg')}</span> },
    { key: 'r', judul: 'Referensi', render: (m) => m.referensi },
    { key: 'c', judul: 'Catatan', render: (m) => <span className="text-gray-500">{m.catatan ?? '-'}</span> },
  ];

  const kolomBatch: Kolom<BatchStok>[] = [
    { key: 'id', judul: 'Batch', render: (b) => <span className="font-semibold">{b.id}</span> },
    { key: 'p', judul: 'Produk', render: (b) => cari.produk(b.produkId)?.nama },
    { key: 'in', judul: 'Tanggal masuk', render: (b) => tanggalPendek(b.tanggalMasuk), sortBy: (b) => b.tanggalMasuk },
    { key: 'exp', judul: 'Kedaluwarsa', render: (b) => <span className="flex items-center gap-2">{tanggalPendek(b.kedaluwarsa)}{sisaHari(b.kedaluwarsa) <= 1 && <Badge nada={sisaHari(b.kedaluwarsa) < 0 ? 'merah' : 'kuning'}>{sisaHari(b.kedaluwarsa) < 0 ? 'Lewat' : sisaHari(b.kedaluwarsa) === 0 ? 'Hari ini' : 'Besok'}</Badge>}</span>, sortBy: (b) => b.kedaluwarsa },
    { key: 'a', judul: 'Awal', rata: 'kanan', render: (b) => <span className="num">{qtySatuan(b.qtyAwal, cari.produk(b.produkId)?.satuan ?? 'kg')}</span> },
    { key: 's', judul: 'Sisa', rata: 'kanan', render: (b) => <span className="num font-bold">{qtySatuan(b.qtySisa, cari.produk(b.produkId)?.satuan ?? 'kg')}</span> },
    { key: 'src', judul: 'Sumber', render: (b) => <span className="text-gray-500">{b.sumber}</span> },
  ];

  const dipesan = pembelian.filter((b) => b.statusPenerimaan === 'dipesan');

  return (
    <>
      <PageHeader judul="Stok" sub="Persediaan dalam kg untuk daging timbang dan pcs untuk produk kemasan."
        aksi={bolehUbah ? <>
          <Button varian="garis" ikon={<SlidersHorizontal className="h-4 w-4" />} onClick={() => setAdj(true)} disabled={!aktif.length}>Penyesuaian stok</Button>
          <Button ikon={<PackagePlus className="h-4 w-4" />} onClick={() => setTerima(true)}>Terima barang{dipesan.length ? ` (${dipesan.length})` : ''}</Button>
        </> : undefined} />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Jenis produk aktif" nilai={aktif.length} ikon={Boxes} warna="abu" keterangan={`Nilai persediaan ${rupiah(nilaiPersediaan(d))}`} />
        <StatCard label="Total berat persediaan" nilai={berat(totalKg)} ikon={Weight} warna="brand" keterangan={`+ ${angka(totalPcs)} pcs produk kemasan`} />
        <StatCard label="Stok menipis" nilai={`${menipis.length} produk`} ikon={AlertTriangle} warna="merah" keterangan="di bawah minimum" onClick={() => { setTab('persediaan'); setFs('menipis'); }} />
        <StatCard label="Rusak & susut" nilai={berat(hilangKg)} ikon={PackageX} warna="kuning" keterangan={`Kerugian ± ${rupiah(hilangNilai)}`} onClick={() => setTab('mutasi')} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="min-w-0 overflow-hidden">
          <div className="px-4 pt-2"><Tabs<Tab> value={tab} onChange={setTab} opsi={[{ nilai: 'persediaan', label: 'Persediaan' }, { nilai: 'mutasi', label: 'Riwayat mutasi' }, { nilai: 'batch', label: 'Batch & kedaluwarsa' }]} /></div>
          {tab === 'persediaan' && (
            <>
              <FilterBar>
                <SearchInput value={q} onChange={setQ} placeholder="Cari produk atau SKU…" className="sm:w-72" />
                <FilterChips<FStatus> value={fs} onChange={setFs} opsi={[{ nilai: 'semua', label: 'Semua' }, { nilai: 'menipis', label: 'Menipis', jumlah: menipis.length }, { nilai: 'normal', label: 'Aman' }]} />
              </FilterBar>
              <DataTable data={daftar} kolom={kolomStok} rowKey={(p) => p.id} kosong={{ judul: 'Tidak ada produk', pesan: 'Ubah kata kunci atau filter.' }}
                kartuMobile={(p) => (
                  <div className="flex items-center gap-3">
                    <ProductThumb produk={p} ukuran="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{p.nama}</p>
                      <div className="mt-1.5"><ProgressBar nilai={p.stok / (p.stokMinimum * 2)} warna={p.stok < p.stokMinimum ? 'bg-red-500' : 'bg-emerald-500'} /></div>
                    </div>
                    <div className="text-right"><p className="num text-sm font-bold">{qtySatuan(p.stok, p.satuan)}</p><StokBadge stok={p.stok} min={p.stokMinimum} /></div>
                  </div>
                )} />
            </>
          )}
          {tab === 'mutasi' && (
            <DataTable data={mutasiStok} kolom={kolomMutasi} rowKey={(m) => m.id}
              kartuMobile={(m) => (
                <div className="flex items-center gap-3">
                  <span className={`grid h-8 w-8 place-items-center rounded-lg ${m.qty > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>{m.qty > 0 ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}</span>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{cari.produk(m.produkId)?.nama}</p><p className="text-xs text-gray-500">{MUTASI[m.jenis].label}, {tanggalJam(m.tanggal)}</p></div>
                  <span className="num text-sm font-bold">{m.qty > 0 ? '+' : '−'}{qtySatuan(Math.abs(m.qty), cari.produk(m.produkId)?.satuan ?? 'kg')}</span>
                </div>
              )} />
          )}
          {tab === 'batch' && (
            <DataTable data={[...batch].sort((a, b) => a.kedaluwarsa.localeCompare(b.kedaluwarsa))} kolom={kolomBatch} rowKey={(b) => b.id}
              kartuMobile={(b) => (
                <div>
                  <div className="flex justify-between"><span className="text-sm font-semibold">{cari.produk(b.produkId)?.nama}</span><span className="num text-sm font-bold">{qtySatuan(b.qtySisa, cari.produk(b.produkId)?.satuan ?? 'kg')}</span></div>
                  <p className="text-xs text-gray-500">{b.id}, masuk {tanggalPendek(b.tanggalMasuk)}, kedaluwarsa {tanggalPendek(b.kedaluwarsa)}</p>
                </div>
              )} />
          )}
        </Card>

        <Card className="self-start">
          <CardHeader judul="Pergerakan stok timbang" sub="Sejak awal pencatatan, dalam kg" />
          <ul className="space-y-3.5 px-5 pb-5">
            {gerak.map((g) => (
              <li key={g.j}>
                <div className="mb-1 flex justify-between text-sm"><span className="text-gray-700">{MUTASI[g.j].label}</span><span className="num font-semibold">{berat(g.v)}</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-100"><div className={`h-full rounded-full ${MUTASI[g.j].warna}`} style={{ width: `${maxGerak ? Math.max(1.5, (g.v / maxGerak) * 100) : 0}%` }} /></div>
              </li>
            ))}
          </ul>
          <p className="border-t border-gray-100 px-5 py-3 text-xs text-gray-500">Susut berat wajar terjadi pada daging segar (drip loss & trimming). Catat lewat Penyesuaian stok agar HPP akurat.</p>
        </Card>
      </div>
      <div className="mt-4"><Catatan>Stok dihitung dari riwayat mutasi di Google Sheets. Sisa per batch diperkirakan dengan asumsi barang lama keluar lebih dulu.</Catatan></div>

      {adj && <PenyesuaianModal onTutup={() => setAdj(false)} onSimpan={async (m) => {
        await d.sesuaikanStok(m); setAdj(false);
        const p = cari.produk(m.id_produk)!;
        toast({ jenis: 'sukses', judul: 'Penyesuaian tersimpan', pesan: `${p.nama} ${m.qty > 0 ? '+' : '−'}${qtySatuan(Math.abs(m.qty), p.satuan)} (${MUTASI[m.jenis].label.toLowerCase()}).` });
      }} />}
      <Modal buka={terima} onTutup={() => setTerima(false)} judul="Terima barang" sub="Pilih pembelian yang barangnya datang hari ini" lebar="md">
        {dipesan.length === 0 ? <EmptyState ikon={PackagePlus} judul="Tidak ada pembelian yang menunggu" pesan="Buat pembelian baru di menu Pembelian." /> : (
          <div className="space-y-4">{dipesan.map((b) => <TerimaForm key={b.id} id={b.id} onSelesai={() => setTerima(false)} />)}</div>
        )}
      </Modal>
    </>
  );
}

const sisaHari = (tgl: string) => (tgl ? selisihHari(hariIni(), tgl) : 999);

type InputSesuai = { id_produk: string; jenis: 'rusak' | 'susut' | 'koreksi'; qty: number; catatan: string };
function PenyesuaianModal({ onTutup, onSimpan }: { onTutup: () => void; onSimpan: (m: InputSesuai) => Promise<void> }) {
  const { produk } = useData();
  const [pid, setPid] = useState(() => produk.find((x) => x.aktif)?.id ?? '');
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState('');
  const [jenis, setJenis] = useState<'rusak' | 'susut' | 'koreksi'>('susut');
  const [arah, setArah] = useState<1 | -1>(-1);
  const [qty, setQty] = useState('');
  const [catatan, setCatatan] = useState('');
  const p = produk.find((x) => x.id === pid);
  const n = parseFloat(qty.replace(',', '.')) || 0;
  if (!p) return null;
  const delta = jenis === 'koreksi' ? n * arah : -n;
  const salah = n <= 0 ? '' : p.stok + delta < 0 ? `Stok tidak boleh minus (tersedia ${qtySatuan(p.stok, p.satuan)}).` : '';
  return (
    <Modal buka onTutup={onTutup} judul="Penyesuaian stok" sub="Untuk barang rusak, susut berat, atau selisih stock opname" lebar="sm"
      footer={<><Button varian="garis" onClick={onTutup} disabled={proses}>Batal</Button><Button disabled={n <= 0 || !!salah || proses} onClick={async () => {
        setProses(true); setGalat('');
        try { await onSimpan({ id_produk: pid, jenis, qty: delta, catatan }); } catch (e) { setGalat(pesanGalat(e)); } finally { setProses(false); }
      }}>{proses ? 'Menyimpan…' : 'Simpan penyesuaian'}</Button></>}>
      <div className="space-y-4">
        <Select label="Produk" value={pid} onChange={(e) => setPid(e.target.value)} opsi={produk.filter((x) => x.aktif).map((x) => ({ nilai: x.id, label: `${x.nama} (${qtySatuan(x.stok, x.satuan)})` }))} />
        <div>
          <span className="label">Jenis penyesuaian</span>
          <div className="grid grid-cols-3 gap-2">
            {(['rusak', 'susut', 'koreksi'] as const).map((j) => (
              <button key={j} onClick={() => setJenis(j)} aria-pressed={jenis === j} className={`h-10 rounded-xl text-sm font-semibold ring-1 ring-inset ${jenis === j ? 'bg-brand-50 text-brand-800 ring-brand-400' : 'ring-gray-200'}`}>{MUTASI[j].label}</button>
            ))}
          </div>
        </div>
        {jenis === 'koreksi' && (
          <div className="grid grid-cols-2 gap-2">
            {([[1, 'Tambah stok'], [-1, 'Kurangi stok']] as const).map(([a, l]) => (
              <button key={a} onClick={() => setArah(a)} aria-pressed={arah === a} className={`h-10 rounded-xl text-sm font-semibold ring-1 ring-inset ${arah === a ? 'bg-gray-900 text-white ring-gray-900' : 'ring-gray-200'}`}>{l}</button>
            ))}
          </div>
        )}
        <div>
          <label className="label" htmlFor="adjq">Jumlah ({p.satuan === 'kg' ? 'kg, mis. 0,35' : 'pcs'})</label>
          <input id="adjq" inputMode="decimal" className="input num" value={qty} onChange={(e) => setQty(e.target.value.replace(/[^0-9.,]/g, ''))} placeholder="0" />
          {salah ? <p className="mt-1 text-xs font-medium text-red-600">{salah}</p> : n > 0 && <p className="mt-1 text-xs text-gray-500">Stok menjadi {qtySatuan(p.stok + delta, p.satuan)}. Nilai {rupiah(Math.abs(delta) * p.hpp)} (HPP).</p>}
        </div>
        <Textarea label="Catatan" value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Mis. kemasan bocor, hasil opname" />
        {galat && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{galat}</p>}
      </div>
    </Modal>
  );
}

function TerimaForm({ id, onSelesai }: { id: string; onSelesai: () => void }) {
  const { pembelian, terimaPembelian } = useData();
  const cari = useLookup();
  const toast = useToast();
  const pb = pembelian.find((x) => x.id === id)!;
  const [qty, setQty] = useState<Record<string, string>>(Object.fromEntries(pb.items.map((i) => [i.produkId, String(i.qtyPesan).replace('.', ',')])));
  const [proses, setProses] = useState(false);
  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <div className="flex items-start justify-between gap-2">
        <div><p className="font-bold">{pb.id}</p><p className="text-sm text-gray-500">{cari.supplier(pb.supplierId)?.nama}, dipesan {tanggalPendek(pb.tanggal)}</p></div>
        <Badge nada="kuning">Menunggu</Badge>
      </div>
      <div className="mt-3 space-y-2">
        {pb.items.map((i) => {
          const p = cari.produk(i.produkId)!;
          const v = parseFloat((qty[i.produkId] ?? '').replace(',', '.')) || 0;
          return (
            <div key={i.produkId} className="grid grid-cols-[1fr_110px] items-center gap-3">
              <div><p className="text-sm font-semibold">{p.nama}</p><p className="text-xs text-gray-500">Dipesan {qtySatuan(i.qtyPesan, p.satuan)}{v > 0 && v < i.qtyPesan ? `, selisih ${qtySatuan(i.qtyPesan - v, p.satuan)}` : ''}</p></div>
              <label className="relative"><span className="sr-only">Berat diterima {p.nama}</span>
                <input inputMode="decimal" className="input num pr-9 text-right" value={qty[i.produkId]} onChange={(e) => setQty((s) => ({ ...s, [i.produkId]: e.target.value.replace(/[^0-9.,]/g, '') }))} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">{p.satuan}</span></label>
            </div>
          );
        })}
      </div>
      <Button className="mt-4 w-full" disabled={proses} onClick={async () => {
        setProses(true);
        try {
          await terimaPembelian(id, Object.fromEntries(Object.entries(qty).map(([k, v]) => [k, parseFloat(v.replace(',', '.')) || 0])));
          toast({ jenis: 'sukses', judul: 'Barang diterima', pesan: `Stok bertambah sesuai berat timbang. Sisa tagihan ${pb.id} tercatat sebagai utang supplier.` });
          onSelesai();
        } catch (e) {
          toast({ jenis: 'gagal', judul: 'Penerimaan belum tersimpan', pesan: pesanGalat(e) });
        } finally { setProses(false); }
      }}>{proses ? 'Menyimpan…' : 'Konfirmasi berat diterima'}</Button>
    </div>
  );
}
