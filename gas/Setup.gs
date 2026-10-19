/**
 * POS DAGING — Setup database Google Sheets
 * ------------------------------------------------------------
 * Cara pakai:
 *   1. Buka spreadsheet kosong → Extensions → Apps Script.
 *   2. Tempel seluruh isi file ini, simpan (Ctrl+S).
 *   3. Pilih fungsi `setupDatabase` lalu klik Run.
 *
 * Aman dijalankan berulang: tab yang sudah ada tidak dihapus dan data tidak ditimpa.
 * Script ini TIDAK membuat transaksi contoh. Hanya struktur, validasi, dan pengaturan awal.
 */

/* =========================================================
 * AKUN PEMILIK — ISI DI SINI, LALU RUN setupDatabase
 * ---------------------------------------------------------
 * Setelah muncul "Akun pemilik siap", KOSONGKAN lagi isian pin
 * (jadi '') lalu simpan (Ctrl+S), supaya PIN tidak tertinggal di kode.
 * PIN di spreadsheet tetap tersimpan dalam bentuk hash.
 * Kosongkan username/pin jika tidak ingin mengubah akun pemilik.
 * ======================================================= */
var AKUN_PEMILIK = {
  nama: 'Ady',      // nama yang tampil di aplikasi
  username: '',     // contoh: 'ady'  (huruf kecil, angka, titik, garis bawah; 3–20 karakter)
  pin: ''           // 6 digit angka, contoh format: '123456' (jangan pakai yang mudah ditebak)
};

/** Versi skema. Naikkan jika kolom berubah. */
var SKEMA_VERSI = '1.2.0';

/**
 * Definisi skema. Setiap kolom: [nama, tipe, keterangan, pilihan?]
 * Tipe: id | teks | angka | uang | qty | tanggal | waktu | boolean | pilihan | ref
 */
