import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { EmptyState } from '@/components/ui/States';
import { Plus, Pencil } from 'lucide-react';
import { useData, pesanGalat } from '@/context/DataContext';
import { useToast } from '@/context/ToastContext';
import { PageHeader, Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FilterBar, FilterChips } from '@/components/ui/FilterBar';
import { SearchInput } from '@/components/ui/SearchInput';
import { DataTable, type Kolom } from '@/components/ui/DataTable';
import { Badge, StokBadge } from '@/components/ui/StatusBadge';
import { ProductThumb, LABEL_KATEGORI } from '@/components/ui/ProductThumb';
import { Modal } from '@/components/ui/Modal';
import { Input, Select, Toggle } from '@/components/ui/FormInput';
import { Catatan } from '@/components/ui/States';
import type { Kategori, Produk as TProduk } from '@/types';
import { angka, qtySatuan, rupiah } from '@/utils/format';

type FK = 'semua' | Kategori;
const margin = (p: TProduk) => (p.hargaJual ? (p.hargaJual - p.hpp) / p.hargaJual : 0);

export default function Produk() {
  const data = useData();
  const { pengguna } = useAuth();
  const bolehUbah = pengguna!.peran !== 'kasir';
  const produk = data.produk;
  const toast = useToast();
  const [q, setQ] = useState('');
  const [k, setK] = useState<FK>('semua');
  const [detail, setDetail] = useState<TProduk | null>(null);
  const [edit, setEdit] = useState<TProduk | 'baru' | null>(null);

  const daftar = produk.filter((p) => (k === 'semua' || p.kategori === k) && (!q || `${p.nama} ${p.sku} ${p.potongan}`.toLowerCase().includes(q.toLowerCase())));
  const kolom: Kolom<TProduk>[] = [
    { key: 'p', judul: 'Produk', render: (p) => <div className="flex items-center gap-3"><ProductThumb produk={p} ukuran="sm" /><div><p className="font-semibold text-gray-900">{p.nama}</p><p className="text-xs text-gray-500">{p.sku}</p></div></div>, sortBy: (p) => p.nama },
    { key: 'k', judul: 'Kategori', render: (p) => LABEL_KATEGORI[p.kategori], sortBy: (p) => p.kategori },
    { key: 'pot', judul: 'Potongan', render: (p) => <span className="text-gray-500">{p.potongan}</span> },
    { key: 't', judul: 'Tipe', render: (p) => <Badge nada={p.tipe === 'timbang' ? 'brand' : 'abu'} titik={false}>{p.tipe === 'timbang' ? `Timbang (${p.satuan})` : `Kemasan (${p.satuan})`}</Badge> },
    { key: 'h', judul: 'HPP', rata: 'kanan', render: (p) => <span className="num text-gray-500">{rupiah(p.hpp)}</span> },
    { key: 'j', judul: 'Harga jual', rata: 'kanan', render: (p) => <span className="num font-semibold">{rupiah(p.hargaJual)}</span>, sortBy: (p) => p.hargaJual },
    { key: 'm', judul: 'Margin', rata: 'kanan', render: (p) => <span className="num">{angka(margin(p) * 100, 1)}%</span>, sortBy: margin },
    { key: 's', judul: 'Stok', rata: 'kanan', render: (p) => <span className="num">{qtySatuan(p.stok, p.satuan)}</span>, sortBy: (p) => p.stok },
    { key: 'a', judul: 'Status', render: (p) => p.aktif ? <Badge nada="hijau">Aktif</Badge> : <Badge nada="abu">Nonaktif</Badge> },
    { key: 'e', judul: '', render: (p) => <button onClick={(e) => { e.stopPropagation(); setEdit(p); }} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label={`Ubah ${p.nama}`}><Pencil className="h-4 w-4" /></button> },
  ];

  return (
    <>
      <PageHeader judul="Produk" sub={`${produk.filter((p) => p.aktif).length} produk aktif dari ${produk.length} terdaftar.`}
        aksi={<>
          <Button varian="garis" ikon={<RefreshCw className={`h-4 w-4 ${data.memuatUlang ? 'animate-spin' : ''}`} />} disabled={data.memuatUlang} onClick={() => data.muatUlang().catch((e: Error) => toast({ jenis: 'gagal', judul: 'Gagal memuat ulang', pesan: e.message }))}>Muat ulang</Button>
          {bolehUbah && <Button ikon={<Plus className="h-4 w-4" />} onClick={() => setEdit('baru')}>Tambah produk</Button>}
        </>} />
      <Card className="overflow-hidden">
        <FilterBar>
          <SearchInput value={q} onChange={setQ} placeholder="Cari nama, SKU, atau potongan…" className="sm:w-80" />
          <FilterChips<FK> value={k} onChange={setK} opsi={[{ nilai: 'semua', label: 'Semua' }, ...(['sapi', 'ayam', 'kambing', 'kemasan'] as Kategori[]).map((x) => ({ nilai: x, label: LABEL_KATEGORI[x].replace('Daging ', '').replace('Produk ', ''), jumlah: produk.filter((p) => p.kategori === x).length }))]} />
        </FilterBar>
        {produk.length === 0 ? (
          <EmptyState judul="Belum ada produk" pesan="Tambahkan produk pertama Anda. Data langsung tersimpan ke Google Sheets." aksi={bolehUbah ? <Button onClick={() => setEdit('baru')}>Tambah produk</Button> : undefined} />
        ) : (
        <DataTable data={daftar} kolom={bolehUbah ? kolom : kolom.filter((c) => c.key !== 'e')} rowKey={(p) => p.id} onRowClick={setDetail} kosong={{ judul: 'Produk tidak ditemukan', pesan: 'Coba kata kunci lain.' }}
          kartuMobile={(p) => (
            <div className="flex items-center gap-3">
              <ProductThumb produk={p} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{p.nama}</p>
                <p className="text-xs text-gray-500">{p.sku}, {p.tipe === 'timbang' ? 'timbang' : 'kemasan'}</p>
                <p className="num mt-0.5 text-sm font-bold text-brand-800">{rupiah(p.hargaJual)}<span className="text-xs font-normal text-gray-500">/{p.satuan}</span></p>
              </div>
              <div className="text-right"><p className="num text-sm">{qtySatuan(p.stok, p.satuan)}</p>{p.aktif ? <StokBadge stok={p.stok} min={p.stokMinimum} /> : <Badge>Nonaktif</Badge>}</div>
            </div>
          )} />
        )}
      </Card>
      <div className="mt-4"><Catatan>Data produk tersimpan di Google Sheets. Stok dihitung dari riwayat mutasi; produk baru stoknya 0 sampai ada penerimaan barang (menu Pembelian → Stok → Terima barang). Gambar produk berupa ilustrasi per kategori.</Catatan></div>

      <Modal buka={!!detail} onTutup={() => setDetail(null)} judul="Detail produk" lebar="md"
        footer={<><Button varian="garis" onClick={() => setDetail(null)}>Tutup</Button>{bolehUbah && <Button ikon={<Pencil className="h-4 w-4" />} onClick={() => { setEdit(detail); setDetail(null); }}>Ubah produk</Button>}</>}>
        {detail && (
          <div className="grid gap-5 sm:grid-cols-[180px_1fr]">
            <ProductThumb produk={detail} ukuran="penuh" />
            <div>
              <p className="text-lg font-extrabold">{detail.nama}</p>
              <p className="text-sm text-gray-500">{detail.sku}, {LABEL_KATEGORI[detail.kategori]}</p>
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                {[
                  ['Potongan', detail.potongan], ['Tipe', detail.tipe === 'timbang' ? 'Daging timbang' : 'Produk kemasan'],
                  ['Satuan jual', `per ${detail.satuan}`], ['Status', detail.aktif ? 'Aktif' : 'Nonaktif'],
                  ['HPP', rupiah(detail.hpp)], ['Harga jual', rupiah(detail.hargaJual)],
                  ['Margin', `${angka(margin(detail) * 100, 1)}% (${rupiah(detail.hargaJual - detail.hpp)}/${detail.satuan})`], ['Stok', `${qtySatuan(detail.stok, detail.satuan)} (min ${qtySatuan(detail.stokMinimum, detail.satuan)})`],
                ].map(([a, b]) => <div key={a}><dt className="text-xs text-gray-500">{a}</dt><dd className="num font-semibold">{b}</dd></div>)}
              </dl>
              {detail.keterangan && <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">{detail.keterangan}</p>}
            </div>
          </div>
        )}
      </Modal>

      <FormProduk produk={edit} onTutup={() => setEdit(null)} onSimpan={async (p) => {
        const baru = edit === 'baru';
        try { await data.simpanProduk(p, baru); } catch (e) {
          toast({ jenis: 'gagal', judul: 'Produk tidak tersimpan', pesan: pesanGalat(e) });
          return;
        }
        setEdit(null);
        toast({ jenis: 'sukses', judul: baru ? 'Produk ditambahkan' : 'Produk diperbarui', pesan: `${p.nama} tersimpan di Google Sheets.` });
      }} />
    </>
  );
}

function FormProduk({ produk, onTutup, onSimpan }: { produk: TProduk | 'baru' | null; onTutup: () => void; onSimpan: (p: TProduk) => Promise<void> }) {
  const kosong: TProduk = { id: '', sku: '', nama: '', kategori: 'sapi', potongan: '', tipe: 'timbang', satuan: 'kg', hpp: 0, hargaJual: 0, stok: 0, stokMinimum: 5, aktif: true };
  const [f, setF] = useState<TProduk>(kosong);
  const [err, setErr] = useState<Record<string, string>>({});
  const [proses, setProses] = useState(false);
  useEffect(() => { if (produk) { setF(produk === 'baru' ? { ...kosong, id: `p${Date.now()}` } : produk); setErr({}); } }, [produk]); // eslint-disable-line
  const set = <K extends keyof TProduk>(k: K, v: TProduk[K]) => setF((x) => ({ ...x, [k]: v }));
  const n = (s: string) => parseInt(s.replace(/\D/g, ''), 10) || 0;
  const simpan = async () => {
    const e: Record<string, string> = {};
    if (!f.nama.trim()) e.nama = 'Nama wajib diisi.';
    if (!f.sku.trim()) e.sku = 'SKU wajib diisi.';
    if (f.hargaJual <= 0) e.harga = 'Harga jual harus lebih dari 0.';
    else if (f.hargaJual < f.hpp) e.harga = 'Harga jual di bawah HPP.';
    setErr(e);
    if (Object.keys(e).length) return;
    setProses(true);
    try { await onSimpan(f); } finally { setProses(false); }
  };
  return (
    <Modal buka={!!produk} onTutup={onTutup} judul={produk === 'baru' ? 'Tambah produk' : 'Ubah produk'} lebar="md"
      footer={<><Button varian="garis" onClick={onTutup}>Batal</Button><Button onClick={() => void simpan()} disabled={proses}>{proses ? 'Menyimpan…' : 'Simpan produk'}</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><Input label="Nama produk" value={f.nama} error={err.nama} onChange={(e) => set('nama', e.target.value)} placeholder="Mis. Daging Sapi Sandung Lamur" /></div>
        <Input label="SKU" value={f.sku} error={err.sku} onChange={(e) => set('sku', e.target.value.toUpperCase())} placeholder="SP-006" />
        <Select label="Kategori" value={f.kategori} onChange={(e) => { const k = e.target.value as Kategori; setF((x) => ({ ...x, kategori: k, tipe: k === 'kemasan' ? 'kemasan' : 'timbang', satuan: k === 'kemasan' ? 'pcs' : 'kg' })); }}
          opsi={(['sapi', 'ayam', 'kambing', 'kemasan'] as Kategori[]).map((k) => ({ nilai: k, label: LABEL_KATEGORI[k] }))} />
        <Input label="Jenis potongan" value={f.potongan} onChange={(e) => set('potongan', e.target.value)} placeholder="Mis. Sandung lamur (brisket)" />
        <Select label="Tipe produk" value={f.tipe} onChange={(e) => { const t = e.target.value as TProduk['tipe']; setF((x) => ({ ...x, tipe: t, satuan: t === 'timbang' ? 'kg' : 'pcs' })); }}
          opsi={[{ nilai: 'timbang', label: 'Daging timbang (per kg)' }, { nilai: 'kemasan', label: 'Produk kemasan (per pcs)' }]} />
        <Input label={`HPP per ${f.satuan}`} awalan="Rp" inputMode="numeric" value={f.hpp ? angka(f.hpp) : ''} onChange={(e) => set('hpp', n(e.target.value))} />
        <Input label={`Harga jual per ${f.satuan}`} awalan="Rp" inputMode="numeric" error={err.harga} value={f.hargaJual ? angka(f.hargaJual) : ''} onChange={(e) => set('hargaJual', n(e.target.value))}
          bantuan={f.hargaJual > 0 ? `Margin ${angka(margin(f) * 100, 1)}%` : undefined} />
        <Input label="Stok minimum" akhiran={f.satuan} inputMode="decimal" value={String(f.stokMinimum).replace('.', ',')} onChange={(e) => set('stokMinimum', parseFloat(e.target.value.replace(',', '.')) || 0)} />
        <div className="flex items-end"><div className="w-full"><Toggle label="Produk aktif" keterangan="Tampil di kasir" checked={f.aktif} onChange={(v) => set('aktif', v)} /></div></div>
      </div>
      {produk === 'baru' && <p className="mt-4 text-xs text-gray-500">Stok awal diisi lewat penerimaan barang agar tercatat di riwayat mutasi.</p>}
    </Modal>
  );
}
