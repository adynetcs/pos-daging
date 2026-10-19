/**
 * DATA CONTOH (DUMMY) — terpusat di satu file agar mudah diganti dengan API.
 * Harga bukan harga pasar aktual. Semua angka di aplikasi diturunkan dari data ini
 * supaya dashboard, laporan, dan keuangan selalu konsisten.
 */
import type {
  BatchStok, MetodeBayar, MutasiModal, MutasiStok, Notifikasi, Pelanggan, Pembelian,
  Pengeluaran, PesananPartai, Produk, Supplier, TransaksiEceran,
} from '@/types';

/** "Hari ini" versi demo — dibuat tetap supaya data contoh konsisten. */
export const HARI_INI = '2026-10-12';
export const SEKARANG = '2026-10-12T14:30:00';

export const USAHA = {
  nama: 'Steak Hook Premium',
  tagline: 'Segar, lengkap, terpercaya',
  alamat: 'Jl. Pasar Baru No. 18, Cikarang Utara, Bekasi',
  telepon: '0812-8800-1188',
  npwp: '-',
};

export const produkAwal: Produk[] = [
  { id: 'p1', sku: 'SP-001', nama: 'Daging Sapi Has Dalam', kategori: 'sapi', potongan: 'Has dalam (tenderloin)', tipe: 'timbang', satuan: 'kg', hpp: 120000, hargaJual: 160000, stok: 2.5, stokMinimum: 5, aktif: true },
  { id: 'p2', sku: 'SP-002', nama: 'Daging Sapi Iga', kategori: 'sapi', potongan: 'Iga (short rib)', tipe: 'timbang', satuan: 'kg', hpp: 85000, hargaJual: 110000, stok: 3.0, stokMinimum: 5, aktif: true },
  { id: 'p3', sku: 'SP-003', nama: 'Daging Sapi Paha', kategori: 'sapi', potongan: 'Paha belakang (topside)', tipe: 'timbang', satuan: 'kg', hpp: 105000, hargaJual: 140000, stok: 18.4, stokMinimum: 8, aktif: true },
  { id: 'p4', sku: 'SP-004', nama: 'Daging Sapi Giling', kategori: 'sapi', potongan: 'Giling', tipe: 'timbang', satuan: 'kg', hpp: 95000, hargaJual: 125000, stok: 9.6, stokMinimum: 5, aktif: true },
  { id: 'p5', sku: 'AY-001', nama: 'Daging Ayam Fillet', kategori: 'ayam', potongan: 'Dada fillet', tipe: 'timbang', satuan: 'kg', hpp: 52000, hargaJual: 70000, stok: 4.2, stokMinimum: 6, aktif: true },
  { id: 'p6', sku: 'AY-002', nama: 'Daging Ayam Utuh', kategori: 'ayam', potongan: 'Utuh (karkas)', tipe: 'timbang', satuan: 'kg', hpp: 30000, hargaJual: 38000, stok: 22.5, stokMinimum: 10, aktif: true },
  { id: 'p7', sku: 'KB-001', nama: 'Daging Kambing', kategori: 'kambing', potongan: 'Campur (paha & bahu)', tipe: 'timbang', satuan: 'kg', hpp: 115000, hargaJual: 150000, stok: 7.8, stokMinimum: 4, aktif: true },
  { id: 'p8', sku: 'KM-001', nama: 'Bakso Sapi Kemasan 500 g', kategori: 'kemasan', potongan: '-', tipe: 'kemasan', satuan: 'pcs', hpp: 32000, hargaJual: 45000, stok: 24, stokMinimum: 10, aktif: true },
  { id: 'p9', sku: 'KM-002', nama: 'Sosis Sapi Kemasan 500 g', kategori: 'kemasan', potongan: '-', tipe: 'kemasan', satuan: 'pcs', hpp: 24000, hargaJual: 35000, stok: 6, stokMinimum: 10, aktif: true },
  { id: 'p10', sku: 'SP-005', nama: 'Daging Sapi Sengkel', kategori: 'sapi', potongan: 'Sengkel (shank)', tipe: 'timbang', satuan: 'kg', hpp: 100000, hargaJual: 132000, stok: 0, stokMinimum: 3, aktif: false, keterangan: 'Sementara tidak dijual' },
];

