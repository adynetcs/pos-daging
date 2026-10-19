# Skema Database POS Daging (Google Sheets)

Versi skema: 1.1.0 Dibuat otomatis oleh `gas/Setup.gs`; jangan ubah header kolom secara manual.

## Prinsip

- Relasi antar-tab memakai **ID**, tidak pernah nama.
- Data transaksi **tidak dihapus**. Pembatalan memakai kolom status dan baris pembalik (mutasi stok atau kas baru), sehingga riwayat tetap bisa ditelusuri.
- **Stok** hanya berasal dari tab Mutasi_Stok (jumlah qty per produk). Tidak ada kolom stok yang bisa berbeda dengan riwayatnya.
- **Buku kas** (Kas_Mutasi) berisi tepat satu baris per pembayaran, modal, atau pengeluaran. Kombinasi ref_tipe + ref_id unik agar uang tidak terhitung dua kali.
- Harga dan HPP disalin ke detail transaksi saat transaksi terjadi, sehingga laporan lama tidak berubah saat harga master diubah.
- Uang disimpan sebagai rupiah bulat. Berat disimpan dalam kg dengan 3 desimal (presisi gram).
- Waktu memakai zona Asia/Jakarta, format yyyy-mm-dd hh:mm:ss.
- Penulisan data hanya lewat API (Apps Script), bukan diketik langsung di sheet, kecuali master data awal oleh pemilik.

## Alur data utama

| Kejadian | Tab yang ditulis |
|---|---|
| Penjualan kasir | Penjualan, Detail_Penjualan, Mutasi_Stok (terjual, −), Pembayaran (masuk), Kas_Mutasi |
| Penjualan tempo | Sama, tanpa Pembayaran dan Kas_Mutasi → otomatis jadi piutang |
| Pesanan partai dibuat | Pesanan, Detail_Pesanan |
| DP / pelunasan pesanan | Pembayaran (masuk), Kas_Mutasi |
| Pesanan selesai (dikirim) | Pesanan.status = selesai, Mutasi_Stok (terjual, −). Omzet diakui di sini |
| Pembelian ke supplier | Pembelian, Detail_Pembelian |
| DP / bayar supplier | Pembayaran (keluar), Kas_Mutasi |
| Barang diterima | Detail_Pembelian.qty_terima, Batch_Stok, Mutasi_Stok (masuk, +) |
| Rusak / susut / koreksi | Mutasi_Stok |
| Modal masuk / penarikan | Modal, Kas_Mutasi |
| Pengeluaran operasional | Pengeluaran, Kas_Mutasi |
| Pembatalan | status = batal pada dokumen, plus baris pembalik di Mutasi_Stok / Kas_Mutasi |

## Tab dan kolom

### Pengguna

Akun yang boleh memakai aplikasi beserta perannya.

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id_pengguna` | id | USR-0001 |
| `nama` | teks | Nama tampilan |
| `email` | teks | Email login (unik) |
| `peran` | pilihan | Hak akses Pilihan: pemilik, admin, kasir. |
| `aktif` | boolean | FALSE = tidak bisa login |
| `dibuat_pada` | waktu |  |
| `pin_hash` | teks | Diisi otomatis lewat menu POS Daging → Atur PIN. Jangan diubah manual. |
| `pin_salt` | teks | Diisi otomatis |
| `gagal_login` | angka | Jumlah salah PIN berturut-turut |
| `terkunci_sampai` | waktu | Kosong = tidak terkunci |

### Pengaturan

Konfigurasi kunci-nilai.

| Kolom | Tipe | Keterangan |
|---|---|---|
| `kunci` | id | Nama pengaturan (unik) |
| `nilai` | teks |  |
| `keterangan` | teks |  |

### Produk

Master produk. Stok TIDAK disimpan di sini; dihitung dari Mutasi_Stok.

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id_produk` | id | PRD-0001 |
| `sku` | teks | Kode toko, unik |
| `nama` | teks |  |
| `kategori` | pilihan |  Pilihan: sapi, ayam, kambing, kemasan, lainnya. |
| `potongan` | teks | Jenis potongan, mis. has dalam |
| `tipe` | pilihan | timbang = per berat Pilihan: timbang, kemasan. |
| `satuan` | pilihan |  Pilihan: kg, pcs. |
| `hpp` | uang | HPP standar per satuan (Rp) |
| `harga_jual` | uang | Harga jual per satuan (Rp) |
| `stok_minimum` | qty | Batas peringatan stok |
| `aktif` | boolean | Tampil di kasir |
| `keterangan` | teks |  |
| `dibuat_pada` | waktu |  |
| `diubah_pada` | waktu |  |

### Supplier