var SKEMA = {
  Pengguna: {
    ket: 'Akun yang boleh memakai aplikasi beserta perannya.',
    kolom: [
      ['id_pengguna', 'id', 'USR-0001'],
      ['nama', 'teks', 'Nama tampilan'],
      ['email', 'teks', 'Email (opsional jika username diisi, unik)'],
      ['peran', 'pilihan', 'Hak akses', ['pemilik', 'admin', 'kasir']],
      ['aktif', 'boolean', 'FALSE = tidak bisa login'],
      ['dibuat_pada', 'waktu', ''],
      ['pin_hash', 'teks', 'Diisi otomatis lewat menu POS Daging → Atur PIN. Jangan diubah manual.'],
      ['pin_salt', 'teks', 'Diisi otomatis'],
      ['gagal_login', 'angka', 'Jumlah salah PIN berturut-turut'],
      ['terkunci_sampai', 'waktu', 'Kosong = tidak terkunci'],
      ['username', 'teks', 'Nama login: huruf kecil, angka, titik atau garis bawah, 3–20 karakter (unik)']
    ]
  },
  Pengaturan: {
    ket: 'Konfigurasi kunci-nilai.',
    kolom: [
      ['kunci', 'id', 'Nama pengaturan (unik)'],
      ['nilai', 'teks', ''],
      ['keterangan', 'teks', '']
    ]
  },
  Produk: {
    ket: 'Master produk. Stok TIDAK disimpan di sini; dihitung dari Mutasi_Stok.',
    kolom: [
      ['id_produk', 'id', 'PRD-0001'],
      ['sku', 'teks', 'Kode toko, unik'],
      ['nama', 'teks', ''],
      ['kategori', 'pilihan', '', ['sapi', 'ayam', 'kambing', 'kemasan', 'lainnya']],
      ['potongan', 'teks', 'Jenis potongan, mis. has dalam'],
      ['tipe', 'pilihan', 'timbang = per berat', ['timbang', 'kemasan']],
      ['satuan', 'pilihan', '', ['kg', 'pcs']],
      ['hpp', 'uang', 'HPP standar per satuan (Rp)'],
      ['harga_jual', 'uang', 'Harga jual per satuan (Rp)'],
      ['stok_minimum', 'qty', 'Batas peringatan stok'],
      ['aktif', 'boolean', 'Tampil di kasir'],
      ['keterangan', 'teks', ''],
      ['dibuat_pada', 'waktu', ''],
      ['diubah_pada', 'waktu', '']
    ]
  },
  Supplier: {
    ket: 'Pemasok.',
    kolom: [
      ['id_supplier', 'id', 'SUP-0001'],
      ['nama', 'teks', ''],
      ['kontak', 'teks', 'Nama orang yang dihubungi'],
      ['telepon', 'teks', 'Disimpan sebagai teks agar angka 0 tidak hilang'],
      ['alamat', 'teks', ''],
      ['komoditas', 'teks', ''],
      ['aktif', 'boolean', ''],
      ['dibuat_pada', 'waktu', '']
    ]
  },
  Pelanggan: {
    ket: 'Pelanggan eceran dan partai. PLG-0000 = Pelanggan Umum.',
    kolom: [
      ['id_pelanggan', 'id', 'PLG-0001'],
      ['nama', 'teks', ''],
      ['telepon', 'teks', ''],
      ['alamat', 'teks', ''],
      ['jenis', 'pilihan', '', ['eceran', 'partai']],
      ['aktif', 'boolean', ''],
      ['dibuat_pada', 'waktu', '']
    ]
  },
  Pembelian: {
    ket: 'Header pembelian ke supplier.',
    kolom: [
      ['id_pembelian', 'id', 'PB-YYYYMMDD-NN'],
      ['tanggal', 'tanggal', ''],
      ['id_supplier', 'ref', '→ Supplier'],
      ['status_penerimaan', 'pilihan', '', ['dipesan', 'sebagian', 'diterima', 'batal']],
      ['biaya_tambahan', 'uang', 'Ongkir, es; menambah nilai persediaan'],
      ['ket_biaya', 'teks', ''],
      ['catatan', 'teks', ''],
      ['dibuat_pada', 'waktu', ''],
      ['dibuat_oleh', 'ref', '→ Pengguna']
    ]
  },
  Detail_Pembelian: {
    ket: 'Item pembelian. Selisih qty_pesan dan qty_terima = susut saat terima.',
    kolom: [
      ['id_detail', 'id', 'DPB-000001'],
      ['id_pembelian', 'ref', '→ Pembelian'],
      ['id_produk', 'ref', '→ Produk'],
      ['qty_pesan', 'qty', ''],
      ['qty_terima', 'qty', '0 sampai barang diterima'],
      ['harga_beli', 'uang', 'Per satuan']
    ]
  },
  Batch_Stok: {
    ket: 'Satu batch per penerimaan barang per produk. Sisa batch dihitung dari Mutasi_Stok.',
    kolom: [
      ['id_batch', 'id', 'BAT-000001'],
      ['id_produk', 'ref', '→ Produk'],
      ['id_pembelian', 'ref', '→ Pembelian (boleh kosong untuk stok awal)'],
      ['tanggal_masuk', 'tanggal', ''],
      ['kedaluwarsa', 'tanggal', 'Boleh kosong'],
      ['qty_awal', 'qty', ''],
      ['hpp_satuan', 'uang', 'Termasuk alokasi biaya tambahan'],
      ['catatan', 'teks', '']
    ]
  },
  Mutasi_Stok: {
    ket: 'SATU-SATUNYA sumber stok. qty positif = bertambah, negatif = berkurang. Tidak pernah dihapus; koreksi dengan baris baru.',
    kolom: [
      ['id_mutasi', 'id', 'MS-00000001'],
      ['waktu', 'waktu', ''],
      ['id_produk', 'ref', '→ Produk'],
      ['id_batch', 'ref', '→ Batch_Stok (boleh kosong)'],
      ['jenis', 'pilihan', '', ['masuk', 'terjual', 'rusak', 'susut', 'retur', 'koreksi', 'batal']],
      ['qty', 'qty', '+ masuk / − keluar'],
      ['nilai_hpp', 'uang', 'qty × HPP, untuk laporan'],
      ['ref_tipe', 'pilihan', '', ['pembelian', 'penjualan', 'pesanan', 'penyesuaian', 'stok_awal']],
      ['ref_id', 'ref', 'ID dokumen sumber'],
      ['catatan', 'teks', ''],
      ['dibuat_oleh', 'ref', '→ Pengguna']
    ]
  },
  Penjualan: {
    ket: 'Transaksi kasir eceran. Batal = status batal + mutasi balik, bukan hapus baris.',
    kolom: [
      ['id_penjualan', 'id', 'TRX-YYYYMMDD-NNN'],
      ['waktu', 'waktu', ''],
      ['id_pelanggan', 'ref', '→ Pelanggan'],
      ['subtotal', 'uang', ''],
      ['diskon', 'uang', ''],
      ['total', 'uang', 'subtotal − diskon'],
      ['status', 'pilihan', '', ['selesai', 'batal']],
      ['id_kasir', 'ref', '→ Pengguna'],
      ['id_permintaan', 'teks', 'Kunci anti-duplikat dari aplikasi (unik)'],
      ['catatan', 'teks', ''],
      ['dibatalkan_pada', 'waktu', ''],
      ['alasan_batal', 'teks', '']
    ]
  },
  Detail_Penjualan: {
    ket: 'Item penjualan. Harga & HPP disalin saat transaksi (tidak ikut berubah bila master berubah).',
    kolom: [
      ['id_detail', 'id', 'DPJ-000001'],
      ['id_penjualan', 'ref', '→ Penjualan'],
      ['id_produk', 'ref', '→ Produk'],
      ['qty', 'qty', 'kg (3 desimal) atau pcs'],
      ['harga', 'uang', 'Per satuan'],
      ['hpp_satuan', 'uang', ''],
      ['subtotal', 'uang', 'round(qty × harga)']
    ]
  },
  Pesanan: {
    ket: 'Pesanan partai. Omzet diakui saat status selesai.',
    kolom: [
      ['id_pesanan', 'id', 'PP-YYYYMMDD-NN'],
      ['tanggal', 'tanggal', ''],
      ['id_pelanggan', 'ref', '→ Pelanggan'],
      ['jadwal_kirim', 'tanggal', ''],
      ['alamat_kirim', 'teks', ''],
      ['dp_persen', 'angka', 'Disalin dari Pengaturan saat dibuat (mis. 70)'],
      ['status', 'pilihan', '', ['draft', 'menunggu_dp', 'proses', 'siap_kirim', 'selesai', 'batal']],
      ['catatan', 'teks', ''],
      ['selesai_pada', 'waktu', ''],
      ['dibuat_pada', 'waktu', ''],
      ['dibuat_oleh', 'ref', '→ Pengguna']
    ]
  },
  Detail_Pesanan: {
    ket: 'Item pesanan partai.',
    kolom: [
      ['id_detail', 'id', 'DPP-000001'],
      ['id_pesanan', 'ref', '→ Pesanan'],
      ['id_produk', 'ref', '→ Produk'],
      ['qty', 'qty', ''],
      ['harga', 'uang', 'Harga partai per satuan'],
      ['hpp_satuan', 'uang', '']
    ]
  },
  Pembayaran: {
    ket: 'Semua uang dari pelanggan dan ke supplier. Penjualan tempo = belum ada baris pembayaran (jadi piutang).',
    kolom: [
      ['id_pembayaran', 'id', 'BYR-00000001'],
      ['waktu', 'waktu', ''],
      ['arah', 'pilihan', 'masuk = dari pelanggan, keluar = ke supplier', ['masuk', 'keluar']],
      ['ref_tipe', 'pilihan', '', ['penjualan', 'pesanan', 'pembelian']],
      ['ref_id', 'ref', 'ID dokumen'],
      ['jenis', 'pilihan', '', ['lunas', 'dp', 'cicilan', 'pelunasan', 'refund']],
      ['metode', 'pilihan', '', ['tunai', 'transfer', 'qris']],
      ['jumlah', 'uang', 'Selalu positif'],
      ['bukti_url', 'teks', 'Link file bukti (opsional)'],
      ['status', 'pilihan', 'batal = dianulir, baris tetap ada', ['sah', 'batal']],
      ['dibuat_oleh', 'ref', '→ Pengguna']
    ]
  },
  Modal: {
    ket: 'Uang pemilik. Bukan omzet, penarikan bukan beban.',
    kolom: [
      ['id_modal', 'id', 'MOD-0001'],
      ['tanggal', 'tanggal', ''],
      ['jenis', 'pilihan', '', ['awal', 'tambahan', 'penarikan']],
      ['jumlah', 'uang', 'Selalu positif'],
      ['keterangan', 'teks', ''],
      ['status', 'pilihan', '', ['sah', 'batal']],
      ['dibuat_oleh', 'ref', '→ Pengguna']
    ]
  },
  Pengeluaran: {
    ket: 'Beban operasional. Pembelian stok TIDAK dicatat di sini.',
    kolom: [
      ['id_pengeluaran', 'id', 'EXP-0001'],
      ['tanggal', 'tanggal', ''],
      ['kategori', 'pilihan', '', ['Sewa', 'Listrik & Air', 'Gaji', 'Kemasan', 'Transportasi', 'Lain-lain']],
      ['keterangan', 'teks', ''],
      ['jumlah', 'uang', ''],
      ['metode', 'pilihan', '', ['tunai', 'transfer', 'qris']],
      ['bukti_url', 'teks', ''],
      ['status', 'pilihan', '', ['sah', 'batal']],
      ['dibuat_oleh', 'ref', '→ Pengguna']
    ]
  },
  Kas_Mutasi: {
    ket: 'Buku kas. Tepat satu baris per Pembayaran/Modal/Pengeluaran (ref unik) agar tidak terhitung ganda.',
    kolom: [
      ['id_kas', 'id', 'KAS-00000001'],
      ['waktu', 'waktu', ''],
      ['arah', 'pilihan', '', ['masuk', 'keluar']],
      ['jumlah', 'uang', 'Selalu positif'],
      ['sumber', 'pilihan', '', ['modal', 'penarikan_modal', 'penjualan', 'dp_pelanggan', 'pelunasan_pelanggan', 'refund_pelanggan', 'dp_supplier', 'bayar_supplier', 'pengeluaran', 'koreksi']],
      ['ref_tipe', 'pilihan', '', ['pembayaran', 'modal', 'pengeluaran', 'koreksi']],
      ['ref_id', 'ref', 'ID baris sumber (unik bersama ref_tipe)'],
      ['metode', 'pilihan', '', ['tunai', 'transfer', 'qris']],
      ['keterangan', 'teks', '']
    ]
  },
  Log_Aktivitas: {
    ket: 'Jejak audit setiap perubahan data.',
    kolom: [
      ['waktu', 'waktu', ''],
      ['id_pengguna', 'ref', '→ Pengguna'],
      ['aksi', 'teks', 'mis. penjualan.simpan'],
      ['entitas', 'teks', 'Nama tab'],
      ['id_entitas', 'teks', ''],
      ['ringkasan', 'teks', ''],
      ['id_permintaan', 'teks', '']
    ]
  }
};