export const pelangganAwal: Pelanggan[] = [
  { id: 'c0', nama: 'Pelanggan Umum', telepon: '-', alamat: '-', jenis: 'eceran' },
  { id: 'c1', nama: 'Restoran Sari Rasa', telepon: '0813-2210-4455', alamat: 'Jl. Kalimalang No. 21, Cikarang Barat', jenis: 'partai' },
  { id: 'c2', nama: 'Catering Sejahtera', telepon: '0821-7788-1020', alamat: 'Perum Graha Asri Blok C5, Cikarang Timur', jenis: 'partai' },
  { id: 'c3', nama: 'Hotel Nusantara', telepon: '021-8990-3311', alamat: 'Jl. Jababeka Raya Kav. 7, Cikarang', jenis: 'partai' },
  { id: 'c4', nama: 'Katering Sehat', telepon: '0857-1122-9080', alamat: 'Ruko Lippo Cikarang Blok B/12', jenis: 'partai' },
  { id: 'c5', nama: 'Ibu Ratna (Arisan RT 04)', telepon: '0812-9001-2233', alamat: 'Kp. Sukamaju RT 04/02, Cikarang Utara', jenis: 'partai' },
  { id: 'c6', nama: 'Warung Makan Pak Joko', telepon: '0896-3344-5566', alamat: 'Jl. Raya Industri No. 3', jenis: 'partai' },
  { id: 'c7', nama: 'Warung Bu Tini', telepon: '0838-4455-6677', alamat: 'Pasar Baru Los B-14', jenis: 'eceran' },
  { id: 'c8', nama: 'Ibu Sari Wulandari', telepon: '0812-3456-7890', alamat: 'Perum Taman Sentosa Blok F2/9', jenis: 'eceran' },
  { id: 'c9', nama: 'Bapak Hendra', telepon: '0819-8765-4321', alamat: 'Cikarang Baru, Jl. Anggrek 5', jenis: 'eceran' },
];

export const supplierAwal: Supplier[] = [
  { id: 's1', nama: 'CV Sumber Sapi Jaya', kontak: 'Pak Darmawan', telepon: '0812-1100-2200', alamat: 'RPH Cibitung, Bekasi', komoditas: 'Daging sapi' },
  { id: 's2', nama: 'UD Ayam Segar Makmur', kontak: 'Bu Lestari', telepon: '0813-3300-4400', alamat: 'Jl. Raya Setu No. 45, Bekasi', komoditas: 'Daging ayam' },
  { id: 's3', nama: 'PT Olahan Pangan Nusantara', kontak: 'Rizky (Sales)', telepon: '021-2950-1180', alamat: 'Kawasan MM2100, Cibitung', komoditas: 'Produk kemasan' },
  { id: 's4', nama: 'Peternakan Kambing Barokah', kontak: 'H. Usman', telepon: '0852-6600-7700', alamat: 'Desa Sukasari, Karawang', komoditas: 'Daging kambing' },
];