Pemasok.

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id_supplier` | id | SUP-0001 |
| `nama` | teks |  |
| `kontak` | teks | Nama orang yang dihubungi |
| `telepon` | teks | Disimpan sebagai teks agar angka 0 tidak hilang |
| `alamat` | teks |  |
| `komoditas` | teks |  |
| `aktif` | boolean |  |
| `dibuat_pada` | waktu |  |

### Pelanggan

Pelanggan eceran dan partai. PLG-0000 = Pelanggan Umum.

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id_pelanggan` | id | PLG-0001 |
| `nama` | teks |  |
| `telepon` | teks |  |
| `alamat` | teks |  |
| `jenis` | pilihan |  Pilihan: eceran, partai. |
| `aktif` | boolean |  |
| `dibuat_pada` | waktu |  |

### Pembelian

Header pembelian ke supplier.

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id_pembelian` | id | PB-YYYYMMDD-NN |
| `tanggal` | tanggal |  |
| `id_supplier` | ref | → Supplier |
| `status_penerimaan` | pilihan |  Pilihan: dipesan, sebagian, diterima, batal. |
| `biaya_tambahan` | uang | Ongkir, es; menambah nilai persediaan |
| `ket_biaya` | teks |  |
| `catatan` | teks |  |
| `dibuat_pada` | waktu |  |
| `dibuat_oleh` | ref | → Pengguna |

### Detail_Pembelian

Item pembelian. Selisih qty_pesan dan qty_terima = susut saat terima.

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id_detail` | id | DPB-000001 |
| `id_pembelian` | ref | → Pembelian |
| `id_produk` | ref | → Produk |
| `qty_pesan` | qty |  |
| `qty_terima` | qty | 0 sampai barang diterima |
| `harga_beli` | uang | Per satuan |

### Batch_Stok

Satu batch per penerimaan barang per produk. Sisa batch dihitung dari Mutasi_Stok.

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id_batch` | id | BAT-000001 |
| `id_produk` | ref | → Produk |
| `id_pembelian` | ref | → Pembelian (boleh kosong untuk stok awal) |
| `tanggal_masuk` | tanggal |  |
| `kedaluwarsa` | tanggal | Boleh kosong |
| `qty_awal` | qty |  |
| `hpp_satuan` | uang | Termasuk alokasi biaya tambahan |
| `catatan` | teks |  |

### Mutasi_Stok

SATU-SATUNYA sumber stok. qty positif = bertambah, negatif = berkurang. Tidak pernah dihapus; koreksi dengan baris baru.

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id_mutasi` | id | MS-00000001 |
| `waktu` | waktu |  |
| `id_produk` | ref | → Produk |
| `id_batch` | ref | → Batch_Stok (boleh kosong) |
| `jenis` | pilihan |  Pilihan: masuk, terjual, rusak, susut, retur, koreksi, batal. |
| `qty` | qty | + masuk / − keluar |
| `nilai_hpp` | uang | qty × HPP, untuk laporan |
| `ref_tipe` | pilihan |  Pilihan: pembelian, penjualan, pesanan, penyesuaian, stok_awal. |
| `ref_id` | ref | ID dokumen sumber |
| `catatan` | teks |  |
| `dibuat_oleh` | ref | → Pengguna |

### Penjualan

Transaksi kasir eceran. Batal = status batal + mutasi balik, bukan hapus baris.

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id_penjualan` | id | TRX-YYYYMMDD-NNN |
| `waktu` | waktu |  |
| `id_pelanggan` | ref | → Pelanggan |
| `subtotal` | uang |  |
| `diskon` | uang |  |
| `total` | uang | subtotal − diskon |
| `status` | pilihan |  Pilihan: selesai, batal. |
| `id_kasir` | ref | → Pengguna |
| `id_permintaan` | teks | Kunci anti-duplikat dari aplikasi (unik) |
| `catatan` | teks |  |
| `dibatalkan_pada` | waktu |  |
| `alasan_batal` | teks |  |

### Detail_Penjualan

Item penjualan. Harga & HPP disalin saat transaksi (tidak ikut berubah bila master berubah).

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id_detail` | id | DPJ-000001 |
| `id_penjualan` | ref | → Penjualan |
| `id_produk` | ref | → Produk |
| `qty` | qty | kg (3 desimal) atau pcs |
| `harga` | uang | Per satuan |
| `hpp_satuan` | uang |  |
| `subtotal` | uang | round(qty × harga) |

### Pesanan

Pesanan partai. Omzet diakui saat status selesai.

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id_pesanan` | id | PP-YYYYMMDD-NN |
| `tanggal` | tanggal |  |
| `id_pelanggan` | ref | → Pelanggan |
| `jadwal_kirim` | tanggal |  |
| `alamat_kirim` | teks |  |
| `dp_persen` | angka | Disalin dari Pengaturan saat dibuat (mis. 70) |
| `status` | pilihan |  Pilihan: draft, menunggu_dp, proses, siap_kirim, selesai, batal. |
| `catatan` | teks |  |
| `selesai_pada` | waktu |  |
| `dibuat_pada` | waktu |  |
| `dibuat_oleh` | ref | → Pengguna |

### Detail_Pesanan

Item pesanan partai.

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id_detail` | id | DPP-000001 |
| `id_pesanan` | ref | → Pesanan |
| `id_produk` | ref | → Produk |
| `qty` | qty |  |
| `harga` | uang | Harga partai per satuan |
| `hpp_satuan` | uang |  |