var PENGATURAN_AWAL = [
  ['skema_versi', SKEMA_VERSI, 'Versi struktur database'],
  ['nama_usaha', 'Steak Hook Premium', 'Tampil di struk'],
  ['zona_waktu', 'Asia/Jakarta', ''],
  ['dp_persen', '70', 'Target DP pesanan partai (%)'],
  ['modal_awal_rencana', '7000000', 'Nilai rencana saja, BUKAN transaksi. Catat modal asli lewat aplikasi.'],
  ['format_no_penjualan', 'TRX-{YYYYMMDD}-{NNN}', ''],
  ['format_no_pesanan', 'PP-{YYYYMMDD}-{NN}', ''],
  ['format_no_pembelian', 'PB-{YYYYMMDD}-{NN}', '']
];

var WARNA_HEADER = '#841D28';
var BARIS_VALIDASI = 2000;

function setupDatabase() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setSpreadsheetTimeZone('Asia/Jakarta');
  ss.setSpreadsheetLocale('in_ID');

  var urutan = Object.keys(SKEMA);
  var dibuat = [], dicek = [];

  urutan.forEach(function (nama, idx) {
    var def = SKEMA[nama];
    var sh = ss.getSheetByName(nama);
    if (!sh) { sh = ss.insertSheet(nama, idx); dibuat.push(nama); } else { dicek.push(nama); }
    siapkanTab_(sh, def);
  });

  // Hapus tab bawaan yang kosong
  ['Sheet1', 'Lembar1', 'Sheet 1'].forEach(function (n) {
    var s = ss.getSheetByName(n);
    if (s && s.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(s);
  });

  isiPengaturan_(ss.getSheetByName('Pengaturan'));
  isiPelangganUmum_(ss.getSheetByName('Pelanggan'));
  isiPemilik_(ss.getSheetByName('Pengguna'));
  var infoAkun = siapkanAkunPemilik_();

  ss.setActiveSheet(ss.getSheetByName('Produk'));
  var pesan = 'Selesai.\nTab baru: ' + (dibuat.join(', ') || '-') + '\nTab sudah ada (dicek): ' + (dicek.join(', ') || '-') + '\n\n' + infoAkun;
  Logger.log(pesan);
  try { SpreadsheetApp.getUi().alert('POS Daging', pesan, SpreadsheetApp.getUi().ButtonSet.OK); } catch (e) { /* dijalankan dari editor */ }
}