/* ---------- Penjualan eceran: dibangkitkan deterministik (seeded) ---------- */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function buatTransaksiEceran(): TransaksiEceran[] {
  const r = rng(20261012);
  const bobot: [string, number][] = [
    ['p3', 18], ['p4', 16], ['p6', 16], ['p5', 12], ['p1', 6], ['p2', 8], ['p7', 7], ['p8', 10], ['p9', 7],
  ];
  const totalBobot = bobot.reduce((s, b) => s + b[1], 0);
  const pilihProduk = () => {
    let x = r() * totalBobot;
    for (const [id, w] of bobot) { x -= w; if (x <= 0) return id; }
    return 'p3';
  };
  const hasil: TransaksiEceran[] = [];
  const kgPilihan = [0.25, 0.5, 0.5, 0.75, 1, 1, 1, 1.25, 1.5, 2, 2.5, 3];
  let nomor = 0;
  for (let hari = 1; hari <= 12; hari++) {
    const tgl = `2026-10-${String(hari).padStart(2, '0')}`;
    const akhirPekan = [3, 4, 10, 11].includes(hari);
    const n = (hari === 12 ? 12 : 11) + Math.floor(r() * 6) + (akhirPekan ? 5 : 0);
    for (let k = 0; k < n; k++) {
      nomor++;
      // Jam buka 06.00–14.30 (hari ini berhenti di 14.30)
      const menit = 360 + Math.floor((k / n) * 510 + r() * 20);
      const jam = `${String(Math.floor(menit / 60)).padStart(2, '0')}:${String(menit % 60).padStart(2, '0')}:00`;
      const jumlahItem = 1 + Math.floor(r() * 2.4);
      const items = new Map<string, number>();
      for (let i = 0; i < jumlahItem; i++) {
        const pid = pilihProduk();
        const p = produkAwal.find((x) => x.id === pid)!;
        const q = p.satuan === 'kg' ? kgPilihan[Math.floor(r() * kgPilihan.length)] : 1 + Math.floor(r() * 3);
        items.set(pid, (items.get(pid) ?? 0) + q);
      }
      const itemArr = [...items].map(([produkId, qty]) => ({
        produkId, qty, harga: produkAwal.find((p) => p.id === produkId)!.hargaJual,
      }));
      const subtotal = itemArr.reduce((s, i) => s + Math.round(i.qty * i.harga), 0);
      const diskon = subtotal >= 500000 && r() < 0.4 ? Math.round((subtotal * 0.02) / 500) * 500 : 0;
      const total = subtotal - diskon;
      const x = r();
      let pelangganId = 'c0';
      let metode: MetodeBayar = x < 0.5 ? 'tunai' : x < 0.8 ? 'qris' : 'transfer';
      if (x > 0.97) { pelangganId = 'c7'; metode = 'tempo'; }
      else if (r() < 0.12) pelangganId = r() < 0.5 ? 'c8' : 'c9';
      hasil.push({
        id: `TRX-${tgl.replace(/-/g, '')}-${String(k + 1).padStart(3, '0')}`,
        tanggal: `${tgl}T${jam}`,
        pelangganId,
        items: itemArr,
        diskon,
        pembayaran: [{ metode, jumlah: total }],
      });
    }
  }
  return hasil;
}

export const transaksiAwal: TransaksiEceran[] = buatTransaksiEceran();

