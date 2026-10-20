/**
 * Sumber data aplikasi: SELURUHNYA dari Google Sheets lewat /api (Vercel → Apps Script).
 *
 * - Saat dibuka, aplikasi memuat satu "snapshot" lengkap (data.semua).
 * - Setiap aksi tulis dikirim ke server; server memvalidasi, menulis ke Sheets, lalu
 *   mengembalikan snapshot terbaru dalam jawaban yang sama. Tidak ada data yang hanya
 *   tersimpan di browser.
 * - Semua angka turunan (stok, kas, laba) tetap dihitung dari data mentah ini.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Loader2, RefreshCw, WifiOff } from 'lucide-react';
import { api, ApiError, type ProdukSheet } from '@/services/api';
import type {
  BatchStok, MetodeBayar, MutasiModal, MutasiStok, Notifikasi, Pelanggan, Pembelian, Pengeluaran,
  PesananPartai, Produk, StatusPesanan, Supplier, TransaksiEceran,
} from '@/types';
import type { DataUsaha } from '@/utils/finance';
import { hariIni, tambahHari } from '@/utils/waktu';
import { qtySatuan } from '@/utils/format';

/* ---------------- Bentuk data dari server ---------------- */
interface Snapshot {
  waktu_server: string;
  pengaturan: Record<string, string>;
  produk: ProdukSheet[];
  pelanggan: { id: string; nama: string; telepon: string; alamat: string; jenis: 'eceran' | 'partai' }[];
  supplier: Supplier[];
  penjualan: { id: string; waktu: string; id_pelanggan: string; diskon: number; total: number; items: { id_produk: string; qty: number; harga: number; hpp: number }[]; bayar: { metode: Exclude<MetodeBayar, 'tempo'>; jumlah: number }[] }[];
  pesanan: { id: string; tanggal: string; id_pelanggan: string; jadwal_kirim: string; alamat_kirim: string; dp_persen: number; status: StatusPesanan; catatan: string; selesai_pada: string;
    items: { id_produk: string; qty: number; harga: number; hpp: number }[]; bayar: { id: string; waktu: string; jenis: 'dp' | 'cicilan' | 'pelunasan'; metode: 'tunai' | 'transfer' | 'qris'; jumlah: number; bukti: string }[] }[];
  pembelian: { id: string; tanggal: string; id_supplier: string; status: 'dipesan' | 'sebagian' | 'diterima'; biaya_tambahan: number; ket_biaya: string;
    items: { id_produk: string; qty_pesan: number; qty_terima: number; harga: number }[]; bayar: { id: string; waktu: string; jenis: 'dp' | 'pelunasan' | 'lunas'; jumlah: number }[] }[];
  mutasi: { id: string; waktu: string; id_produk: string; id_batch: string; jenis: MutasiStok['jenis'] | 'retur' | 'batal'; qty: number; ref: string; catatan: string }[];
  batch: { id: string; id_produk: string; id_pembelian: string; masuk: string; kedaluwarsa: string; qty_awal: number; hpp: number }[];
  modal: { id: string; tanggal: string; jenis: MutasiModal['jenis']; jumlah: number; keterangan: string }[];
  pengeluaran: { id: string; tanggal: string; kategori: Pengeluaran['kategori']; keterangan: string; jumlah: number; metode: string }[];
}

export interface Pengaturan {
  namaUsaha: string; tagline: string; alamat: string; telepon: string; npwp: string; rekening: string;
  dpPersen: number;
  formatNoTransaksi: string; formatNoPesanan: string; formatNoPembelian: string;
  strukFooter: string; strukLebar: '58mm' | '80mm'; tampilLogoStruk: boolean;
  metodeAktif: { tunai: boolean; transfer: boolean; qris: boolean; tempo: boolean };
}

const iso = (w: string) => String(w || '').replace(' ', 'T');
const ya = (v: string | undefined, bawaan = true) => (v === undefined || v === '' ? bawaan : v.toUpperCase() === 'TRUE');