function siapkanTab_(sh, def) {
  var header = def.kolom.map(function (k) { return k[0]; });
  var n = header.length;

  // Pastikan jumlah kolom cukup
  if (sh.getMaxColumns() < n) sh.insertColumnsAfter(sh.getMaxColumns(), n - sh.getMaxColumns());

  var lama = sh.getLastRow() > 0 ? sh.getRange(1, 1, 1, Math.max(1, sh.getLastColumn())).getValues()[0] : [];
  if (lama.join('') === '') {
    sh.getRange(1, 1, 1, n).setValues([header]);
  } else if (header.slice(0, lama.filter(String).length).join('|') === lama.filter(String).join('|')) {
    // Skema bertambah kolom di akhir: tambahkan header yang belum ada
    var ada = lama.filter(String).length;
    if (ada < n) sh.getRange(1, ada + 1, 1, n - ada).setValues([header.slice(ada)]);
  } else if (lama.slice(0, n).join('|') !== header.join('|')) {
    throw new Error('Header tab "' + sh.getName() + '" berbeda dari skema. Periksa manual sebelum menjalankan ulang.\nAda: ' + lama.join(', ') + '\nSkema: ' + header.join(', '));
  }

  var rh = sh.getRange(1, 1, 1, n);
  rh.setFontWeight('bold').setFontColor('#FFFFFF').setBackground(WARNA_HEADER).setVerticalAlignment('middle');
  rh.setNotes([def.kolom.map(function (k) { return k[2] || ''; })]);
  sh.setFrozenRows(1);
  sh.setRowHeight(1, 28);

  var maks = Math.max(BARIS_VALIDASI, sh.getMaxRows() - 1);
  if (sh.getMaxRows() < maks + 1) sh.insertRowsAfter(sh.getMaxRows(), maks + 1 - sh.getMaxRows());

  def.kolom.forEach(function (k, i) {
    var r = sh.getRange(2, i + 1, maks, 1);
    var tipe = k[1];
    if (tipe === 'id' || tipe === 'ref' || tipe === 'teks') r.setNumberFormat('@');
    if (tipe === 'uang') r.setNumberFormat('#,##0');
    if (tipe === 'qty') r.setNumberFormat('0.###');
    if (tipe === 'angka') r.setNumberFormat('0.##');
    if (tipe === 'tanggal') r.setNumberFormat('yyyy-mm-dd');
    if (tipe === 'waktu') r.setNumberFormat('yyyy-mm-dd hh:mm:ss');
    if (tipe === 'pilihan' && k[3]) {
      r.setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(k[3], true).setAllowInvalid(false).build());
    }
    if (tipe === 'boolean') {
      r.setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['TRUE', 'FALSE'], true).setAllowInvalid(false).build());
    }
    if (tipe === 'uang') {
      r.setDataValidation(SpreadsheetApp.newDataValidation().requireNumberGreaterThanOrEqualTo(0).setAllowInvalid(false).build());
    }
  });

  sh.autoResizeColumns(1, n);

  // Lindungi baris header (peringatan saja, pemilik tetap bisa mengubah)
  var ada = sh.getProtections(SpreadsheetApp.ProtectionType.RANGE).some(function (p) { return p.getDescription() === 'header'; });
  if (!ada) rh.protect().setDescription('header').setWarningOnly(true);
}