### Pembayaran

Semua uang dari pelanggan dan ke supplier. Penjualan tempo = belum ada baris pembayaran (jadi piutang).

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id_pembayaran` | id | BYR-00000001 |
| `waktu` | waktu |  |
| `arah` | pilihan | masuk = dari pelanggan, keluar = ke supplier Pilihan: masuk, keluar. |
| `ref_tipe` | pilihan |  Pilihan: penjualan, pesanan, pembelian. |
| `ref_id` | ref | ID dokumen |
| `jenis` | pilihan |  Pilihan: lunas, dp, cicilan, pelunasan, refund. |
| `metode` | pilihan |  Pilihan: tunai, transfer, qris. |
| `jumlah` | uang | Selalu positif |
| `bukti_url` | teks | Link file bukti (opsional) |
| `status` | pilihan | batal = dianulir, baris tetap ada Pilihan: sah, batal. |
| `dibuat_oleh` | ref | → Pengguna |

### Modal

Uang pemilik. Bukan omzet, penarikan bukan beban.

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id_modal` | id | MOD-0001 |
| `tanggal` | tanggal |  |
| `jenis` | pilihan |  Pilihan: awal, tambahan, penarikan. |
| `jumlah` | uang | Selalu positif |
| `keterangan` | teks |  |
| `status` | pilihan |  Pilihan: sah, batal. |
| `dibuat_oleh` | ref | → Pengguna |

### Pengeluaran

Beban operasional. Pembelian stok TIDAK dicatat di sini.

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id_pengeluaran` | id | EXP-0001 |
| `tanggal` | tanggal |  |
| `kategori` | pilihan |  Pilihan: Sewa, Listrik & Air, Gaji, Kemasan, Transportasi, Lain-lain. |
| `keterangan` | teks |  |
| `jumlah` | uang |  |
| `metode` | pilihan |  Pilihan: tunai, transfer, qris. |
| `bukti_url` | teks |  |
| `status` | pilihan |  Pilihan: sah, batal. |
| `dibuat_oleh` | ref | → Pengguna |

### Kas_Mutasi

Buku kas. Tepat satu baris per Pembayaran/Modal/Pengeluaran (ref unik) agar tidak terhitung ganda.

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id_kas` | id | KAS-00000001 |
| `waktu` | waktu |  |
| `arah` | pilihan |  Pilihan: masuk, keluar. |
| `jumlah` | uang | Selalu positif |
| `sumber` | pilihan |  Pilihan: modal, penarikan_modal, penjualan, dp_pelanggan, pelunasan_pelanggan, refund_pelanggan, dp_supplier, bayar_supplier, pengeluaran, koreksi. |
| `ref_tipe` | pilihan |  Pilihan: pembayaran, modal, pengeluaran, koreksi. |
| `ref_id` | ref | ID baris sumber (unik bersama ref_tipe) |
| `metode` | pilihan |  Pilihan: tunai, transfer, qris. |
| `keterangan` | teks |  |

### Log_Aktivitas

Jejak audit setiap perubahan data.

| Kolom | Tipe | Keterangan |
|---|---|---|
| `waktu` | waktu |  |
| `id_pengguna` | ref | → Pengguna |
| `aksi` | teks | mis. penjualan.simpan |
| `entitas` | teks | Nama tab |
| `id_entitas` | teks |  |
| `ringkasan` | teks |  |
| `id_permintaan` | teks |  |

## Pengaturan awal

| Kunci | Nilai | Keterangan |
|---|---|---|
| skema_versi | 1.0.0 | Versi struktur database |
| nama_usaha | Steak Hook Premium | Tampil di struk |
| zona_waktu | Asia/Jakarta |  |
| dp_persen | 70 | Target DP pesanan partai (%) |
| modal_awal_rencana | 7000000 | Nilai rencana saja, BUKAN transaksi. Catat modal asli lewat aplikasi. |
| format_no_penjualan | TRX-{YYYYMMDD}-{NNN} |  |
| format_no_pesanan | PP-{YYYYMMDD}-{NN} |  |
| format_no_pembelian | PB-{YYYYMMDD}-{NN} |  |

Modal awal Rp7.000.000 hanya disimpan sebagai nilai rencana di Pengaturan. Setup tidak membuat transaksi modal; catat modal asli lewat aplikasi setelah API tersambung.