/* ---------- Pesanan partai (DP 70%) ---------- */
export const pesananAwal: PesananPartai[] = [
  {
    id: 'PP-20261012-02', tanggal: '2026-10-12', pelangganId: 'c5', status: 'draft',
    items: [{ produkId: 'p3', qty: 8, harga: 136000 }, { produkId: 'p6', qty: 15, harga: 36000 }],
    pembayaran: [], jadwalKirim: '2026-10-18', alamatKirim: 'Kp. Sukamaju RT 04/02, Cikarang Utara',
    catatan: 'Menunggu konfirmasi jumlah peserta arisan.',
  },
  {
    id: 'PP-20261012-01', tanggal: '2026-10-12', pelangganId: 'c1', status: 'proses',
    items: [
      { produkId: 'p3', qty: 25, harga: 135000 }, { produkId: 'p2', qty: 12, harga: 105000 },
      { produkId: 'p4', qty: 10, harga: 120000 },
    ],
    pembayaran: [{ id: 'BP-0007', tanggal: '2026-10-12', jenis: 'dp', metode: 'transfer', jumlah: 4_085_000, bukti: 'TF-BCA-121026-0931.jpg' }],
    jadwalKirim: '2026-10-14', alamatKirim: 'Jl. Kalimalang No. 21, Cikarang Barat', catatan: 'Potong dadu 3 cm untuk 10 kg paha.',
  },
  {
    id: 'PP-20261011-02', tanggal: '2026-10-11', pelangganId: 'c2', status: 'menunggu_dp',
    items: [{ produkId: 'p6', qty: 60, harga: 36000 }, { produkId: 'p5', qty: 30, harga: 67000 }, { produkId: 'p8', qty: 20, harga: 42000 }],
    pembayaran: [], jadwalKirim: '2026-10-16', alamatKirim: 'Perum Graha Asri Blok C5, Cikarang Timur',
  },
  {
    id: 'PP-20261011-01', tanggal: '2026-10-11', pelangganId: 'c3', status: 'siap_kirim',
    items: [
      { produkId: 'p1', qty: 20, harga: 155000 }, { produkId: 'p3', qty: 30, harga: 135000 },
      { produkId: 'p7', qty: 15, harga: 145000 },
    ],
    pembayaran: [{ id: 'BP-0006', tanggal: '2026-10-11', jenis: 'dp', metode: 'transfer', jumlah: 6_528_000, bukti: 'TF-MANDIRI-111026.pdf' }],
    jadwalKirim: '2026-10-13', alamatKirim: 'Jl. Jababeka Raya Kav. 7 (pintu belakang dapur)', catatan: 'Kirim sebelum pukul 07.00.',
  },
  {
    id: 'PP-20261008-01', tanggal: '2026-10-08', pelangganId: 'c4', status: 'selesai',
    items: [{ produkId: 'p5', qty: 40, harga: 66000 }, { produkId: 'p4', qty: 15, harga: 120000 }],
    pembayaran: [{ id: 'BP-0004', tanggal: '2026-10-08', jenis: 'dp', metode: 'transfer', jumlah: 3_108_000, bukti: 'TF-BRI-081026.jpg' }],
    jadwalKirim: '2026-10-10', alamatKirim: 'Ruko Lippo Cikarang Blok B/12', catatan: 'Pelunasan jatuh tempo 17 Okt.',
  },
  {
    id: 'PP-20261005-01', tanggal: '2026-10-05', pelangganId: 'c1', status: 'selesai',
    items: [{ produkId: 'p3', qty: 20, harga: 135000 }, { produkId: 'p2', qty: 10, harga: 105000 }],
    pembayaran: [
      { id: 'BP-0002', tanggal: '2026-10-05', jenis: 'dp', metode: 'transfer', jumlah: 2_625_000, bukti: 'TF-BCA-051026.jpg' },
      { id: 'BP-0003', tanggal: '2026-10-07', jenis: 'pelunasan', metode: 'tunai', jumlah: 1_125_000 },
    ],
    jadwalKirim: '2026-10-07', alamatKirim: 'Jl. Kalimalang No. 21, Cikarang Barat',
  },
  {
    id: 'PP-20261003-01', tanggal: '2026-10-03', pelangganId: 'c6', status: 'batal',
    items: [{ produkId: 'p6', qty: 40, harga: 36000 }],
    pembayaran: [], jadwalKirim: '2026-10-06', alamatKirim: 'Jl. Raya Industri No. 3', catatan: 'Dibatalkan pelanggan sebelum DP.',
  },
];