export const keProduk = (p: ProdukSheet): Produk => ({
  id: p.id_produk, sku: p.sku, nama: p.nama, kategori: p.kategori === 'lainnya' ? 'kemasan' : p.kategori,
  potongan: p.potongan || '-', tipe: p.tipe, satuan: p.satuan, hpp: p.hpp, hargaJual: p.harga_jual,
  stok: p.stok, stokMinimum: p.stok_minimum, aktif: p.aktif, keterangan: p.keterangan || undefined,
});

function kePengaturan(o: Record<string, string>): Pengaturan {
  return {
    namaUsaha: o.nama_usaha || 'Steak Hook Premium', tagline: o.tagline ?? '', alamat: o.alamat_usaha ?? '',
    telepon: o.telepon_usaha ?? '', npwp: o.npwp ?? '', rekening: o.rekening_transfer ?? '',
    dpPersen: Number(o.dp_persen || 70),
    formatNoTransaksi: o.format_no_penjualan || 'TRX-{YYYYMMDD}-{NNN}', formatNoPesanan: o.format_no_pesanan || 'PP-{YYYYMMDD}-{NN}',
    formatNoPembelian: o.format_no_pembelian || 'PB-{YYYYMMDD}-{NN}',
    strukFooter: o.struk_footer ?? '', strukLebar: o.struk_lebar === '80mm' ? '80mm' : '58mm', tampilLogoStruk: ya(o.struk_logo),
    metodeAktif: { tunai: ya(o.metode_tunai), qris: ya(o.metode_qris), transfer: ya(o.metode_transfer), tempo: ya(o.metode_tempo) },
  };
}

/** Sisa per batch: stok sekarang dialokasikan ke batch terbaru lebih dulu (asumsi FIFO keluar). */
function sisaBatch(batch: Snapshot['batch'], stok: Record<string, number>): BatchStok[] {
  const sisa = { ...stok };
  return [...batch].sort((a, b) => b.masuk.localeCompare(a.masuk) || b.id.localeCompare(a.id)).map((x) => {
    const q = Math.max(0, Math.min(x.qty_awal, sisa[x.id_produk] ?? 0));
    sisa[x.id_produk] = (sisa[x.id_produk] ?? 0) - q;
    return { id: x.id, produkId: x.id_produk, tanggalMasuk: x.masuk, kedaluwarsa: x.kedaluwarsa, qtyAwal: x.qty_awal, qtySisa: Math.round(q * 1000) / 1000, sumber: x.id_pembelian || 'Stok awal' };
  });
}

