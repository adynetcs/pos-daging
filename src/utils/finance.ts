/**
 * Selector keuangan & ringkasan. Semua angka turunan dihitung di sini dari data mentah,
 * sehingga halaman tidak pernah menghitung sendiri (menghindari angka ganda/berbeda).
 *
 * Aturan akuntansi yang dipakai (basis sederhana untuk UMKM):
 * - Modal masuk bukan omzet. Penarikan modal bukan beban.
 * - Omzet eceran diakui saat transaksi kasir. Omzet pesanan partai diakui saat pesanan
 *   SELESAI (barang diserahkan). DP pelanggan sebelum itu = uang muka (kewajiban), bukan pendapatan.
 * - HPP = qty terjual × HPP produk. Pembelian stok masuk ke persediaan, bukan beban.
 * - DP ke supplier = uang muka pembelian (aset) sampai barang diterima.
 * - Buku kas dibentuk dari setiap pembayaran satu kali saja (tidak ada pencatatan ganda).
 */
import type {
  BarisKas, MutasiModal, Pembelian, Pengeluaran, PesananPartai, Produk, StatusPesanan, TransaksiEceran,
} from '@/types';
import { jumlah, nilaiBaris, targetDP, totalItems } from './calc';

export interface DataUsaha {
  produk: Produk[];
  transaksi: TransaksiEceran[];
  pesanan: PesananPartai[];
  pembelian: Pembelian[];
  modal: MutasiModal[];
  pengeluaran: Pengeluaran[];
}

export interface Periode { dari: string; sampai: string }
const dalam = (tgl: string, p?: Periode) => !p || (tgl.slice(0, 10) >= p.dari && tgl.slice(0, 10) <= p.sampai);

/* ---------- Transaksi eceran ---------- */
export const subtotalTrx = (t: TransaksiEceran) => totalItems(t.items);
export const returTrx = (t: TransaksiEceran) => jumlah(t.retur ?? [], (r) => r.nilai);
/** Total setelah diskon dan retur */
export const totalTrx = (t: TransaksiEceran) => subtotalTrx(t) - t.diskon - returTrx(t);
export const tempoTrx = (t: TransaksiEceran) => jumlah(t.pembayaran.filter((b) => b.metode === 'tempo'), (b) => b.jumlah);
export const tunaiTrx = (t: TransaksiEceran) => totalTrx(t) - tempoTrx(t);

/* ---------- Pesanan partai ---------- */
export const totalPesanan = (p: PesananPartai) => totalItems(p.items);
export const dpPesanan = (p: PesananPartai, persen?: number) => targetDP(totalPesanan(p), p.dpPersen !== undefined ? p.dpPersen / 100 : persen);
/** Uang bersih dari pelanggan: pembayaran dikurangi pengembalian. */
export const dibayarPesanan = (p: PesananPartai) => jumlah(p.pembayaran, (b) => (b.jenis === 'refund' ? -b.jumlah : b.jumlah));
export const sisaPesanan = (p: PesananPartai) =>
  p.status === 'batal' ? 0 : Math.max(0, totalPesanan(p) - dibayarPesanan(p));
export const dpTerpenuhi = (p: PesananPartai) => dibayarPesanan(p) >= dpPesanan(p);
export const STATUS_AKTIF: StatusPesanan[] = ['menunggu_dp', 'proses', 'siap_kirim'];

/* ---------- Pembelian ---------- */
export const nilaiPembelian = (b: Pembelian) => {
  const basisTerima = b.statusPenerimaan !== 'dipesan';
  return jumlah(b.items, (i) => nilaiBaris(basisTerima ? i.qtyTerima : i.qtyPesan, i.harga)) + b.biayaTambahan;
};
export const dibayarPembelian = (b: Pembelian) => jumlah(b.pembayaran, (x) => x.jumlah);
export const dpSupplier = (b: Pembelian) => jumlah(b.pembayaran.filter((x) => x.jenis === 'dp'), (x) => x.jumlah);
/** Utang hanya timbul atas barang yang sudah diterima. */
export const utangPembelian = (b: Pembelian) =>
  b.statusPenerimaan === 'dipesan' ? 0 : Math.max(0, nilaiPembelian(b) - dibayarPembelian(b));