/* ---------- Pembelian dari supplier ---------- */
export const pembelianAwal: Pembelian[] = [
  {
    id: 'PB-20261001-01', tanggal: '2026-10-01', supplierId: 's1', statusPenerimaan: 'diterima',
    items: [
      { produkId: 'p3', qtyPesan: 40, qtyTerima: 39.4, harga: 105000 },
      { produkId: 'p4', qtyPesan: 15, qtyTerima: 15, harga: 95000 },
    ],
    biayaTambahan: 150000, keteranganBiaya: 'Ongkir & es',
    pembayaran: [{ id: 'BS-001', tanggal: '2026-10-01', jenis: 'lunas', jumlah: 5_712_000 }],
  },
  {
    id: 'PB-20261002-01', tanggal: '2026-10-02', supplierId: 's2', statusPenerimaan: 'diterima',
    items: [
      { produkId: 'p5', qtyPesan: 30, qtyTerima: 30, harga: 52000 },
      { produkId: 'p6', qtyPesan: 50, qtyTerima: 49.2, harga: 30000 },
    ],
    biayaTambahan: 0,
    pembayaran: [{ id: 'BS-002', tanggal: '2026-10-02', jenis: 'lunas', jumlah: 3_036_000 }],
  },
  {
    id: 'PB-20261003-01', tanggal: '2026-10-03', supplierId: 's3', statusPenerimaan: 'diterima',
    items: [
      { produkId: 'p8', qtyPesan: 48, qtyTerima: 48, harga: 32000 },
      { produkId: 'p9', qtyPesan: 36, qtyTerima: 36, harga: 24000 },
    ],
    biayaTambahan: 0,
    pembayaran: [{ id: 'BS-003', tanggal: '2026-10-03', jenis: 'lunas', jumlah: 2_400_000 }],
  },
  {
    id: 'PB-20261006-01', tanggal: '2026-10-06', supplierId: 's1', statusPenerimaan: 'diterima',
    items: [
      { produkId: 'p3', qtyPesan: 60, qtyTerima: 59.2, harga: 105000 },
      { produkId: 'p1', qtyPesan: 25, qtyTerima: 25, harga: 120000 },
      { produkId: 'p2', qtyPesan: 25, qtyTerima: 24.6, harga: 85000 },
    ],
    biayaTambahan: 200000, keteranganBiaya: 'Ongkir',
    pembayaran: [
      { id: 'BS-004', tanggal: '2026-10-05', jenis: 'dp', jumlah: 5_000_000 },
      { id: 'BS-005', tanggal: '2026-10-09', jenis: 'pelunasan', jumlah: 5_000_000 },
    ],
  },
  {
    id: 'PB-20261007-01', tanggal: '2026-10-07', supplierId: 's2', statusPenerimaan: 'diterima',
    items: [
      { produkId: 'p5', qtyPesan: 50, qtyTerima: 50, harga: 52000 },
      { produkId: 'p6', qtyPesan: 90, qtyTerima: 88.5, harga: 30000 },
    ],
    biayaTambahan: 100000, keteranganBiaya: 'Ongkir',
    pembayaran: [{ id: 'BS-006', tanggal: '2026-10-07', jenis: 'lunas', jumlah: 5_355_000 }],
  },
  {
    id: 'PB-20261010-01', tanggal: '2026-10-10', supplierId: 's1', statusPenerimaan: 'diterima',
    items: [
      { produkId: 'p3', qtyPesan: 70, qtyTerima: 69, harga: 105000 },
      { produkId: 'p4', qtyPesan: 25, qtyTerima: 25, harga: 95000 },
    ],
    biayaTambahan: 200000, keteranganBiaya: 'Ongkir',
    pembayaran: [{ id: 'BS-007', tanggal: '2026-10-10', jenis: 'dp', jumlah: 4_000_000 }],
  },
  {
    id: 'PB-20261011-01', tanggal: '2026-10-11', supplierId: 's4', statusPenerimaan: 'diterima',
    items: [{ produkId: 'p7', qtyPesan: 25, qtyTerima: 24.5, harga: 115000 }],
    biayaTambahan: 75000, keteranganBiaya: 'Ongkir',
    pembayaran: [{ id: 'BS-008', tanggal: '2026-10-11', jenis: 'lunas', jumlah: 2_892_500 }],
  },
  {
    id: 'PB-20261012-01', tanggal: '2026-10-12', supplierId: 's1', statusPenerimaan: 'dipesan',
    items: [
      { produkId: 'p1', qtyPesan: 25, qtyTerima: 0, harga: 120000 },
      { produkId: 'p2', qtyPesan: 20, qtyTerima: 0, harga: 85000 },
    ],
    biayaTambahan: 150000, keteranganBiaya: 'Ongkir',
    pembayaran: [{ id: 'BS-009', tanggal: '2026-10-12', jenis: 'dp', jumlah: 1_500_000 }],
  },
];

