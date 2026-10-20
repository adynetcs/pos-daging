export type PageKey =
  | 'dashboard' | 'kasir' | 'pesanan' | 'produk' | 'stok' | 'pembelian'
  | 'pelanggan' | 'supplier' | 'keuangan' | 'laporan' | 'pengaturan';

export type Kategori = 'sapi' | 'ayam' | 'kambing' | 'kemasan';
export type TipeProduk = 'timbang' | 'kemasan';
export type Satuan = 'kg' | 'pcs';

export interface Produk {
  id: string;
  sku: string;
  nama: string;
  kategori: Kategori;
  potongan: string;
  tipe: TipeProduk;
  satuan: Satuan;
  /** Harga pokok per satuan (Rp) */
  hpp: number;
  /** Harga jual per satuan (Rp) */
  hargaJual: number;
  /** Stok dalam satuan produk (kg untuk timbang, pcs untuk kemasan) */
  stok: number;
  stokMinimum: number;
  aktif: boolean;
  keterangan?: string;
}

export type JenisPelanggan = 'eceran' | 'partai';
export interface Pelanggan {
  id: string;
  nama: string;
  telepon: string;
  alamat: string;
  jenis: JenisPelanggan;
}

export interface Supplier {
  id: string;
  nama: string;
  kontak: string;
  telepon: string;
  alamat: string;
  komoditas: string;
}

export type MetodeBayar = 'tunai' | 'transfer' | 'qris' | 'tempo';

export interface ItemTransaksi {
  produkId: string;
  qty: number;
  harga: number;
  /** HPP per satuan yang dicatat saat transaksi (dari Sheets). */
  hpp?: number;
}

export interface TransaksiEceran {
  id: string;
  tanggal: string; // ISO date-time
  pelangganId: string;
  items: ItemTransaksi[];
  diskon: number;
  /** tanggal = waktu uang diterima (pelunasan tempo bisa berbeda hari dengan transaksi) */
  pembayaran: { metode: MetodeBayar; jumlah: number; tanggal?: string }[];
  /** Retur sebagian: nilai sudah termasuk potongan diskon proporsional */
  retur?: { produkId: string; qty: number; nilai: number; hpp: number; tanggal: string; kembaliStok: boolean }[];
  /** Uang yang dikembalikan ke pelanggan (dari retur) */
  refund?: { metode: Exclude<MetodeBayar, 'tempo'>; jumlah: number; tanggal: string }[];
}

export type StatusPesanan =
  | 'draft' | 'menunggu_dp' | 'proses' | 'siap_kirim' | 'selesai' | 'batal';

export interface PembayaranPesanan {
  id: string;
  tanggal: string;
  jenis: 'dp' | 'pelunasan' | 'cicilan' | 'refund';
  metode: Exclude<MetodeBayar, 'tempo'>;
  jumlah: number;
  bukti?: string;
}

export interface PesananPartai {
  id: string;
  tanggal: string;
  pelangganId: string;
  items: ItemTransaksi[];
  pembayaran: PembayaranPesanan[];
  jadwalKirim: string;
  alamatKirim: string;
  catatan?: string;
  status: StatusPesanan;
  /** Persentase DP yang berlaku saat pesanan dibuat. */
  dpPersen?: number;
  /** Tanggal barang benar-benar diserahkan (status selesai). Dasar pengakuan omzet. */
  selesaiPada?: string;
  dibatalkanPada?: string;
}

export interface ItemPembelian {
  produkId: string;
  qtyPesan: number;
  qtyTerima: number;
  harga: number;
}

export interface PembayaranSupplier {
  id: string;
  tanggal: string;
  jenis: 'dp' | 'pelunasan' | 'lunas';
  jumlah: number;
}

export type StatusPenerimaan = 'dipesan' | 'sebagian' | 'diterima';

export interface Pembelian {
  id: string;
  tanggal: string;
  supplierId: string;
  items: ItemPembelian[];
  biayaTambahan: number;
  keteranganBiaya?: string;
  pembayaran: PembayaranSupplier[];
  statusPenerimaan: StatusPenerimaan;
}

export type JenisMutasi = 'masuk' | 'terjual' | 'rusak' | 'susut' | 'koreksi' | 'batal';
export interface MutasiStok {
  id: string;
  tanggal: string;
  produkId: string;
  jenis: JenisMutasi;
  qty: number; // positif = bertambah, negatif = berkurang
  referensi: string;
  catatan?: string;
}

export interface BatchStok {
  id: string;
  produkId: string;
  tanggalMasuk: string;
  kedaluwarsa: string;
  qtyAwal: number;
  qtySisa: number;
  sumber: string;
}

export interface Pengeluaran {
  id: string;
  tanggal: string;
  kategori: 'Sewa' | 'Listrik & Air' | 'Gaji' | 'Kemasan' | 'Transportasi' | 'Lain-lain';
  keterangan: string;
  jumlah: number;
}

export interface MutasiModal {
  id: string;
  tanggal: string;
  jenis: 'awal' | 'tambahan' | 'penarikan';
  keterangan: string;
  jumlah: number;
}

/** Baris buku kas — setiap uang masuk/keluar tercatat tepat satu kali. */
export type SumberKas =
  | 'modal' | 'penarikan_modal' | 'penjualan_eceran' | 'dp_pelanggan'
  | 'pelunasan_pelanggan' | 'refund_pelanggan' | 'dp_supplier' | 'bayar_supplier' | 'pengeluaran';

export interface BarisKas {
  id: string;
  tanggal: string;
  sumber: SumberKas;
  keterangan: string;
  referensi: string;
  masuk: number;
  keluar: number;
}

export interface Notifikasi {
  id: string;
  judul: string;
  isi: string;
  waktu: string;
  jenis: 'stok' | 'pesanan' | 'bayar';
  dibaca: boolean;
}