function petakan(s: Snapshot) {
  const produk = s.produk.map(keProduk);
  const transaksi: TransaksiEceran[] = s.penjualan.map((t) => {
    const dibayar = t.bayar.reduce((a, b) => a + b.jumlah, 0);
    const pembayaran: TransaksiEceran['pembayaran'] = t.bayar.map((b) => ({ metode: b.metode, jumlah: b.jumlah }));
    if (dibayar < t.total) pembayaran.push({ metode: 'tempo', jumlah: t.total - dibayar });
    return { id: t.id, tanggal: iso(t.waktu), pelangganId: t.id_pelanggan, diskon: t.diskon, pembayaran,
      items: t.items.map((i) => ({ produkId: i.id_produk, qty: i.qty, harga: i.harga, hpp: i.hpp })) };
  });
  const pesanan: PesananPartai[] = s.pesanan.map((p) => ({
    id: p.id, tanggal: p.tanggal, pelangganId: p.id_pelanggan, jadwalKirim: p.jadwal_kirim, alamatKirim: p.alamat_kirim || '-',
    catatan: p.catatan || undefined, status: p.status, dpPersen: p.dp_persen || undefined, selesaiPada: p.selesai_pada || undefined,
    items: p.items.map((i) => ({ produkId: i.id_produk, qty: i.qty, harga: i.harga, hpp: i.hpp })),
    pembayaran: p.bayar.map((b) => ({ id: b.id, tanggal: b.waktu.slice(0, 10), jenis: b.jenis, metode: b.metode, jumlah: b.jumlah, bukti: b.bukti || undefined })),
  }));
  const pembelian: Pembelian[] = s.pembelian.map((b) => ({
    id: b.id, tanggal: b.tanggal, supplierId: b.id_supplier, statusPenerimaan: b.status, biayaTambahan: b.biaya_tambahan,
    keteranganBiaya: b.ket_biaya || undefined,
    items: b.items.map((i) => ({ produkId: i.id_produk, qtyPesan: i.qty_pesan, qtyTerima: i.qty_terima, harga: i.harga })),
    pembayaran: b.bayar.map((x) => ({ id: x.id, tanggal: x.waktu.slice(0, 10), jenis: x.jenis, jumlah: x.jumlah })),
  }));
  const mutasiStok: MutasiStok[] = s.mutasi
    .map((m) => ({ id: m.id, tanggal: iso(m.waktu), produkId: m.id_produk, jenis: (m.jenis === 'retur' || m.jenis === 'batal' ? 'koreksi' : m.jenis) as MutasiStok['jenis'], qty: m.qty, referensi: m.ref, catatan: m.catatan || undefined }))
    .sort((a, b) => b.tanggal.localeCompare(a.tanggal) || b.id.localeCompare(a.id));
  const stok = Object.fromEntries(produk.map((p) => [p.id, p.stok]));
  return {
    produk, transaksi, pesanan, pembelian, mutasiStok,
    pelanggan: s.pelanggan as Pelanggan[],
    supplier: s.supplier,
    batch: sisaBatch(s.batch, stok),
    modal: s.modal.map((m) => ({ id: m.id, tanggal: m.tanggal, jenis: m.jenis, keterangan: m.keterangan, jumlah: m.jumlah })),
    pengeluaran: s.pengeluaran.map((e) => ({ id: e.id, tanggal: e.tanggal, kategori: e.kategori, keterangan: e.keterangan, jumlah: e.jumlah })),
    pengaturan: kePengaturan(s.pengaturan),
    waktuServer: iso(s.waktu_server),
  };
}

/** Pemberitahuan diturunkan dari data, bukan disimpan. */
function buatNotifikasi(d: ReturnType<typeof petakan>): Notifikasi[] {
  const hari = hariIni(), besok = tambahHari(hari, 1);
  const out: Notifikasi[] = [];
  d.produk.filter((p) => p.aktif && p.stok < p.stokMinimum).forEach((p) =>
    out.push({ id: `stok-${p.id}-${p.stok}`, jenis: 'stok', judul: p.stok <= 0 ? 'Stok habis' : 'Stok menipis', isi: `${p.nama} tersisa ${qtySatuan(p.stok, p.satuan)} (minimum ${qtySatuan(p.stokMinimum, p.satuan)}).`, waktu: d.waktuServer, dibaca: false }));
  d.pesanan.filter((p) => p.status === 'menunggu_dp').forEach((p) =>
    out.push({ id: `dp-${p.id}`, jenis: 'pesanan', judul: 'DP belum masuk', isi: `${p.id} ${d.pelanggan.find((c) => c.id === p.pelangganId)?.nama ?? ''} menunggu DP.`, waktu: `${p.tanggal}T00:00:00`, dibaca: false }));
  d.pesanan.filter((p) => ['proses', 'siap_kirim'].includes(p.status) && p.jadwalKirim <= besok).forEach((p) =>
    out.push({ id: `kirim-${p.id}-${p.jadwalKirim}`, jenis: 'pesanan', judul: p.jadwalKirim < hari ? 'Pengiriman terlambat' : p.jadwalKirim === hari ? 'Kirim hari ini' : 'Kirim besok', isi: `${p.id} dijadwalkan ${p.jadwalKirim}.`, waktu: `${p.jadwalKirim}T00:00:00`, dibaca: false }));
  return out;
}