/* ---------- Modal & pengeluaran ---------- */
export const modalAwal: MutasiModal[] = [
  { id: 'MD-001', tanggal: '2026-10-01', jenis: 'awal', keterangan: 'Modal awal pemilik', jumlah: 7_000_000 },
  { id: 'MD-002', tanggal: '2026-10-05', jenis: 'tambahan', keterangan: 'Setoran modal tambahan untuk stok', jumlah: 5_000_000 },
  { id: 'MD-003', tanggal: '2026-10-10', jenis: 'penarikan', keterangan: 'Penarikan pemilik (prive)', jumlah: 1_000_000 },
];

export const pengeluaranAwal: Pengeluaran[] = [
  { id: 'EX-001', tanggal: '2026-10-01', kategori: 'Sewa', keterangan: 'Sewa los pasar Oktober', jumlah: 1_500_000 },
  { id: 'EX-002', tanggal: '2026-10-01', kategori: 'Kemasan', keterangan: 'Plastik vakum & kantong', jumlah: 285_000 },
  { id: 'EX-003', tanggal: '2026-10-03', kategori: 'Listrik & Air', keterangan: 'Token listrik freezer', jumlah: 300_000 },
  { id: 'EX-004', tanggal: '2026-10-05', kategori: 'Gaji', keterangan: 'Upah mingguan karyawan potong', jumlah: 700_000 },
  { id: 'EX-005', tanggal: '2026-10-07', kategori: 'Transportasi', keterangan: 'BBM pengiriman pesanan', jumlah: 150_000 },
  { id: 'EX-006', tanggal: '2026-10-08', kategori: 'Lain-lain', keterangan: 'Es balok & garam', jumlah: 120_000 },
  { id: 'EX-007', tanggal: '2026-10-10', kategori: 'Transportasi', keterangan: 'BBM pengiriman pesanan', jumlah: 120_000 },
  { id: 'EX-008', tanggal: '2026-10-12', kategori: 'Gaji', keterangan: 'Upah mingguan karyawan potong', jumlah: 700_000 },
];

/* ---------- Mutasi & batch stok (contoh) ---------- */
export const mutasiStokAwal: MutasiStok[] = [
  { id: 'MS-031', tanggal: '2026-10-12T13:50:00', produkId: 'p5', jenis: 'terjual', qty: -1.5, referensi: 'Penjualan kasir' },
  { id: 'MS-030', tanggal: '2026-10-12T12:10:00', produkId: 'p9', jenis: 'rusak', qty: -2, referensi: 'ADJ-012', catatan: 'Kemasan bocor' },
  { id: 'MS-029', tanggal: '2026-10-12T09:15:00', produkId: 'p3', jenis: 'terjual', qty: -25, referensi: 'PP-20261012-01', catatan: 'Disiapkan untuk pesanan partai' },
  { id: 'MS-028', tanggal: '2026-10-12T07:30:00', produkId: 'p1', jenis: 'susut', qty: -0.35, referensi: 'ADJ-011', catatan: 'Susut trimming lemak' },
  { id: 'MS-027', tanggal: '2026-10-11T16:20:00', produkId: 'p7', jenis: 'masuk', qty: 24.5, referensi: 'PB-20261011-01' },
  { id: 'MS-026', tanggal: '2026-10-11T15:00:00', produkId: 'p6', jenis: 'koreksi', qty: -0.8, referensi: 'OPN-010', catatan: 'Selisih stock opname' },
  { id: 'MS-025', tanggal: '2026-10-10T08:05:00', produkId: 'p3', jenis: 'masuk', qty: 69, referensi: 'PB-20261010-01' },
  { id: 'MS-024', tanggal: '2026-10-10T08:05:00', produkId: 'p4', jenis: 'masuk', qty: 25, referensi: 'PB-20261010-01' },
  { id: 'MS-023', tanggal: '2026-10-09T17:40:00', produkId: 'p2', jenis: 'susut', qty: -0.4, referensi: 'ADJ-010', catatan: 'Susut berat (drip loss)' },
  { id: 'MS-022', tanggal: '2026-10-09T10:00:00', produkId: 'p5', jenis: 'rusak', qty: -1.2, referensi: 'ADJ-009', catatan: 'Freezer mati 2 jam' },
  { id: 'MS-021', tanggal: '2026-10-07T07:45:00', produkId: 'p6', jenis: 'masuk', qty: 88.5, referensi: 'PB-20261007-01' },
  { id: 'MS-020', tanggal: '2026-10-07T07:45:00', produkId: 'p5', jenis: 'masuk', qty: 50, referensi: 'PB-20261007-01' },
];