function isiPengaturan_(sh) {
  if (sh.getLastRow() > 1) {
    var kunci = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
    for (var i = 0; i < kunci.length; i++) if (kunci[i][0] === 'skema_versi') sh.getRange(i + 2, 2).setValue(SKEMA_VERSI);
  }
  var ada = {};
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().forEach(function (r) { ada[r[0]] = true; });
  var baru = PENGATURAN_AWAL.filter(function (r) { return !ada[r[0]]; });
  if (baru.length) sh.getRange(sh.getLastRow() + 1, 1, baru.length, 3).setValues(baru);
}

function isiPelangganUmum_(sh) {
  var ids = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().map(function (r) { return r[0]; }) : [];
  if (ids.indexOf('PLG-0000') === -1) {
    sh.getRange(sh.getLastRow() + 1, 1, 1, 7).setValues([['PLG-0000', 'Pelanggan Umum', '-', '-', 'eceran', 'TRUE', waktuSekarang_()]]);
  }
}

function isiPemilik_(sh) {
  if (sh.getLastRow() > 1) return;
  var email = Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail();
  sh.getRange(2, 1, 1, 6).setValues([['USR-0001', 'Pemilik', email, 'pemilik', 'TRUE', waktuSekarang_()]]);
}

function waktuSekarang_() {
  return Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss');
}