/* ---------------- Payload aksi tulis ---------------- */
export interface InputPenjualan { id_permintaan: string; id_pelanggan: string; items: { id_produk: string; qty: number }[]; diskon: number; pembayaran: { metode: 'tunai' | 'transfer' | 'qris'; jumlah: number }[] }
export interface InputPesanan { id_pelanggan: string; jadwal_kirim: string; alamat_kirim: string; catatan: string; status: 'draft' | 'menunggu_dp'; items: { id_produk: string; qty: number; harga: number }[] }
export interface InputPembelian { id_supplier: string; items: { id_produk: string; qty: number; harga: number }[]; biaya_tambahan: number; ket_biaya: string; dp: number; metode: 'tunai' | 'transfer' | 'qris' }

type Data = ReturnType<typeof petakan>;
interface Store extends DataUsaha, Omit<Data, 'produk' | 'transaksi' | 'pesanan' | 'pembelian' | 'modal' | 'pengeluaran'> {
  notifikasi: Notifikasi[];
  memuatUlang: boolean;
  muatUlang: () => Promise<void>;
  bacaSemuaNotifikasi: () => void;
  simpanTransaksi: (p: InputPenjualan) => Promise<{ id: string; total: number; waktu: string }>;
  simpanProduk: (p: Produk, baru: boolean) => Promise<void>;
  simpanPelanggan: (p: Omit<Pelanggan, 'id'> & { id?: string }) => Promise<string>;
  simpanSupplier: (p: Omit<Supplier, 'id'> & { id?: string }) => Promise<void>;
  buatPesanan: (p: InputPesanan) => Promise<string>;
  ubahStatusPesanan: (id: string, status: StatusPesanan) => Promise<void>;
  bayarPesanan: (id: string, b: { jenis: 'dp' | 'cicilan' | 'pelunasan'; metode: 'tunai' | 'transfer' | 'qris'; jumlah: number; bukti?: string }) => Promise<StatusPesanan>;
  buatPembelian: (p: InputPembelian) => Promise<string>;
  terimaPembelian: (id: string, qty: Record<string, number>) => Promise<void>;
  bayarPembelian: (id: string, jumlah: number, metode?: 'tunai' | 'transfer' | 'qris') => Promise<void>;
  sesuaikanStok: (p: { id_produk: string; jenis: 'rusak' | 'susut' | 'koreksi'; qty: number; catatan: string }) => Promise<void>;
  tambahModal: (m: { jenis: MutasiModal['jenis']; tanggal: string; jumlah: number; keterangan: string }) => Promise<void>;
  tambahPengeluaran: (e: { kategori: Pengeluaran['kategori']; tanggal: string; jumlah: number; keterangan: string; metode?: string }) => Promise<void>;
  simpanPengaturan: (nilai: Record<string, string>) => Promise<void>;
}

const Ctx = createContext<Store | null>(null);
export const useData = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useData harus di dalam DataProvider');
  return c;
};

