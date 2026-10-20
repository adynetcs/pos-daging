import { useMemo, useRef, useState } from 'react';
import { Minus, Plus, Trash2, ShoppingCart, PauseCircle, ChevronUp, X, Scale, Archive } from 'lucide-react';
import { useData, pesanGalat } from '@/context/DataContext';
import { idPermintaan } from '@/services/api';
import { useToast } from '@/context/ToastContext';
import { SearchInput } from '@/components/ui/SearchInput';
import { FilterChips } from '@/components/ui/FilterBar';
import { ProductThumb } from '@/components/ui/ProductThumb';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/States';
import { Modal } from '@/components/ui/Modal';
import { TimbangModal } from './kasir/TimbangModal';
import { BayarModal, type HasilBayar } from './kasir/BayarModal';
import { StrukModal } from './kasir/Struk';
import { RiwayatKasir } from './kasir/Riwayat';
import type { ItemTransaksi, Kategori, Produk, TransaksiEceran } from '@/types';
import { bulatkanBerat, nilaiBaris, totalItems } from '@/utils/calc';
import { angka, berat, qtySatuan, rupiah } from '@/utils/format';

type KatFilter = 'semua' | Kategori;
interface Tertahan { id: string; label: string; items: ItemTransaksi[]; pelangganId: string; diskon: number }

