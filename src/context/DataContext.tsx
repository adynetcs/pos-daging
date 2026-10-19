/**
 * Store lokal (state React) untuk mode DEMO. Semua perubahan hanya hidup di memori
 * browser dan hilang saat halaman dimuat ulang — tidak ada yang tersimpan ke database.
 */
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import * as D from '@/data/dummy';
import type {
  MutasiStok, Notifikasi, PembayaranSupplier, Pelanggan, Pembelian, Pengeluaran, PembayaranPesanan, PesananPartai,
  Produk, StatusPesanan, Supplier, TransaksiEceran, MutasiModal, BatchStok,
} from '@/types';
import { bulatkanBerat } from '@/utils/calc';
import type { DataUsaha } from '@/utils/finance';

export interface Pengaturan {
  dpPersen: number;
  formatNoTransaksi: string;
  formatNoPesanan: string;
  strukFooter: string;
  strukLebar: '58mm' | '80mm';
  tampilLogoStruk: boolean;
  metodeAktif: { tunai: boolean; transfer: boolean; qris: boolean; tempo: boolean };
}

interface Store extends DataUsaha {
  pelanggan: Pelanggan[];
  supplier: Supplier[];
  mutasiStok: MutasiStok[];
  batch: BatchStok[];
  notifikasi: Notifikasi[];
  pengaturan: Pengaturan;
  simpanTransaksi: (t: TransaksiEceran) => void;
  simpanProduk: (p: Produk) => void;
  ubahStatusPesanan: (id: string, s: StatusPesanan) => void;
  tambahBayarPesanan: (id: string, b: PembayaranPesanan) => void;
  simpanPesanan: (p: PesananPartai) => void;
  mutasi: (m: MutasiStok) => void;
  terimaPembelian: (id: string, qtyTerima: Record<string, number>) => void;
  simpanPembelian: (p: Pembelian) => void;
  tambahBayarPembelian: (id: string, b: PembayaranSupplier) => void;
  tambahPengeluaran: (e: Pengeluaran) => void;
  tambahModal: (m: MutasiModal) => void;
  simpanPelanggan: (p: Pelanggan) => void;
  bacaSemuaNotifikasi: () => void;
  setPengaturan: (p: Pengaturan) => void;
}

const Ctx = createContext<Store | null>(null);
export const useData = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useData harus di dalam DataProvider');
  return c;
};

export function DataProvider({ children }: { children: ReactNode }) {
  const [produk, setProduk] = useState(D.produkAwal);
  const [transaksi, setTransaksi] = useState(D.transaksiAwal);
  const [pesanan, setPesanan] = useState(D.pesananAwal);
  const [pembelian, setPembelian] = useState(D.pembelianAwal);
  const [modal, setModal] = useState(D.modalAwal);
  const [pengeluaran, setPengeluaran] = useState(D.pengeluaranAwal);
  const [pelanggan, setPelanggan] = useState(D.pelangganAwal);
  const [supplier] = useState(D.supplierAwal);
  const [mutasiStok, setMutasiStok] = useState(D.mutasiStokAwal);
  const [batch] = useState(D.batchAwal);
  const [notifikasi, setNotifikasi] = useState(D.notifikasiAwal);
  const [pengaturan, setPengaturan] = useState<Pengaturan>({
    dpPersen: 70,
    formatNoTransaksi: 'TRX-{YYYYMMDD}-{NNN}',
    formatNoPesanan: 'PP-{YYYYMMDD}-{NN}',
    strukFooter: 'Terima kasih. Daging segar setiap hari.',
    strukLebar: '58mm',
    tampilLogoStruk: true,
    metodeAktif: { tunai: true, transfer: true, qris: true, tempo: true },
  });

  const ubahStok = (produkId: string, delta: number) =>
    setProduk((ps) => ps.map((p) => (p.id === produkId ? { ...p, stok: bulatkanBerat(Math.max(0, p.stok + delta)) } : p)));

  const store = useMemo<Store>(() => ({
    produk, transaksi, pesanan, pembelian, modal, pengeluaran, pelanggan, supplier, mutasiStok, batch, notifikasi, pengaturan,
    simpanTransaksi: (t) => {
      setTransaksi((l) => [...l, t]);
      t.items.forEach((i) => ubahStok(i.produkId, -i.qty));
      setMutasiStok((l) => [
        ...t.items.map((i, k) => ({ id: `MS-K${Date.now()}${k}`, tanggal: t.tanggal, produkId: i.produkId, jenis: 'terjual' as const, qty: -i.qty, referensi: t.id })),
        ...l,
      ]);
    },
    simpanProduk: (p) => setProduk((l) => (l.some((x) => x.id === p.id) ? l.map((x) => (x.id === p.id ? p : x)) : [...l, p])),
    ubahStatusPesanan: (id, s) => setPesanan((l) => l.map((p) => (p.id === id ? { ...p, status: s } : p))),
    tambahBayarPesanan: (id, b) => setPesanan((l) => l.map((p) => (p.id === id ? { ...p, pembayaran: [...p.pembayaran, b] } : p))),
    simpanPesanan: (p) => setPesanan((l) => (l.some((x) => x.id === p.id) ? l.map((x) => (x.id === p.id ? p : x)) : [p, ...l])),
    mutasi: (m) => { setMutasiStok((l) => [m, ...l]); ubahStok(m.produkId, m.qty); },
    terimaPembelian: (id, qty) => {
      const pb = pembelian.find((x) => x.id === id);
      if (!pb) return;
      setPembelian((l) => l.map((x) => (x.id === id
        ? { ...x, statusPenerimaan: 'diterima', items: x.items.map((i) => ({ ...i, qtyTerima: qty[i.produkId] ?? i.qtyPesan })) }
        : x)));
      pb.items.forEach((i, k) => {
        const q = qty[i.produkId] ?? i.qtyPesan;
        ubahStok(i.produkId, q);
        setMutasiStok((l) => [{ id: `MS-T${Date.now()}${k}`, tanggal: D.SEKARANG, produkId: i.produkId, jenis: 'masuk', qty: q, referensi: id }, ...l]);
      });
    },
    simpanPembelian: (p) => setPembelian((l) => [p, ...l]),
    tambahBayarPembelian: (id, b) => setPembelian((l) => l.map((x) => (x.id === id ? { ...x, pembayaran: [...x.pembayaran, b] } : x))),
    tambahPengeluaran: (e) => setPengeluaran((l) => [...l, e]),
    tambahModal: (m) => setModal((l) => [...l, m]),
    simpanPelanggan: (p) => setPelanggan((l) => (l.some((x) => x.id === p.id) ? l.map((x) => (x.id === p.id ? p : x)) : [...l, p])),
    bacaSemuaNotifikasi: () => setNotifikasi((l) => l.map((n) => ({ ...n, dibaca: true }))),
    setPengaturan,
  }), [produk, transaksi, pesanan, pembelian, modal, pengeluaran, pelanggan, supplier, mutasiStok, batch, notifikasi, pengaturan]);

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