export const batchAwal: BatchStok[] = [
  { id: 'B-2610-11A', produkId: 'p7', tanggalMasuk: '2026-10-11', kedaluwarsa: '2026-10-14', qtyAwal: 24.5, qtySisa: 7.8, sumber: 'PB-20261011-01' },
  { id: 'B-2610-10A', produkId: 'p3', tanggalMasuk: '2026-10-10', kedaluwarsa: '2026-10-13', qtyAwal: 69, qtySisa: 18.4, sumber: 'PB-20261010-01' },
  { id: 'B-2610-10B', produkId: 'p4', tanggalMasuk: '2026-10-10', kedaluwarsa: '2026-10-12', qtyAwal: 25, qtySisa: 9.6, sumber: 'PB-20261010-01' },
  { id: 'B-2610-07A', produkId: 'p6', tanggalMasuk: '2026-10-07', kedaluwarsa: '2026-10-13', qtyAwal: 88.5, qtySisa: 22.5, sumber: 'PB-20261007-01 (beku)' },
  { id: 'B-2610-07B', produkId: 'p5', tanggalMasuk: '2026-10-07', kedaluwarsa: '2026-10-13', qtyAwal: 50, qtySisa: 4.2, sumber: 'PB-20261007-01 (beku)' },
  { id: 'B-2610-06A', produkId: 'p1', tanggalMasuk: '2026-10-06', kedaluwarsa: '2026-10-15', qtyAwal: 25, qtySisa: 2.5, sumber: 'PB-20261006-01 (beku)' },
  { id: 'B-2610-06B', produkId: 'p2', tanggalMasuk: '2026-10-06', kedaluwarsa: '2026-10-15', qtyAwal: 24.6, qtySisa: 3.0, sumber: 'PB-20261006-01 (beku)' },
  { id: 'B-2610-03A', produkId: 'p8', tanggalMasuk: '2026-10-03', kedaluwarsa: '2027-01-03', qtyAwal: 48, qtySisa: 24, sumber: 'PB-20261003-01' },
  { id: 'B-2610-03B', produkId: 'p9', tanggalMasuk: '2026-10-03', kedaluwarsa: '2026-12-20', qtyAwal: 36, qtySisa: 6, sumber: 'PB-20261003-01' },
];

export const notifikasiAwal: Notifikasi[] = [
  { id: 'n1', judul: 'Stok menipis', isi: 'Daging Sapi Has Dalam tersisa 2,5 kg (minimum 5 kg).', waktu: '2026-10-12T14:05:00', jenis: 'stok', dibaca: false },
  { id: 'n2', judul: 'DP belum masuk', isi: 'PP-20261011-02 Catering Sejahtera menunggu DP 70%.', waktu: '2026-10-12T10:00:00', jenis: 'pesanan', dibaca: false },
  { id: 'n3', judul: 'Kirim besok pagi', isi: 'PP-20261011-01 Hotel Nusantara dijadwalkan 13 Okt.', waktu: '2026-10-12T08:30:00', jenis: 'pesanan', dibaca: false },
  { id: 'n4', judul: 'Utang supplier', isi: 'Sisa tagihan CV Sumber Sapi Jaya untuk PB-20261010-01.', waktu: '2026-10-11T17:00:00', jenis: 'bayar', dibaca: true },
];