/** Uang muka yang masih "menggantung" karena barang belum diterima. */
export const uangMukaPembelian = (b: Pembelian) => (b.statusPenerimaan === 'dipesan' ? dibayarPembelian(b) : 0);
export const statusBayarPembelian = (b: Pembelian): 'lunas' | 'dp' | 'belum' | 'sebagian' => {
  const dibayar = dibayarPembelian(b);
  if (dibayar === 0) return 'belum';
  if (b.statusPenerimaan === 'dipesan') return 'dp';
  return dibayar >= nilaiPembelian(b) ? 'lunas' : 'sebagian';
};

/* ---------- Buku kas ---------- */
export function bukuKas(d: DataUsaha): BarisKas[] {
  const baris: BarisKas[] = [];
  for (const m of d.modal) {
    baris.push({
      id: m.id, tanggal: m.tanggal, referensi: m.id, keterangan: m.keterangan,
      sumber: m.jenis === 'penarikan' ? 'penarikan_modal' : 'modal',
      masuk: m.jenis === 'penarikan' ? 0 : m.jumlah, keluar: m.jenis === 'penarikan' ? m.jumlah : 0,
    });
  }
  // Penjualan eceran digabung per hari (tanggal uang diterima) agar buku kas tetap ringkas.
  // Pelunasan piutang tempo dicatat terpisah pada hari pelunasannya.
  const perHari = new Map<string, number>();
  const pelunasan = new Map<string, number>();
  for (const t of d.transaksi) {
    for (const b of t.pembayaran) {
      if (b.metode === 'tempo') continue;
      const waktu = b.tanggal ?? t.tanggal;
      const k = waktu.slice(0, 10);
      // Pembayaran saat transaksi tercatat pada waktu yang sama persis; selain itu = pelunasan kemudian
      const peta = waktu === t.tanggal ? perHari : pelunasan;
      peta.set(k, (peta.get(k) ?? 0) + b.jumlah);
    }
  }
  for (const [tgl, v] of perHari) {
    baris.push({ id: `KS-${tgl}`, tanggal: tgl, sumber: 'penjualan_eceran', referensi: 'Rekap kasir', keterangan: 'Penjualan eceran (tunai, transfer, QRIS)', masuk: v, keluar: 0 });
  }
  // Uang yang dikembalikan karena retur, per hari
  const kembali = new Map<string, number>();
  for (const t of d.transaksi) for (const r of t.refund ?? []) kembali.set(r.tanggal.slice(0, 10), (kembali.get(r.tanggal.slice(0, 10)) ?? 0) + r.jumlah);
  for (const [tgl, v] of kembali) {
    baris.push({ id: `KR-${tgl}`, tanggal: tgl, sumber: 'refund_pelanggan', referensi: 'Retur kasir', keterangan: 'Pengembalian uang retur penjualan', masuk: 0, keluar: v });
  }
  for (const [tgl, v] of pelunasan) {
    baris.push({ id: `KP-${tgl}`, tanggal: tgl, sumber: 'pelunasan_pelanggan', referensi: 'Rekap kasir', keterangan: 'Pelunasan piutang penjualan tempo', masuk: v, keluar: 0 });
  }
  for (const p of d.pesanan) {
    for (const b of p.pembayaran) {
      if (b.jenis === 'refund') {
        baris.push({ id: b.id, tanggal: b.tanggal, referensi: p.id, sumber: 'refund_pelanggan', keterangan: 'Pengembalian DP pesanan batal', masuk: 0, keluar: b.jumlah });
        continue;
      }
      baris.push({
        id: b.id, tanggal: b.tanggal, referensi: p.id,
        sumber: b.jenis === 'dp' ? 'dp_pelanggan' : 'pelunasan_pelanggan',
        keterangan: `${b.jenis === 'dp' ? 'DP' : 'Pelunasan'} pesanan partai`, masuk: b.jumlah, keluar: 0,
      });
    }
  }
  for (const pb of d.pembelian) {
    for (const b of pb.pembayaran) {
      baris.push({
        id: b.id, tanggal: b.tanggal, referensi: pb.id,
        sumber: b.jenis === 'dp' ? 'dp_supplier' : 'bayar_supplier',
        keterangan: b.jenis === 'dp' ? 'Uang muka pembelian ke supplier' : 'Pembayaran pembelian ke supplier', masuk: 0, keluar: b.jumlah,
      });
    }
  }
  for (const e of d.pengeluaran) {
    baris.push({ id: e.id, tanggal: e.tanggal, sumber: 'pengeluaran', referensi: e.kategori, keterangan: e.keterangan, masuk: 0, keluar: e.jumlah });
  }
  // Dalam satu hari: uang masuk dicatat lebih dulu daripada uang keluar
  return baris.sort((a, b) => a.tanggal.localeCompare(b.tanggal) || (b.masuk > 0 ? 1 : 0) - (a.masuk > 0 ? 1 : 0) || a.id.localeCompare(b.id));
}