/** Buat/perbarui akun pemilik (USR-0001) dari isian AKUN_PEMILIK di atas. */
function siapkanAkunPemilik_() {
  var username = String(AKUN_PEMILIK.username || '').trim().toLowerCase();
  var pin = String(AKUN_PEMILIK.pin || '').trim();
  if (!username && !pin) return 'Akun pemilik: tidak diubah (isian AKUN_PEMILIK kosong).';
  if (!/^[a-z0-9._]{3,20}$/.test(username)) throw new Error('AKUN_PEMILIK.username tidak valid. Pakai 3–20 karakter: huruf kecil, angka, titik, garis bawah.');
  if (!/^\d{6}$/.test(pin)) throw new Error('AKUN_PEMILIK.pin harus tepat 6 digit angka.');
  if (/^(\d)\1{5}$/.test(pin) || pin === '123456' || pin === '654321' || pin === '012345') throw new Error('AKUN_PEMILIK.pin terlalu mudah ditebak. Pilih PIN lain.');

  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Pengguna');
  var h = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var data = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, h.length).getValues() : [];
  var iUser = h.indexOf('username'), iId = h.indexOf('id_pengguna');
  data.forEach(function (r) {
    if (String(r[iId]) !== 'USR-0001' && String(r[iUser]).toLowerCase() === username) throw new Error('Username "' + username + '" sudah dipakai pengguna lain.');
  });

  ubah_('Pengguna', 'id_pengguna', 'USR-0001', {
    nama: String(AKUN_PEMILIK.nama || 'Pemilik').trim() || 'Pemilik',
    username: username, peran: 'pemilik', aktif: 'TRUE'
  });
  aturPinInternal_('USR-0001', pin);
  catatLog_('USR-0001', 'pengguna.aturPin', 'Pengguna', 'USR-0001', 'Akun pemilik disiapkan lewat setupDatabase', '');
  return 'Akun pemilik siap. Login dengan username "' + username + '" dan PIN yang Anda isi.\n' +
         'PENTING: kosongkan lagi isian pin di AKUN_PEMILIK lalu simpan (Ctrl+S).';
}