export function DataProvider({ children }: { children: ReactNode }) {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [memuatUlang, setMemuatUlang] = useState(false);
  const [dibaca, setDibaca] = useState<Set<string>>(new Set());

  const muatUlang = useCallback(async () => {
    setMemuatUlang(true);
    try {
      setSnap(await api.rpc<Snapshot>('data.semua'));
      setGalat(null);
    } catch (e) {
      setGalat(e instanceof ApiError ? e.message : 'Gagal memuat data');
      throw e;
    } finally {
      setMemuatUlang(false);
    }
  }, []);

  useEffect(() => { muatUlang().catch(() => { /* ditampilkan di layar galat */ }); }, [muatUlang]);

  /** Kirim aksi tulis; server mengembalikan hasil + snapshot terbaru sekaligus. */
  const tulis = useCallback(async <T,>(aksi: string, payload: object): Promise<T> => {
    const r = await api.rpc<{ hasil: T; semua: Snapshot }>(aksi, { ...payload, __segarkan: true });
    setSnap(r.semua);
    return r.hasil;
  }, []);

  const data = useMemo(() => (snap ? petakan(snap) : null), [snap]);
  const notifikasi = useMemo(() => (data ? buatNotifikasi(data).map((n) => ({ ...n, dibaca: dibaca.has(n.id) })) : []), [data, dibaca]);

  const store = useMemo<Store | null>(() => data && ({
    ...data, notifikasi, memuatUlang, muatUlang,
    bacaSemuaNotifikasi: () => setDibaca(new Set(notifikasi.map((n) => n.id))),
    simpanTransaksi: (p) => tulis('penjualan.simpan', p),
    simpanProduk: async (p, baru) => {
      await tulis('produk.simpan', {
        id_produk: baru ? '' : p.id, sku: p.sku, nama: p.nama, kategori: p.kategori, potongan: p.potongan === '-' ? '' : p.potongan,
        tipe: p.tipe, satuan: p.satuan, hpp: p.hpp, harga_jual: p.hargaJual, stok_minimum: p.stokMinimum, aktif: p.aktif, keterangan: p.keterangan ?? '',
      });
    },
    simpanPelanggan: async (p) => (await tulis<{ id: string }>('pelanggan.simpan', p)).id,
    simpanSupplier: async (p) => { await tulis('supplier.simpan', p); },
    buatPesanan: async (p) => (await tulis<{ id: string }>('pesanan.simpan', p)).id,
    ubahStatusPesanan: async (id, status) => { await tulis('pesanan.status', { id, status }); },
    bayarPesanan: async (id, b) => (await tulis<{ status: StatusPesanan }>('pesanan.bayar', { id, ...b })).status,
    buatPembelian: async (p) => (await tulis<{ id: string }>('pembelian.simpan', p)).id,
    terimaPembelian: async (id, qty) => { await tulis('pembelian.terima', { id, qty }); },
    bayarPembelian: async (id, jumlah, metode = 'transfer') => { await tulis('pembelian.bayar', { id, jumlah, metode }); },
    sesuaikanStok: async (p) => { await tulis('stok.sesuaikan', p); },
    tambahModal: async (m) => { await tulis('modal.simpan', m); },
    tambahPengeluaran: async (e) => { await tulis('pengeluaran.simpan', e); },
    simpanPengaturan: async (nilai) => { await tulis('pengaturan.simpan', { nilai }); },
  }), [data, notifikasi, memuatUlang, muatUlang, tulis]);

  if (!store) {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas px-6 text-center" style={{ minHeight: '100dvh' }}>
        {galat ? (
          <div className="max-w-sm">
            <WifiOff className="mx-auto h-10 w-10 text-gray-400" />
            <p className="mt-3 font-bold text-gray-900">Data belum bisa dimuat</p>
            <p className="mt-1 text-sm text-gray-600">{galat}</p>
            <button onClick={() => { muatUlang().catch(() => {}); }} disabled={memuatUlang}
              className="btn mt-5 h-11 bg-brand-700 px-5 text-white hover:bg-brand-800">
              <RefreshCw className={`h-4 w-4 ${memuatUlang ? 'animate-spin' : ''}`} />Coba lagi
            </button>
          </div>
        ) : (
          <div className="text-gray-500"><Loader2 className="mx-auto h-8 w-8 animate-spin text-brand-700" /><p className="mt-3 text-sm">Memuat data dari Google Sheets…</p></div>
        )}
      </div>
    );
  }
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

/** Helper pencarian entitas */
export function useLookup() {
  const { produk, pelanggan, supplier } = useData();
  return useMemo(() => ({
    produk: (id: string) => produk.find((p) => p.id === id),
    pelanggan: (id: string) => pelanggan.find((p) => p.id === id),
    supplier: (id: string) => supplier.find((p) => p.id === id),
  }), [produk, pelanggan, supplier]);
}

/** Ubah error apa pun menjadi pesan untuk pengguna. */
export const pesanGalat = (e: unknown) => (e instanceof ApiError ? e.message : 'Terjadi kesalahan. Coba lagi.');