export function saldoKas(d: DataUsaha, sampai?: string) {
  return jumlah(bukuKas(d).filter((b) => !sampai || b.tanggal <= sampai), (b) => b.masuk - b.keluar);
}

/* ---------- Penjualan (omzet diakui) ---------- */
export interface BarisPenjualan { tanggal: string; produkId: string; qty: number; nilai: number; hpp: number; sumber: 'eceran' | 'partai' }

export function barisPenjualan(d: DataUsaha, p?: Periode): BarisPenjualan[] {
  const hppOf = (id: string) => d.produk.find((x) => x.id === id)?.hpp ?? 0;
  const out: BarisPenjualan[] = [];
  for (const t of d.transaksi) {
    if (!dalam(t.tanggal, p)) continue;
    const sub = subtotalTrx(t);
    for (const i of t.items) {
      const nilai = nilaiBaris(i.qty, i.harga);
      // Diskon dialokasikan proporsional ke tiap baris
      const potongan = sub > 0 ? Math.round((t.diskon * nilai) / sub) : 0;
      out.push({ tanggal: t.tanggal.slice(0, 10), produkId: i.produkId, qty: i.qty, nilai: nilai - potongan, hpp: nilaiBaris(i.qty, i.hpp ?? hppOf(i.produkId)), sumber: 'eceran' });
    }
  }
  // Retur mengurangi omzet & HPP pada tanggal retur (laporan periode sebelumnya tidak berubah)
  for (const t of d.transaksi) {
    for (const r of t.retur ?? []) {
      if (!dalam(r.tanggal, p)) continue;
      out.push({ tanggal: r.tanggal.slice(0, 10), produkId: r.produkId, qty: -r.qty, nilai: -r.nilai, hpp: -nilaiBaris(r.qty, r.hpp), sumber: 'eceran' });
    }
  }
  for (const ps of d.pesanan) {
    // Omzet partai diakui pada tanggal barang diserahkan (selesai), bukan tanggal jadwal kirim
    const tglAkui = ps.selesaiPada ?? ps.jadwalKirim;
    if (ps.status !== 'selesai' || !dalam(tglAkui, p)) continue;
    for (const i of ps.items) {
      out.push({ tanggal: tglAkui, produkId: i.produkId, qty: i.qty, nilai: nilaiBaris(i.qty, i.harga), hpp: nilaiBaris(i.qty, i.hpp ?? hppOf(i.produkId)), sumber: 'partai' });
    }
  }
  return out;
}