export default function Kasir() {
  const { produk, pelanggan, simpanTransaksi, pengaturan } = useData();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [kat, setKat] = useState<KatFilter>('semua');
  const [keranjang, setKeranjang] = useState<ItemTransaksi[]>([]);
  const [pelangganId, setPelangganId] = useState('PLG-0000');
  const [memproses, setMemproses] = useState(false);
  /** Kunci anti-duplikat: tetap sama selama satu kali proses pembayaran, walau tombol tertekan dua kali. */
  const kunciBayar = useRef<string>('');
  const [diskonMode, setDiskonMode] = useState<'rp' | 'persen'>('rp');
  const [diskonInput, setDiskonInput] = useState('');
  const [timbang, setTimbang] = useState<{ p: Produk; awal?: number } | null>(null);
  const [bayar, setBayar] = useState(false);
  const [struk, setStruk] = useState<{ trx: TransaksiEceran; h: HasilBayar } | null>(null);
  const [sheet, setSheet] = useState(false);
  const [tertahan, setTertahan] = useState<Tertahan[]>([]);
  const [daftarTahan, setDaftarTahan] = useState(false);
  const [riwayat, setRiwayat] = useState(false);

  const aktif = produk.filter((p) => p.aktif);
  const daftar = useMemo(() => {
    const s = q.trim().toLowerCase();
    return aktif.filter((p) => (kat === 'semua' || p.kategori === kat) && (!s || p.nama.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s)));
  }, [aktif, q, kat]);

  const diKeranjang = (id: string) => keranjang.find((i) => i.produkId === id)?.qty ?? 0;
  const subtotal = totalItems(keranjang);
  const diskonAngka = parseFloat(diskonInput.replace(/\./g, '').replace(',', '.')) || 0;
  const diskon = Math.min(subtotal, Math.round(diskonMode === 'rp' ? diskonAngka : (subtotal * Math.min(100, diskonAngka)) / 100));
  const total = subtotal - diskon;
  const jumlahItem = keranjang.length;

  const setQty = (p: Produk, qty: number) => {
    const q2 = bulatkanBerat(Math.min(p.stok, Math.max(0, qty)));
    setKeranjang((k) => {
      if (q2 <= 0) return k.filter((i) => i.produkId !== p.id);
      return k.some((i) => i.produkId === p.id)
        ? k.map((i) => (i.produkId === p.id ? { ...i, qty: q2 } : i))
        : [...k, { produkId: p.id, qty: q2, harga: p.hargaJual }];
    });
  };

  const klikProduk = (p: Produk) => {
    if (p.stok <= 0) return toast({ jenis: 'peringatan', judul: 'Stok habis', pesan: `${p.nama} tidak bisa dijual.` });
    if (p.satuan === 'kg') return setTimbang({ p });
    if (diKeranjang(p.id) >= p.stok) return toast({ jenis: 'peringatan', judul: 'Stok tidak cukup', pesan: `Sisa ${qtySatuan(p.stok, p.satuan)}.` });
    setQty(p, diKeranjang(p.id) + 1);
  };

  const reset = () => { setKeranjang([]); setDiskonInput(''); setPelangganId('PLG-0000'); };

  const tahan = () => {
    if (!keranjang.length) return;
    const nama = pelanggan.find((c) => c.id === pelangganId)?.nama ?? 'Pelanggan';
    setTertahan((t) => [...t, { id: `H${Date.now()}`, label: `${nama}, ${rupiah(total)}`, items: keranjang, pelangganId, diskon }]);
    reset();
    setSheet(false);
    toast({ jenis: 'info', judul: 'Keranjang disimpan sementara', pesan: 'Lanjutkan nanti dari tombol "Tertahan". Belum tercatat sebagai penjualan.' });
  };

  const bukaBayar = () => { kunciBayar.current = idPermintaan(); setBayar(true); };

  const selesaiBayar = async (h: HasilBayar) => {
    if (memproses) return;
    setMemproses(true);
    try {
      const hasil = await simpanTransaksi({
        id_permintaan: kunciBayar.current,
        id_pelanggan: pelangganId,
        items: keranjang.map((i) => ({ id_produk: i.produkId, qty: i.qty })),
        diskon,
        // Tempo tidak dikirim sebagai pembayaran; kekurangannya otomatis menjadi piutang di server
        pembayaran: h.pembayaran.filter((b) => b.metode !== 'tempo').map((b) => ({ metode: b.metode as 'tunai' | 'transfer' | 'qris', jumlah: b.jumlah })),
      });
      const trx: TransaksiEceran = { id: hasil.id, tanggal: hasil.waktu.replace(' ', 'T'), pelangganId, items: keranjang, diskon, pembayaran: h.pembayaran };
      setBayar(false);
      setSheet(false);
      setStruk({ trx, h });
      reset();
      toast({ jenis: 'sukses', judul: 'Pembayaran tersimpan', pesan: `${hasil.id} tercatat di Google Sheets.` });
    } catch (e) {
      toast({ jenis: 'gagal', judul: 'Transaksi belum tersimpan', pesan: pesanGalat(e) });
    } finally {
      setMemproses(false);
    }
  };

  const panelKeranjang = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 pb-3 pl-4 pr-12 pt-4 lg:pr-4">
        <h2 className="flex items-center gap-2 text-[15px] font-bold">Keranjang <span className="num rounded-full bg-gray-100 px-2 text-xs text-gray-600">{jumlahItem}</span></h2>
        <div className="flex items-center gap-1">
          <button onClick={() => { setSheet(false); setRiwayat(true); }} className="rounded-lg px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-100">Riwayat</button>
          {tertahan.length > 0 && <button onClick={() => setDaftarTahan(true)} className="rounded-lg px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-100">Tertahan ({tertahan.length})</button>}
          {jumlahItem > 0 && <button onClick={reset} className="rounded-lg px-2 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50">Kosongkan</button>}
        </div>
      </div>
      <div className="px-4 pb-3">
        <label className="label" htmlFor="pel">Pelanggan</label>
        <select id="pel" value={pelangganId} onChange={(e) => setPelangganId(e.target.value)} className="input">
          {pelanggan.map((c) => <option key={c.id} value={c.id}>{c.nama}{c.jenis === 'partai' ? ' (partai)' : ''}</option>)}
        </select>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto border-y border-gray-100">
        {keranjang.length === 0 ? (
          <EmptyState ikon={ShoppingCart} judul="Keranjang kosong" pesan="Ketuk produk di katalog untuk menambahkannya." />
        ) : (
          <ul className="divide-y divide-gray-100">
            {keranjang.map((i) => {
              const p = produk.find((x) => x.id === i.produkId)!;
              const kg = p.satuan === 'kg';
              const langkah = kg ? 0.1 : 1;
              return (
                <li key={i.produkId} className="flex gap-3 px-4 py-3">
                  <ProductThumb produk={p} ukuran="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold leading-tight text-gray-800">{p.nama}</p>
                      <button onClick={() => setQty(p, 0)} className="-mr-1 -mt-0.5 rounded p-1 text-gray-400 hover:text-red-600" aria-label={`Hapus ${p.nama}`}><Trash2 className="h-4 w-4" /></button>
                    </div>
                    <p className="num text-xs text-gray-500">{rupiah(i.harga)} / {p.satuan}</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="flex items-center rounded-lg ring-1 ring-gray-200">
                        <button onClick={() => setQty(p, i.qty - langkah)} className="grid h-8 w-8 place-items-center text-gray-600 hover:bg-gray-50" aria-label="Kurangi"><Minus className="h-3.5 w-3.5" /></button>
                        <button onClick={() => kg && setTimbang({ p, awal: i.qty })} className={`num min-w-[64px] px-1 text-center text-[13px] font-bold ${kg ? 'underline decoration-dotted underline-offset-2' : 'cursor-default'}`} aria-label={kg ? 'Ubah berat' : undefined}>
                          {qtySatuan(i.qty, p.satuan)}
                        </button>
                        <button onClick={() => setQty(p, i.qty + langkah)} disabled={i.qty >= p.stok} className="grid h-8 w-8 place-items-center text-gray-600 hover:bg-gray-50 disabled:opacity-30" aria-label="Tambah"><Plus className="h-3.5 w-3.5" /></button>
                      </div>
                      <span className="num text-sm font-bold">{rupiah(nilaiBaris(i.qty, i.harga))}</span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <div className="space-y-2 px-4 pt-3 text-sm">
        <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span className="num font-semibold">{rupiah(subtotal)}</span></div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-gray-500">Diskon</span>
          <div className="flex items-center gap-1.5">
            <div className="flex rounded-lg bg-gray-100 p-0.5 text-xs font-bold">
              {(['rp', 'persen'] as const).map((m) => (
                <button key={m} onClick={() => setDiskonMode(m)} aria-pressed={diskonMode === m} className={`rounded-md px-2 py-1 ${diskonMode === m ? 'bg-white shadow-card' : 'text-gray-500'}`}>{m === 'rp' ? 'Rp' : '%'}</button>
              ))}
            </div>
            <input inputMode="decimal" value={diskonInput} onChange={(e) => setDiskonInput(e.target.value.replace(/[^0-9.,]/g, ''))} placeholder="0" aria-label="Nilai diskon"
              className="num h-8 w-24 rounded-lg border border-gray-300 px-2 text-right text-sm focus:border-brand-500 focus:outline-none" />
          </div>
        </div>
        {diskon > 0 && <div className="flex justify-between text-emerald-700"><span>Potongan</span><span className="num font-semibold">-{rupiah(diskon)}</span></div>}
        <div className="flex items-end justify-between border-t border-gray-100 pt-2">
          <span className="font-semibold">Total</span><span className="num text-2xl font-extrabold">{rupiah(total)}</span>
        </div>
      </div>
      <div className="grid grid-cols-[auto_1fr] gap-2 p-4">
        <Button varian="garis" ukur="lg" disabled={!jumlahItem} onClick={tahan} ikon={<PauseCircle className="h-4 w-4" />}>Simpan</Button>
        <Button ukur="lg" disabled={!jumlahItem} onClick={bukaBayar}>Bayar {jumlahItem ? rupiah(total) : ''}</Button>
      </div>
    </div>
  );

  return (
    <div className="grid gap-5 pb-[calc(var(--tinggi-keranjang)+12px)] lg:grid-cols-[minmax(0,1fr)_380px] lg:pb-0">
      <div className="min-w-0">
        <div className="mb-4 hidden items-center justify-between gap-3 lg:flex">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">Kasir</h1>
            <p className="text-sm text-gray-500">Ketuk produk timbang untuk memasukkan berat.</p>
          </div>
        </div>
        {/* Pencarian + kategori menempel tepat di bawah header saat discroll (HP). Margin negatif
            di sini sengaja menyamai padding <main> agar latar bilah ini selebar layar. */}
        <div className="sticky z-10 -mx-3 mb-1 space-y-2 bg-canvas/95 px-3 pb-2.5 pt-1 backdrop-blur sm:-mx-4 sm:px-4 lg:static lg:mx-0 lg:mb-4 lg:space-y-3 lg:bg-transparent lg:px-0 lg:pt-0"
          style={{ top: 'calc(var(--aman-atas) + var(--tinggi-header))' }}>
          <SearchInput value={q} onChange={setQ} placeholder="Cari nama produk atau SKU…" />
          <FilterChips<KatFilter> label="Kategori" value={kat} onChange={setKat}
            opsi={[
              { nilai: 'semua', label: 'Semua', jumlah: aktif.length },
              { nilai: 'sapi', label: 'Sapi' }, { nilai: 'ayam', label: 'Ayam' },
              { nilai: 'kambing', label: 'Kambing' }, { nilai: 'kemasan', label: 'Kemasan' },
            ]} />
        </div>

        {daftar.length === 0 ? (
          <div className="card"><EmptyState judul="Produk tidak ditemukan" pesan="Coba kata kunci lain atau pilih kategori Semua." /></div>
        ) : (
          <ul className="grid grid-cols-1 gap-2.5 min-[300px]:grid-cols-2 sm:grid-cols-3 sm:gap-3 xl:grid-cols-4">
            {daftar.map((p) => {
              const ada = diKeranjang(p.id);
              const sisa = p.stok - ada;
              const tipis = p.stok < p.stokMinimum;
              return (
                <li key={p.id}>
                  <button onClick={() => klikProduk(p)} disabled={p.stok <= 0}
                    className={`card relative flex h-full w-full flex-col p-2 text-left transition-colors hover:border-brand-300 active:bg-gray-50 disabled:opacity-50 sm:p-2.5 ${ada ? 'border-brand-400 ring-2 ring-brand-500/20' : ''}`}>
                    <ProductThumb produk={p} ukuran="kartu" />
                    {ada > 0 && <span className="num absolute right-3 top-3 rounded-full bg-brand-700 px-2 py-0.5 text-[11px] font-bold text-white">{qtySatuan(ada, p.satuan)}</span>}
                    <p className="mt-1.5 line-clamp-2 min-h-[2.25rem] text-[13px] font-semibold leading-[1.15rem] text-gray-900">{p.nama}</p>
                    <p className="num mt-auto pt-1 text-[15px] font-extrabold leading-tight text-brand-800">{rupiah(p.hargaJual)}<span className="text-xs font-medium text-gray-500">/{p.satuan}</span></p>
                    <p className={`num flex items-center gap-1 text-[11px] ${tipis ? 'font-semibold text-red-600' : 'text-gray-500'}`}>
                      {p.satuan === 'kg' && <Scale className="h-3 w-3" />}Stok {qtySatuan(sisa, p.satuan)}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Keranjang desktop */}
      <aside className="card sticky hidden h-[calc(100dvh-var(--tinggi-header)-var(--aman-atas)-3rem)] overflow-hidden lg:block"
        style={{ top: 'calc(var(--aman-atas) + var(--tinggi-header) + 1.5rem)' }}>{panelKeranjang}</aside>

      {/* Bilah keranjang HP */}
      <div className="fixed inset-x-0 z-30 px-3 lg:hidden" style={{ bottom: 'calc(var(--tinggi-nav) + var(--aman-bawah) + 8px)' }}>
        <button onClick={() => setSheet(true)} aria-label={`Buka keranjang, ${jumlahItem} produk, total ${rupiah(total)}`}
          className="mx-auto flex h-[var(--tinggi-keranjang)] w-full max-w-lg items-center gap-3 rounded-2xl bg-ink-900 px-4 text-white shadow-pop">
          <span className="relative shrink-0"><ShoppingCart className="h-5 w-5" />{jumlahItem > 0 && <span className="absolute -right-2 -top-2 grid h-4 min-w-4 place-items-center rounded-full bg-brand-500 px-1 text-[10px] font-bold">{jumlahItem}</span>}</span>
          <span className="min-w-0 flex-1 truncate text-left text-sm font-semibold">{jumlahItem ? `${jumlahItem} produk` : 'Keranjang'}</span>
          <span className="num shrink-0 text-base font-extrabold">{rupiah(total)}</span>
          <span className="flex shrink-0 items-center gap-0.5 rounded-lg bg-white/10 px-2 py-1 text-xs font-bold">Buka<ChevronUp className="h-3.5 w-3.5" /></span>
        </button>
      </div>
      {sheet && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Keranjang">
          <div className="fade-in absolute inset-0 bg-ink-900/50" onClick={() => setSheet(false)} />
          <div className="sheet-in absolute inset-x-0 bottom-0 flex flex-col rounded-t-3xl bg-white"
            style={{ height: 'calc(100dvh - var(--aman-atas) - 24px)', paddingBottom: 'var(--aman-bawah)' }}>
            <button onClick={() => setSheet(false)} className="absolute right-3 top-3 z-10 rounded-lg p-1.5 text-gray-400" aria-label="Tutup keranjang"><X className="h-5 w-5" /></button>
            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-gray-300" />
            <div className="min-h-0 flex-1">{panelKeranjang}</div>
          </div>
        </div>
      )}

      {timbang && (
        <TimbangModal produk={timbang.p} awal={timbang.awal}
          sisaStok={timbang.awal !== undefined ? timbang.p.stok : timbang.p.stok - diKeranjang(timbang.p.id)}
          onTutup={() => setTimbang(null)}
          onSimpan={(kg) => {
            setQty(timbang.p, timbang.awal !== undefined ? kg : diKeranjang(timbang.p.id) + kg);
            toast({ jenis: 'sukses', judul: `${berat(kg)} ${timbang.p.nama}`, pesan: timbang.awal !== undefined ? 'Berat diperbarui.' : 'Ditambahkan ke keranjang.' });
            setTimbang(null);
          }} />
      )}
      <BayarModal buka={bayar} total={total} bolehTempo={pelangganId !== 'PLG-0000'} metodeAktif={pengaturan.metodeAktif} rekening={pengaturan.rekening} memproses={memproses} onTutup={() => { if (!memproses) setBayar(false); }} onBayar={(h) => { void selesaiBayar(h); }} />
      <RiwayatKasir buka={riwayat} onTutup={() => setRiwayat(false)} />
      <StrukModal trx={struk?.trx ?? null} diterima={struk?.h.diterima} kembalian={struk?.h.kembalian} onTutup={() => setStruk(null)} />
      <Modal buka={daftarTahan} onTutup={() => setDaftarTahan(false)} judul="Keranjang tertahan" sub="Disimpan sementara di perangkat ini" lebar="sm">
        {tertahan.length === 0 ? <EmptyState ikon={Archive} judul="Tidak ada keranjang tertahan" /> : (
          <ul className="divide-y divide-gray-100">
            {tertahan.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 py-3">
                <div><p className="text-sm font-semibold">{t.label}</p><p className="text-xs text-gray-500">{t.items.length} produk, diskon {rupiah(t.diskon)}</p></div>
                <Button ukur="sm" onClick={() => {
                  if (keranjang.length) tahan();
                  setKeranjang(t.items); setPelangganId(t.pelangganId); setDiskonMode('rp'); setDiskonInput(t.diskon ? angka(t.diskon) : '');
                  setTertahan((l) => l.filter((x) => x.id !== t.id)); setDaftarTahan(false);
                }}>Lanjutkan</Button>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </div>
  );
}