export function labaRugi(d: DataUsaha, p?: Periode) {
  const rows = barisPenjualan(d, p);
  const omzetEceran = jumlah(rows.filter((r) => r.sumber === 'eceran'), (r) => r.nilai);
  const omzetPartai = jumlah(rows.filter((r) => r.sumber === 'partai'), (r) => r.nilai);
  const omzet = omzetEceran + omzetPartai;
  const hpp = jumlah(rows, (r) => r.hpp);
  const labaKotor = omzet - hpp;
  // DP pesanan batal yang tidak dikembalikan (hangus) = pendapatan lain-lain
  const dpHangus = jumlah(d.pesanan.filter((ps) => ps.status === 'batal' && dalam(ps.dibatalkanPada ?? ps.tanggal, p)), (ps) => Math.max(0, dibayarPesanan(ps)));
  const bebanList = d.pengeluaran.filter((e) => dalam(e.tanggal, p));
  const beban = jumlah(bebanList, (e) => e.jumlah);
  const perKategori = new Map<string, number>();
  for (const e of bebanList) perKategori.set(e.kategori, (perKategori.get(e.kategori) ?? 0) + e.jumlah);
  return {
    omzetEceran, omzetPartai, omzet, hpp, labaKotor, beban,
    bebanPerKategori: [...perKategori].map(([kategori, nilai]) => ({ kategori, nilai })),
    pendapatanLain: dpHangus,
    labaBersih: labaKotor + dpHangus - beban,
    marginKotor: omzet ? labaKotor / omzet : 0,
  };
}

export function ringkasanModal(d: DataUsaha, p?: Periode) {
  const m = d.modal.filter((x) => dalam(x.tanggal, p));
  const awal = jumlah(m.filter((x) => x.jenis === 'awal'), (x) => x.jumlah);
  const tambahan = jumlah(m.filter((x) => x.jenis === 'tambahan'), (x) => x.jumlah);
  const penarikan = jumlah(m.filter((x) => x.jenis === 'penarikan'), (x) => x.jumlah);
  return { awal, tambahan, penarikan, bersih: awal + tambahan - penarikan };
}

export function ringkasanKas(d: DataUsaha, p?: Periode) {
  const rows = bukuKas(d).filter((b) => dalam(b.tanggal, p));
  const masuk = jumlah(rows, (r) => r.masuk);
  const keluar = jumlah(rows, (r) => r.keluar);
  const masukOperasi = jumlah(rows.filter((r) => r.sumber !== 'modal'), (r) => r.masuk);
  return { masuk, keluar, masukOperasi, saldo: saldoKas(d, p?.sampai) };
}

/** Piutang = sisa tagihan pesanan yang sudah diserahkan + transaksi kasir tempo. */
export function piutang(d: DataUsaha) {
  const dariPesanan = d.pesanan.filter((p) => p.status === 'selesai' && sisaPesanan(p) > 0)
    .map((p) => ({ ref: p.id, pelangganId: p.pelangganId, tanggal: p.selesaiPada ?? p.jadwalKirim, nilai: sisaPesanan(p), sumber: 'Pesanan partai' }));
  const dariKasir = d.transaksi.filter((t) => tempoTrx(t) > 0)
    .map((t) => ({ ref: t.id, pelangganId: t.pelangganId, tanggal: t.tanggal.slice(0, 10), nilai: tempoTrx(t), sumber: 'Kasir (tempo)' }));
  const semua = [...dariPesanan, ...dariKasir].sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  return { semua, total: jumlah(semua, (x) => x.nilai), jumlahPelanggan: new Set(semua.map((x) => x.pelangganId)).size };
}

/** DP pelanggan untuk pesanan yang belum selesai — kewajiban, bukan pendapatan. */
export const uangMukaPelanggan = (d: DataUsaha) =>
  jumlah(d.pesanan.filter((p) => p.status !== 'selesai' && p.status !== 'batal'), dibayarPesanan);

export function utangSupplier(d: DataUsaha) {
  const daftar = d.pembelian.filter((b) => utangPembelian(b) > 0);
  return { daftar, total: jumlah(daftar, utangPembelian) };
}

export const uangMukaSupplier = (d: DataUsaha) => jumlah(d.pembelian, uangMukaPembelian);

export const nilaiPersediaan = (d: DataUsaha) => jumlah(d.produk, (p) => Math.round(p.stok * p.hpp));

export function penjualanHarian(d: DataUsaha, hari: string[]) {
  return hari.map((h) => ({
    tanggal: h,
    nilai: jumlah(barisPenjualan(d, { dari: h, sampai: h }), (r) => r.nilai),
    transaksi: d.transaksi.filter((t) => t.tanggal.startsWith(h)).length,
  }));
}

export function penjualanPerKategori(d: DataUsaha, p?: Periode) {
  const rows = barisPenjualan(d, p);
  const map = new Map<string, number>();
  for (const r of rows) {
    const k = d.produk.find((x) => x.id === r.produkId)?.kategori ?? 'lain';
    map.set(k, (map.get(k) ?? 0) + r.nilai);
  }
  const total = jumlah([...map.values()], (v) => v);
  return { total, data: [...map].map(([kategori, nilai]) => ({ kategori, nilai, porsi: total ? nilai / total : 0 })).sort((a, b) => b.nilai - a.nilai) };
}

export function produkTerlaris(d: DataUsaha, p?: Periode) {
  const map = new Map<string, { qty: number; nilai: number; laba: number }>();
  for (const r of barisPenjualan(d, p)) {
    const x = map.get(r.produkId) ?? { qty: 0, nilai: 0, laba: 0 };
    x.qty += r.qty; x.nilai += r.nilai; x.laba += r.nilai - r.hpp;
    map.set(r.produkId, x);
  }
  return [...map].map(([produkId, v]) => ({ produkId, ...v })).sort((a, b) => b.nilai - a.nilai);
}

export function rentangHari(akhir: string, n: number): string[] {
  const out: string[] = [];
  const base = new Date(`${akhir}T00:00:00`);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base);
    d.setDate(d.getDate() - i);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  }
  return out;
}

/** Nilai persediaan menurut buku = pembelian yang sudah diterima − HPP barang terjual. */
export function persediaanBuku(d: DataUsaha) {
  const masuk = jumlah(d.pembelian.filter((b) => b.statusPenerimaan !== 'dipesan'), nilaiPembelian);
  return masuk - labaRugi(d).hpp;
}

/**
 * Rekonsiliasi: menjelaskan mengapa saldo kas ≠ laba.
 * Saldo kas = modal bersih + laba bersih + DP pelanggan aktif + utang supplier
 *             − piutang − uang muka ke supplier − persediaan (buku)
 */
export function rekonsiliasiKas(d: DataUsaha) {
  const baris = [
    { label: 'Modal bersih pemilik', nilai: ringkasanModal(d).bersih, ket: 'Setoran modal dikurangi penarikan' },
    { label: 'Laba bersih', nilai: labaRugi(d).labaBersih, ket: 'Hasil usaha periode berjalan' },
    { label: 'DP pelanggan (pesanan belum selesai)', nilai: uangMukaPelanggan(d), ket: 'Uang titipan, wajib dipenuhi dengan barang' },
    { label: 'Utang ke supplier', nilai: utangSupplier(d).total, ket: 'Barang sudah diterima, belum dibayar' },
    { label: 'Piutang pelanggan', nilai: -piutang(d).total, ket: 'Sudah jadi omzet, uang belum masuk' },
    { label: 'Uang muka ke supplier', nilai: -uangMukaSupplier(d), ket: 'Sudah dibayar, barang belum datang' },
    { label: 'Persediaan belum terjual', nilai: -persediaanBuku(d), ket: 'Uang tertanam dalam stok' },
  ];
  const hitung = jumlah(baris, (b) => b.nilai);
  return { baris, hitung, saldo: saldoKas(d), selisih: saldoKas(d) - hitung };
}
