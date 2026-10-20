/**
 * POS DAGING — API Google Apps Script
 * ------------------------------------------------------------
 * Hanya menerima permintaan dari server Vercel yang membawa API_SECRET.
 * Browser TIDAK pernah memanggil URL ini langsung.
 *
 * Script Properties yang wajib ada (Project Settings → Script properties):
 *   API_SECRET   kunci rahasia yang sama dengan GAS_SECRET di Vercel
 * Dibuat otomatis bila belum ada:
 *   PIN_PEPPER   tambahan rahasia untuk hash PIN
 *
 * Format permintaan (POST, body JSON):
 *   { secret, action, payload, userId?, requestId? }
 * Format jawaban:
 *   { ok: true, data } | { ok: false, error, kode }
 */

var API_VERSI = '2.0.0';
var MAKS_GAGAL_LOGIN = 5;
var MENIT_KUNCI = 15;

/* =========================================================
 * Pintu masuk
 * ======================================================= */

function doGet() {
  // Sengaja tidak membocorkan data apa pun.
  return json_({ ok: true, data: { layanan: 'POS Daging API', versi: API_VERSI, pesan: 'Gunakan POST melalui server aplikasi.' } });
}

function doPost(e) {
  var aksi = '(tidak diketahui)';
  try {
    var body;
    try { body = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (x) { throw galat_('Body bukan JSON yang valid', 'BAD_REQUEST'); }

    var rahasia = PropertiesService.getScriptProperties().getProperty('API_SECRET');
    if (!rahasia) throw galat_('API_SECRET belum diatur di Script Properties', 'CONFIG');
    if (!samaAman_(String(body.secret || ''), rahasia)) throw galat_('Tidak diizinkan', 'AUTH');

    aksi = String(body.action || '');
    var h = HANDLER[aksi];
    if (!h) throw galat_('Aksi tidak dikenal: ' + aksi, 'NOT_FOUND');

    var ctx = { payload: body.payload || {}, requestId: String(body.requestId || ''), user: null };
    if (!h.publik) {
      ctx.user = penggunaAktif_(String(body.userId || ''));
      if (!ctx.user) throw galat_('Sesi tidak valid atau pengguna nonaktif', 'AUTH');
      if (h.peran && h.peran.indexOf(ctx.user.peran) === -1) throw galat_('Peran Anda tidak memiliki akses untuk aksi ini', 'FORBIDDEN');
    }

    var data = h.tulis ? denganKunci_(function () { return h.fn(ctx); }) : h.fn(ctx);
    // Aksi tulis bisa langsung mengembalikan data terbaru agar aplikasi tidak perlu permintaan kedua
    if (h.tulis && ctx.payload && ctx.payload.__segarkan && ctx.user) return json_({ ok: true, data: { hasil: data, semua: aksiSemua_(ctx) } });
    return json_({ ok: true, data: data });
  } catch (err) {
    var kode = err && err.kode ? err.kode : 'ERROR';
    if (kode === 'ERROR') console.error('[' + aksi + '] ' + (err && err.stack ? err.stack : err));
    return json_({ ok: false, error: String(err && err.message ? err.message : err), kode: kode });
  }
}

/* =========================================================
 * Daftar aksi
 * publik: tidak butuh pengguna login (tetap butuh API_SECRET)
 * peran:  daftar peran yang boleh; kosong = semua peran
 * tulis:  dijalankan di bawah kunci agar tidak bentrok
 * ======================================================= */

var SEMUA = ['pemilik', 'admin', 'kasir'];
var PENGELOLA = ['pemilik', 'admin'];

var HANDLER = {
  'health': { publik: true, fn: aksiHealth_ },
  'auth.login': { publik: true, tulis: true, fn: aksiLogin_ },
  'auth.me': { peran: SEMUA, fn: function (ctx) { return profil_(ctx.user); } },

  'data.semua': { peran: SEMUA, fn: aksiSemua_ },
  'data.ringkasan': { peran: PENGELOLA, fn: aksiRingkasan_ },

  'pengguna.list': { peran: ['pemilik'], fn: aksiPenggunaList_ },
  'pengguna.simpan': { peran: ['pemilik'], tulis: true, fn: aksiPenggunaSimpan_ },
  'pengguna.aturPin': { peran: ['pemilik'], tulis: true, fn: aksiPenggunaAturPin_ },
  'pengaturan.simpan': { peran: ['pemilik'], tulis: true, fn: aksiPengaturanSimpan_ },

  'produk.list': { peran: SEMUA, fn: aksiProdukList_ },
  'produk.simpan': { peran: PENGELOLA, tulis: true, fn: aksiProdukSimpan_ },
  'pelanggan.simpan': { peran: SEMUA, tulis: true, fn: aksiPelangganSimpan_ },
  'supplier.simpan': { peran: PENGELOLA, tulis: true, fn: aksiSupplierSimpan_ },

  'penjualan.simpan': { peran: SEMUA, tulis: true, fn: aksiPenjualanSimpan_ },
  'penjualan.bayar': { peran: SEMUA, tulis: true, fn: aksiPenjualanBayar_ },
  'penjualan.batal': { peran: PENGELOLA, tulis: true, fn: aksiPenjualanBatal_ },
  'penjualan.retur': { peran: PENGELOLA, tulis: true, fn: aksiPenjualanRetur_ },

  'pesanan.simpan': { peran: SEMUA, tulis: true, fn: aksiPesananSimpan_ },
  'pesanan.status': { peran: SEMUA, tulis: true, fn: aksiPesananStatus_ },
  'pesanan.bayar': { peran: SEMUA, tulis: true, fn: aksiPesananBayar_ },

  'pembelian.simpan': { peran: PENGELOLA, tulis: true, fn: aksiPembelianSimpan_ },
  'pembelian.terima': { peran: PENGELOLA, tulis: true, fn: aksiPembelianTerima_ },
  'pembelian.bayar': { peran: PENGELOLA, tulis: true, fn: aksiPembelianBayar_ },

  'stok.sesuaikan': { peran: PENGELOLA, tulis: true, fn: aksiStokSesuaikan_ },

  'modal.simpan': { peran: ['pemilik'], tulis: true, fn: aksiModalSimpan_ },
  'pengeluaran.simpan': { peran: ['pemilik'], tulis: true, fn: aksiPengeluaranSimpan_ }
};

/* =========================================================
 * Aksi
 * ======================================================= */

function aksiHealth_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var wajib = Object.keys(SKEMA);
  var hilang = wajib.filter(function (n) { return !ss.getSheetByName(n); });
  return {
    api_versi: API_VERSI,
    skema_versi: SKEMA_VERSI,
    waktu_server: sekarang_(),
    spreadsheet: ss.getName(),
    tab_hilang: hilang,
    pengguna_dengan_pin: baca_('Pengguna').filter(function (u) { return u.pin_hash; }).length
  };
}

function aksiLogin_(ctx) {
  var login = String(ctx.payload.login || ctx.payload.email || '').trim().toLowerCase();
  var pin = String(ctx.payload.pin || '');
  if (!login || !/^\d{6}$/.test(pin)) throw galat_('Username dan PIN 6 digit wajib diisi', 'VALIDASI');

  var u = cariAkun_(login);
  // Pesan sama untuk akun tidak ada / PIN salah agar tidak membocorkan akun yang terdaftar
  var GAGAL = 'Username atau PIN salah';
  if (!u || !bool_(u.aktif) || !u.pin_hash) { catatLog_(null, 'auth.gagal', 'Pengguna', login, 'Login gagal', ctx.requestId); throw galat_(GAGAL, 'AUTH'); }

  if (u.terkunci_sampai && String(u.terkunci_sampai) > sekarang_()) {
    throw galat_('Terlalu banyak percobaan. Coba lagi setelah ' + String(u.terkunci_sampai).slice(11, 16) + ' WIB', 'TERKUNCI');
  }

  if (!samaAman_(hashPin_(pin, u.pin_salt), u.pin_hash)) {
    var gagal = (Number(u.gagal_login) || 0) + 1;
    var patch = { gagal_login: gagal };
    if (gagal >= MAKS_GAGAL_LOGIN) {
      patch.terkunci_sampai = Utilities.formatDate(new Date(Date.now() + MENIT_KUNCI * 60000), 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss');
      patch.gagal_login = 0;
    }
    ubah_('Pengguna', 'id_pengguna', u.id_pengguna, patch);
    catatLog_(u.id_pengguna, 'auth.gagal', 'Pengguna', u.id_pengguna, 'PIN salah (' + gagal + ')', ctx.requestId);
    throw galat_(GAGAL, 'AUTH');
  }

  ubah_('Pengguna', 'id_pengguna', u.id_pengguna, { gagal_login: 0, terkunci_sampai: '' });
  catatLog_(u.id_pengguna, 'auth.login', 'Pengguna', u.id_pengguna, 'Login berhasil', ctx.requestId);
  return profil_(u);
}

function aksiPenggunaList_() {
  return baca_('Pengguna').map(function (u) {
    var p = profil_(u);
    p.aktif = bool_(u.aktif);
    p.punya_pin = !!u.pin_hash;
    p.terkunci = !!(u.terkunci_sampai && String(u.terkunci_sampai) > sekarang_());
    return p;
  });
}

function aksiPenggunaSimpan_(ctx) {
  var p = ctx.payload;
  var nama = wajib_(p.nama, 'Nama');
  var username = String(p.username || '').trim().toLowerCase();
  var email = String(p.email || '').trim().toLowerCase();
  if (!username && !email) throw galat_('Isi username atau email', 'VALIDASI');
  if (username && !POLA_USERNAME.test(username)) throw galat_('Username 3–20 karakter: huruf kecil, angka, titik, atau garis bawah', 'VALIDASI');
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw galat_('Format email tidak valid', 'VALIDASI');
  var peran = pilihan_(p.peran, ['pemilik', 'admin', 'kasir'], 'Peran');
  var aktif = p.aktif === undefined ? true : !!p.aktif;

  var semua = baca_('Pengguna');
  semua.forEach(function (u) {
    if (u.id_pengguna === p.id_pengguna) return;
    if (email && String(u.email).toLowerCase() === email) throw galat_('Email sudah dipakai pengguna lain', 'VALIDASI');
    if (username && String(u.username || '').toLowerCase() === username) throw galat_('Username sudah dipakai pengguna lain', 'VALIDASI');
    if (username && String(u.email).toLowerCase() === username) throw galat_('Username bentrok dengan email pengguna lain', 'VALIDASI');
  });

  if (p.id_pengguna) {
    var lama = cariSatu_(semua, 'id_pengguna', p.id_pengguna);
    if (!lama) throw galat_('Pengguna tidak ditemukan', 'NOT_FOUND');
    if (lama.id_pengguna === ctx.user.id_pengguna && (!aktif || peran !== 'pemilik')) throw galat_('Anda tidak bisa menonaktifkan atau menurunkan peran akun sendiri', 'VALIDASI');
    ubah_('Pengguna', 'id_pengguna', p.id_pengguna, { nama: nama, username: username, email: email, peran: peran, aktif: aktif ? 'TRUE' : 'FALSE' });
    catatLog_(ctx.user.id_pengguna, 'pengguna.ubah', 'Pengguna', p.id_pengguna, nama + ' (' + peran + ')', ctx.requestId);
    return { id_pengguna: p.id_pengguna };
  }
  var id = idBerikut_('Pengguna', 'id_pengguna', 'USR-', 4);
  tambah_('Pengguna', { id_pengguna: id, nama: nama, username: username, email: email, peran: peran, aktif: aktif ? 'TRUE' : 'FALSE', dibuat_pada: sekarang_(), gagal_login: 0 });
  catatLog_(ctx.user.id_pengguna, 'pengguna.tambah', 'Pengguna', id, nama + ' (' + peran + ')', ctx.requestId);
  return { id_pengguna: id };
}

function aksiPenggunaAturPin_(ctx) {
  var id = wajib_(ctx.payload.id_pengguna, 'Pengguna');
  var pin = String(ctx.payload.pin || '');
  if (!/^\d{6}$/.test(pin)) throw galat_('PIN harus 6 digit angka', 'VALIDASI');
  if (/^(\d)\1{5}$/.test(pin) || pin === '123456' || pin === '654321') throw galat_('PIN terlalu mudah ditebak', 'VALIDASI');
  if (!cariSatu_(baca_('Pengguna'), 'id_pengguna', id)) throw galat_('Pengguna tidak ditemukan', 'NOT_FOUND');
  aturPinInternal_(id, pin);
  catatLog_(ctx.user.id_pengguna, 'pengguna.aturPin', 'Pengguna', id, 'PIN diatur ulang', ctx.requestId);
  return { id_pengguna: id };
}

function aksiRingkasan_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return Object.keys(SKEMA).map(function (n) {
    var sh = ss.getSheetByName(n);
    return { tab: n, baris: sh ? Math.max(0, sh.getLastRow() - 1) : null };
  });
}

function aksiProdukList_() {
  var stok = stokPerProduk_();
  return baca_('Produk').map(function (p) {
    return {
      id_produk: p.id_produk, sku: p.sku, nama: p.nama, kategori: p.kategori, potongan: p.potongan,
      tipe: p.tipe, satuan: p.satuan, hpp: angka_(p.hpp), harga_jual: angka_(p.harga_jual),
      stok_minimum: angka_(p.stok_minimum), aktif: bool_(p.aktif), keterangan: p.keterangan || '',
      stok: bulat3_(stok[p.id_produk] || 0)
    };
  });
}

function aksiProdukSimpan_(ctx) {
  var p = ctx.payload;
  var data = {
    sku: wajib_(p.sku, 'SKU').toUpperCase(),
    nama: wajib_(p.nama, 'Nama produk'),
    kategori: pilihan_(p.kategori, ['sapi', 'ayam', 'kambing', 'kemasan', 'lainnya'], 'Kategori'),
    potongan: String(p.potongan || '').trim(),
    tipe: pilihan_(p.tipe, ['timbang', 'kemasan'], 'Tipe'),
    satuan: pilihan_(p.satuan, ['kg', 'pcs'], 'Satuan'),
    hpp: uangValid_(p.hpp, 'HPP'),
    harga_jual: uangValid_(p.harga_jual, 'Harga jual'),
    stok_minimum: qtyValid_(p.stok_minimum, 'Stok minimum'),
    aktif: p.aktif === false ? 'FALSE' : 'TRUE',
    keterangan: String(p.keterangan || '').trim(),
    diubah_pada: sekarang_()
  };
  if ((data.tipe === 'timbang') !== (data.satuan === 'kg')) throw galat_('Produk timbang harus bersatuan kg, produk kemasan bersatuan pcs', 'VALIDASI');
  if (data.harga_jual <= 0) throw galat_('Harga jual harus lebih dari 0', 'VALIDASI');

  var semua = baca_('Produk');
  var dobel = semua.filter(function (x) { return String(x.sku).toUpperCase() === data.sku && x.id_produk !== p.id_produk; });
  if (dobel.length) throw galat_('SKU ' + data.sku + ' sudah dipakai produk lain', 'VALIDASI');

  if (p.id_produk) {
    if (!cariSatu_(semua, 'id_produk', p.id_produk)) throw galat_('Produk tidak ditemukan', 'NOT_FOUND');
    ubah_('Produk', 'id_produk', p.id_produk, data);
    catatLog_(ctx.user.id_pengguna, 'produk.ubah', 'Produk', p.id_produk, data.nama, ctx.requestId);
    return { id_produk: p.id_produk };
  }
  var id = idBerikut_('Produk', 'id_produk', 'PRD-', 4);
  data.id_produk = id;
  data.dibuat_pada = data.diubah_pada;
  tambah_('Produk', data);
  catatLog_(ctx.user.id_pengguna, 'produk.tambah', 'Produk', id, data.nama, ctx.requestId);
  return { id_produk: id };
}

/* =========================================================
 * Stok (dihitung dari Mutasi_Stok)
 * ======================================================= */

function stokPerProduk_() {
  var hasil = {};
  baca_('Mutasi_Stok').forEach(function (m) {
    hasil[m.id_produk] = (hasil[m.id_produk] || 0) + angka_(m.qty);
  });
  return hasil;
}

/* =========================================================
 * Pengguna & PIN
 * ======================================================= */

function penggunaAktif_(id) {
  if (!id) return null;
  var u = cariSatu_(baca_('Pengguna'), 'id_pengguna', id);
  return u && bool_(u.aktif) ? u : null;
}

function profil_(u) {
  return { id_pengguna: u.id_pengguna, nama: u.nama, username: String(u.username || ''), email: String(u.email || ''), peran: u.peran };
}

var POLA_USERNAME = /^[a-z0-9._]{3,20}$/;

/** Cari pengguna berdasarkan username ATAU email (tanpa beda huruf besar/kecil). */
function cariAkun_(login) {
  login = String(login || '').trim().toLowerCase();
  if (!login) return null;
  var daftar = baca_('Pengguna');
  for (var i = 0; i < daftar.length; i++) {
    var d = daftar[i];
    if (String(d.username || '').trim().toLowerCase() === login || String(d.email || '').trim().toLowerCase() === login) return d;
  }
  return null;
}

function pepper_() {
  var props = PropertiesService.getScriptProperties();
  var p = props.getProperty('PIN_PEPPER');
  if (!p) { p = Utilities.getUuid() + Utilities.getUuid(); props.setProperty('PIN_PEPPER', p); }
  return p;
}

function hashPin_(pin, salt) {
  var data = String(salt) + ':' + pin + ':' + pepper_();
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, data, Utilities.Charset.UTF_8);
  for (var i = 0; i < 300; i++) {
    bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bytes.concat(Utilities.newBlob(String(salt)).getBytes()));
  }
  return Utilities.base64Encode(bytes);
}

function aturPinInternal_(id, pin) {
  var salt = Utilities.getUuid();
  ubah_('Pengguna', 'id_pengguna', id, { pin_hash: hashPin_(pin, salt), pin_salt: salt, gagal_login: 0, terkunci_sampai: '' });
}

/* =========================================================
 * Menu di spreadsheet (untuk pemilik)
 * ======================================================= */

function onOpen() {
  SpreadsheetApp.getUi().createMenu('POS Daging')
    .addItem('Atur PIN pengguna', 'menuAturPin')
    .addItem('Cek / perbarui struktur database', 'setupDatabase')
    .addItem('Cek konfigurasi API', 'menuCekKonfigurasi')
    .addToUi();
}

function menuAturPin() {
  var ui = SpreadsheetApp.getUi();
  var r1 = ui.prompt('Atur PIN', 'Username atau email pengguna (harus sudah ada di tab Pengguna):', ui.ButtonSet.OK_CANCEL);
  if (r1.getSelectedButton() !== ui.Button.OK) return;
  var u = cariAkun_(r1.getResponseText());
  if (!u) { ui.alert('Username/email tidak ditemukan di tab Pengguna. Periksa kolom username atau email.'); return; }
  var r2 = ui.prompt('Atur PIN', 'PIN baru untuk ' + u.nama + ' (6 digit angka):', ui.ButtonSet.OK_CANCEL);
  if (r2.getSelectedButton() !== ui.Button.OK) return;
  var pin = r2.getResponseText().trim();
  if (!/^\d{6}$/.test(pin)) { ui.alert('PIN harus tepat 6 digit angka.'); return; }
  if (/^(\d)\1{5}$/.test(pin) || pin === '123456' || pin === '654321') { ui.alert('PIN terlalu mudah ditebak. Pilih PIN lain.'); return; }
  denganKunci_(function () { aturPinInternal_(u.id_pengguna, pin); });
  catatLog_(u.id_pengguna, 'pengguna.aturPin', 'Pengguna', u.id_pengguna, 'PIN diatur lewat menu spreadsheet', '');
  ui.alert('PIN untuk ' + u.nama + ' sudah disimpan (dalam bentuk hash, bukan teks asli).');
}

function menuCekKonfigurasi() {
  var props = PropertiesService.getScriptProperties();
  var s = props.getProperty('API_SECRET');
  var h = aksiHealth_();
  var pesan = [
    'API_SECRET: ' + (s ? 'sudah diatur (' + s.length + ' karakter)' : 'BELUM diatur'),
    'Versi skema: ' + h.skema_versi,
    'Tab hilang: ' + (h.tab_hilang.length ? h.tab_hilang.join(', ') : 'tidak ada'),
    'Pengguna yang sudah punya PIN: ' + h.pengguna_dengan_pin
  ].join('\n');
  SpreadsheetApp.getUi().alert('Konfigurasi API', pesan, SpreadsheetApp.getUi().ButtonSet.OK);
}

/* =========================================================
 * Akses sheet
 * ======================================================= */

function tab_(nama) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nama);
  if (!sh) throw galat_('Tab "' + nama + '" tidak ada. Jalankan menu POS Daging → Cek / perbarui struktur database.', 'CONFIG');
  return sh;
}

function header_(sh) {
  return sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
}

/** Baca semua baris sebagai objek {kolom: nilai}. Tanggal diubah ke teks yyyy-MM-dd HH:mm:ss. */
function baca_(nama) {
  var sh = tab_(nama);
  var n = sh.getLastRow();
  if (n < 2) return [];
  var h = header_(sh);
  return sh.getRange(2, 1, n - 1, h.length).getValues()
    .filter(function (r) { return String(r[0]) !== ''; })
    .map(function (r) {
      var o = {};
      h.forEach(function (k, i) {
        var v = r[i];
        if (v instanceof Date) v = Utilities.formatDate(v, 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss');
        o[k] = v;
      });
      return o;
    });
}

function tambah_(nama, obj) {
  var sh = tab_(nama);
  var h = header_(sh);
  var baris = h.map(function (k) { return obj[k] === undefined ? '' : obj[k]; });
  sh.getRange(sh.getLastRow() + 1, 1, 1, h.length).setValues([baris]);
}

function ubah_(nama, kolomId, id, patch) {
  var sh = tab_(nama);
  var h = header_(sh);
  var iId = h.indexOf(kolomId);
  var n = sh.getLastRow();
  if (n < 2) throw galat_('Data tidak ditemukan', 'NOT_FOUND');
  var ids = sh.getRange(2, iId + 1, n - 1, 1).getValues();
  for (var r = 0; r < ids.length; r++) {
    if (String(ids[r][0]) === String(id)) {
      Object.keys(patch).forEach(function (k) {
        var c = h.indexOf(k);
        if (c === -1) throw galat_('Kolom ' + k + ' tidak ada di tab ' + nama, 'CONFIG');
        sh.getRange(r + 2, c + 1).setValue(patch[k]);
      });
      return;
    }
  }
  throw galat_('Data ' + id + ' tidak ditemukan di ' + nama, 'NOT_FOUND');
}

function idBerikut_(nama, kolomId, awalan, digit) {
  var maks = 0;
  baca_(nama).forEach(function (r) {
    var s = String(r[kolomId]);
    if (s.indexOf(awalan) === 0) { var x = parseInt(s.slice(awalan.length), 10); if (x > maks) maks = x; }
  });
  var a = String(maks + 1);
  while (a.length < digit) a = '0' + a;
  return awalan + a;
}

function cariSatu_(arr, kolom, nilai) {
  for (var i = 0; i < arr.length; i++) if (String(arr[i][kolom]) === String(nilai)) return arr[i];
  return null;
}

function catatLog_(idPengguna, aksi, entitas, idEntitas, ringkasan, requestId) {
  try {
    tambah_('Log_Aktivitas', { waktu: sekarang_(), id_pengguna: idPengguna || '', aksi: aksi, entitas: entitas, id_entitas: idEntitas || '', ringkasan: ringkasan || '', id_permintaan: requestId || '' });
  } catch (e) { console.error('Gagal menulis log: ' + e); }
}

/* =========================================================
 * Utilitas
 * ======================================================= */

function denganKunci_(fn) {
  var kunci = LockService.getScriptLock();
  if (!kunci.tryLock(20000)) throw galat_('Server sedang sibuk, coba lagi sebentar', 'SIBUK');
  try { var hasil = fn(); SpreadsheetApp.flush(); return hasil; } finally { kunci.releaseLock(); }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function galat_(pesan, kode) { var e = new Error(pesan); e.kode = kode; return e; }

/** Perbandingan string dengan waktu konstan (mencegah tebak-tebakan lewat waktu respons). */
function samaAman_(a, b) {
  a = String(a); b = String(b);
  var beda = a.length ^ b.length;
  for (var i = 0; i < Math.max(a.length, b.length); i++) beda |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return beda === 0;
}

function sekarang_() { return Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss'); }
function bool_(v) { return v === true || String(v).toUpperCase() === 'TRUE'; }
function angka_(v) { var n = Number(v); return isFinite(n) ? n : 0; }
function bulat3_(n) { return Math.round(n * 1000) / 1000; }

function wajib_(v, label) {
  var s = String(v === undefined || v === null ? '' : v).trim();
  if (!s) throw galat_(label + ' wajib diisi', 'VALIDASI');
  if (s.length > 200) throw galat_(label + ' terlalu panjang', 'VALIDASI');
  return s;
}
function pilihan_(v, daftar, label) {
  if (daftar.indexOf(v) === -1) throw galat_(label + ' tidak valid', 'VALIDASI');
  return v;
}
function uangValid_(v, label) {
  var n = Number(v);
  if (!isFinite(n) || n < 0 || Math.round(n) !== n) throw galat_(label + ' harus angka rupiah bulat dan tidak negatif', 'VALIDASI');
  return n;
}
function qtyValid_(v, label) {
  var n = Number(v);
  if (!isFinite(n) || n < 0) throw galat_(label + ' harus angka tidak negatif', 'VALIDASI');
  return bulat3_(n);
}

/* =========================================================
 * DATA LENGKAP UNTUK APLIKASI
 * Dokumen berstatus batal tidak dikirim (riwayatnya tetap di sheet).
 * Kasir tidak menerima data modal & pengeluaran.
 * ======================================================= */

function aksiSemua_(ctx) {
  var peran = ctx.user.peran;
  var stok = stokPerProduk_();
  var bayar = baca_('Pembayaran').filter(function (b) { return b.status !== 'batal'; });
  var bayarPer = function (tipe, id) { return bayar.filter(function (b) { return b.ref_tipe === tipe && String(b.ref_id) === String(id); }); };
  var kelompok = function (rows, kunci) { var m = {}; rows.forEach(function (r) { (m[r[kunci]] = m[r[kunci]] || []).push(r); }); return m; };

  var dPj = kelompok(baca_('Detail_Penjualan'), 'id_penjualan');
  var rPj = kelompok(baca_('Retur'), 'id_penjualan');
  var dPs = kelompok(baca_('Detail_Pesanan'), 'id_pesanan');
  var dPb = kelompok(baca_('Detail_Pembelian'), 'id_pembelian');

  var penjualan = baca_('Penjualan').filter(function (t) { return t.status !== 'batal'; }).map(function (t) {
    return {
      id: t.id_penjualan, waktu: t.waktu, id_pelanggan: t.id_pelanggan, diskon: angka_(t.diskon), total: angka_(t.total),
      items: (dPj[t.id_penjualan] || []).map(function (d) { return { id_produk: d.id_produk, qty: angka_(d.qty), harga: angka_(d.harga), hpp: angka_(d.hpp_satuan) }; }),
      bayar: bayarPer('penjualan', t.id_penjualan).filter(function (b) { return b.arah === 'masuk'; }).map(function (b) { return { metode: b.metode, jumlah: angka_(b.jumlah), waktu: b.waktu }; }),
      refund: bayarPer('penjualan', t.id_penjualan).filter(function (b) { return b.arah === 'keluar'; }).map(function (b) { return { metode: b.metode, jumlah: angka_(b.jumlah), waktu: b.waktu }; }),
      retur: (rPj[t.id_penjualan] || []).map(function (r) { return { id_produk: r.id_produk, qty: angka_(r.qty), nilai: angka_(r.nilai), hpp: angka_(r.hpp_satuan), waktu: r.waktu, kembali_stok: bool_(r.kembali_stok) }; })
    };
  });

  var pesanan = baca_('Pesanan').map(function (p) {
    return {
      id: p.id_pesanan, tanggal: tgl_(p.tanggal), id_pelanggan: p.id_pelanggan, jadwal_kirim: tgl_(p.jadwal_kirim), alamat_kirim: p.alamat_kirim,
      dp_persen: angka_(p.dp_persen), status: p.status, catatan: p.catatan || '', selesai_pada: tgl_(p.selesai_pada),
      items: (dPs[p.id_pesanan] || []).map(function (d) { return { id_produk: d.id_produk, qty: angka_(d.qty), harga: angka_(d.harga), hpp: angka_(d.hpp_satuan) }; }),
      dibatalkan_pada: tgl_(p.dibatalkan_pada),
      bayar: bayarPer('pesanan', p.id_pesanan).map(function (b) { return { id: b.id_pembayaran, waktu: b.waktu, arah: b.arah, jenis: b.jenis, metode: b.metode, jumlah: angka_(b.jumlah), bukti: b.bukti_url || '' }; })
    };
  });

  var bolehKeuangan = peran !== 'kasir';
  var pembelian = !bolehKeuangan ? [] : baca_('Pembelian').filter(function (b) { return b.status_penerimaan !== 'batal'; }).map(function (b) {
    return {
      id: b.id_pembelian, tanggal: tgl_(b.tanggal), id_supplier: b.id_supplier, status: b.status_penerimaan,
      biaya_tambahan: angka_(b.biaya_tambahan), ket_biaya: b.ket_biaya || '', catatan: b.catatan || '',
      items: (dPb[b.id_pembelian] || []).map(function (d) { return { id_produk: d.id_produk, qty_pesan: angka_(d.qty_pesan), qty_terima: angka_(d.qty_terima), harga: angka_(d.harga_beli) }; }),
      bayar: bayarPer('pembelian', b.id_pembelian).map(function (x) { return { id: x.id_pembayaran, waktu: x.waktu, jenis: x.jenis, jumlah: angka_(x.jumlah) }; })
    };
  });

  var pemilik = peran === 'pemilik';
  return {
    waktu_server: sekarang_(),
    pengaturan: pengaturanObj_(),
    produk: aksiProdukList_().map(function (p) { p.stok = bulat3_(stok[p.id_produk] || 0); return p; }),
    pelanggan: baca_('Pelanggan').filter(function (c) { return bool_(c.aktif) || c.id_pelanggan === 'PLG-0000'; })
      .map(function (c) { return { id: c.id_pelanggan, nama: c.nama, telepon: String(c.telepon || ''), alamat: c.alamat || '', jenis: c.jenis || 'eceran' }; }),
    supplier: baca_('Supplier').filter(function (x) { return bool_(x.aktif); })
      .map(function (x) { return { id: x.id_supplier, nama: x.nama, kontak: x.kontak || '', telepon: String(x.telepon || ''), alamat: x.alamat || '', komoditas: x.komoditas || '' }; }),
    penjualan: penjualan,
    pesanan: pesanan,
    pembelian: pembelian,
    mutasi: baca_('Mutasi_Stok').map(function (m) { return { id: m.id_mutasi, waktu: m.waktu, id_produk: m.id_produk, id_batch: m.id_batch || '', jenis: m.jenis, qty: angka_(m.qty), ref: m.ref_id || '', catatan: m.catatan || '' }; }),
    batch: baca_('Batch_Stok').map(function (x) { return { id: x.id_batch, id_produk: x.id_produk, id_pembelian: x.id_pembelian || '', masuk: tgl_(x.tanggal_masuk), kedaluwarsa: tgl_(x.kedaluwarsa), qty_awal: angka_(x.qty_awal), hpp: angka_(x.hpp_satuan) }; }),
    modal: !pemilik ? [] : baca_('Modal').filter(function (m) { return m.status !== 'batal'; }).map(function (m) { return { id: m.id_modal, tanggal: tgl_(m.tanggal), jenis: m.jenis, jumlah: angka_(m.jumlah), keterangan: m.keterangan || '' }; }),
    pengeluaran: !bolehKeuangan ? [] : baca_('Pengeluaran').filter(function (e) { return e.status !== 'batal'; }).map(function (e) { return { id: e.id_pengeluaran, tanggal: tgl_(e.tanggal), kategori: e.kategori, keterangan: e.keterangan || '', jumlah: angka_(e.jumlah), metode: e.metode || 'tunai' }; })
  };
}

/* =========================================================
 * PENGATURAN
 * ======================================================= */

var KUNCI_PENGATURAN = ['nama_usaha', 'tagline', 'alamat_usaha', 'telepon_usaha', 'npwp', 'dp_persen', 'rekening_transfer',
  'struk_lebar', 'struk_footer', 'struk_logo', 'metode_tunai', 'metode_qris', 'metode_transfer', 'metode_tempo',
  'format_no_penjualan', 'format_no_pesanan', 'format_no_pembelian'];

function pengaturanObj_() {
  var o = {};
  baca_('Pengaturan').forEach(function (r) { o[r.kunci] = String(r.nilai); });
  return o;
}

function aksiPengaturanSimpan_(ctx) {
  var p = ctx.payload.nilai || {};
  var sh = tab_('Pengaturan');
  var ada = {};
  baca_('Pengaturan').forEach(function (r, i) { ada[r.kunci] = i + 2; });
  Object.keys(p).forEach(function (k) {
    if (KUNCI_PENGATURAN.indexOf(k) === -1) throw galat_('Pengaturan tidak dikenal: ' + k, 'VALIDASI');
    var v = String(p[k] === null || p[k] === undefined ? '' : p[k]).trim();
    if (v.length > 300) throw galat_('Nilai ' + k + ' terlalu panjang', 'VALIDASI');
    if (k === 'dp_persen' && !(Number(v) >= 0 && Number(v) <= 100)) throw galat_('DP harus 0–100%', 'VALIDASI');
    if (ada[k]) sh.getRange(ada[k], 2).setValue(v); else { tambah_('Pengaturan', { kunci: k, nilai: v, keterangan: '' }); ada[k] = sh.getLastRow(); }
  });
  catatLog_(ctx.user.id_pengguna, 'pengaturan.simpan', 'Pengaturan', '', Object.keys(p).join(', '), ctx.requestId);
  return { ok: true };
}

/* =========================================================
 * PELANGGAN & SUPPLIER
 * ======================================================= */

function aksiPelangganSimpan_(ctx) {
  var p = ctx.payload;
  var data = { nama: wajib_(p.nama, 'Nama'), telepon: String(p.telepon || '').trim(), alamat: String(p.alamat || '').trim(), jenis: pilihan_(p.jenis || 'eceran', ['eceran', 'partai'], 'Jenis pelanggan') };
  if (p.id) {
    if (p.id === 'PLG-0000') throw galat_('Pelanggan Umum tidak bisa diubah', 'VALIDASI');
    ubah_('Pelanggan', 'id_pelanggan', p.id, data);
    catatLog_(ctx.user.id_pengguna, 'pelanggan.ubah', 'Pelanggan', p.id, data.nama, ctx.requestId);
    return { id: p.id };
  }
  data.id_pelanggan = idBerikut_('Pelanggan', 'id_pelanggan', 'PLG-', 4);
  data.aktif = 'TRUE'; data.dibuat_pada = sekarang_();
  tambah_('Pelanggan', data);
  catatLog_(ctx.user.id_pengguna, 'pelanggan.tambah', 'Pelanggan', data.id_pelanggan, data.nama, ctx.requestId);
  return { id: data.id_pelanggan };
}

function aksiSupplierSimpan_(ctx) {
  var p = ctx.payload;
  var data = { nama: wajib_(p.nama, 'Nama supplier'), kontak: String(p.kontak || '').trim(), telepon: String(p.telepon || '').trim(), alamat: String(p.alamat || '').trim(), komoditas: String(p.komoditas || '').trim() };
  if (p.id) {
    ubah_('Supplier', 'id_supplier', p.id, data);
    catatLog_(ctx.user.id_pengguna, 'supplier.ubah', 'Supplier', p.id, data.nama, ctx.requestId);
    return { id: p.id };
  }
  data.id_supplier = idBerikut_('Supplier', 'id_supplier', 'SUP-', 4);
  data.aktif = 'TRUE'; data.dibuat_pada = sekarang_();
  tambah_('Supplier', data);
  catatLog_(ctx.user.id_pengguna, 'supplier.tambah', 'Supplier', data.id_supplier, data.nama, ctx.requestId);
  return { id: data.id_supplier };
}

/* =========================================================
 * PENJUALAN KASIR
 * Harga diambil dari master produk di server (bukan dari browser).
 * Kekurangan bayar = piutang (tempo), hanya untuk pelanggan terdaftar.
 * Anti-duplikat: id_permintaan yang sama tidak akan dicatat dua kali.
 * ======================================================= */

function aksiPenjualanSimpan_(ctx) {
  var p = ctx.payload;
  var idPermintaan = wajib_(p.id_permintaan, 'id_permintaan');
  var lama = baca_('Penjualan').filter(function (t) { return String(t.id_permintaan) === idPermintaan; })[0];
  if (lama) return { id: lama.id_penjualan, total: angka_(lama.total), duplikat: true };

  var idPelanggan = String(p.id_pelanggan || 'PLG-0000');
  if (!cariSatu_(baca_('Pelanggan'), 'id_pelanggan', idPelanggan)) throw galat_('Pelanggan tidak ditemukan', 'VALIDASI');
  var items = gabungItems_(p.items);
  if (!items.length) throw galat_('Keranjang kosong', 'VALIDASI');

  var produk = baca_('Produk');
  var stok = stokPerProduk_();
  var subtotal = 0;
  var baris = items.map(function (it) {
    var pr = cariSatu_(produk, 'id_produk', it.id_produk);
    if (!pr || !bool_(pr.aktif)) throw galat_('Produk tidak tersedia: ' + it.id_produk, 'VALIDASI');
    if ((stok[pr.id_produk] || 0) + 1e-9 < it.qty) throw galat_('Stok ' + pr.nama + ' tidak cukup (sisa ' + bulat3_(stok[pr.id_produk] || 0) + ' ' + pr.satuan + ')', 'VALIDASI');
    if (pr.satuan === 'pcs' && Math.round(it.qty) !== it.qty) throw galat_(pr.nama + ' dijual per pcs (bilangan bulat)', 'VALIDASI');
    var harga = angka_(pr.harga_jual), nilai = Math.round(it.qty * harga);
    subtotal += nilai;
    return { pr: pr, qty: it.qty, harga: harga, hpp: angka_(pr.hpp), nilai: nilai };
  });
  var diskon = uangValid_(p.diskon || 0, 'Diskon');
  if (diskon > subtotal) throw galat_('Diskon melebihi subtotal', 'VALIDASI');
  var total = subtotal - diskon;

  var bayar = (p.pembayaran || []).filter(function (b) { return Number(b.jumlah) > 0; }).map(function (b) {
    return { metode: pilihan_(b.metode, ['tunai', 'transfer', 'qris'], 'Metode bayar'), jumlah: uangValid_(b.jumlah, 'Jumlah bayar') };
  });
  var dibayar = bayar.reduce(function (s, b) { return s + b.jumlah; }, 0);
  if (dibayar > total) throw galat_('Pembayaran melebihi total. Catat uang tunai sebesar total, bukan uang yang diterima.', 'VALIDASI');
  if (dibayar < total && idPelanggan === 'PLG-0000') throw galat_('Pembayaran kurang. Tempo (piutang) hanya untuk pelanggan terdaftar.', 'VALIDASI');

  var waktu = sekarang_();
  var id = idHarian_('Penjualan', 'id_penjualan', 'TRX-', 3);
  tambah_('Penjualan', { id_penjualan: id, waktu: waktu, id_pelanggan: idPelanggan, subtotal: subtotal, diskon: diskon, total: total, status: 'selesai', id_kasir: ctx.user.id_pengguna, id_permintaan: idPermintaan, catatan: String(p.catatan || '') });

  var idDet = idBanyak_('Detail_Penjualan', 'id_detail', 'DPJ-', 6, baris.length);
  tambahBanyak_('Detail_Penjualan', baris.map(function (b, i) { return { id_detail: idDet[i], id_penjualan: id, id_produk: b.pr.id_produk, qty: b.qty, harga: b.harga, hpp_satuan: b.hpp, subtotal: b.nilai }; }));

  var idMs = idBanyak_('Mutasi_Stok', 'id_mutasi', 'MS-', 8, baris.length);
  tambahBanyak_('Mutasi_Stok', baris.map(function (b, i) { return { id_mutasi: idMs[i], waktu: waktu, id_produk: b.pr.id_produk, jenis: 'terjual', qty: -b.qty, nilai_hpp: Math.round(b.qty * b.hpp), ref_tipe: 'penjualan', ref_id: id, dibuat_oleh: ctx.user.id_pengguna }; }));

  catatBayarMasuk_(bayar.map(function (b) { return { ref_tipe: 'penjualan', ref_id: id, jenis: dibayar >= total ? 'lunas' : 'cicilan', metode: b.metode, jumlah: b.jumlah, sumber: 'penjualan', ket: 'Penjualan kasir ' + id }; }), ctx, waktu);

  catatLog_(ctx.user.id_pengguna, 'penjualan.simpan', 'Penjualan', id, 'Total ' + total + (dibayar < total ? ', piutang ' + (total - dibayar) : ''), idPermintaan);
  return { id: id, total: total, waktu: waktu };
}

/* =========================================================
 * PESANAN PARTAI
 * Stok berkurang dan omzet diakui saat status menjadi selesai.
 * ======================================================= */

function aksiPesananSimpan_(ctx) {
  var p = ctx.payload;
  var idPelanggan = wajib_(p.id_pelanggan, 'Pelanggan');
  if (!cariSatu_(baca_('Pelanggan'), 'id_pelanggan', idPelanggan)) throw galat_('Pelanggan tidak ditemukan', 'VALIDASI');
  var status = pilihan_(p.status || 'draft', ['draft', 'menunggu_dp'], 'Status awal');
  var produk = baca_('Produk');
  var items = (p.items || []).map(function (it) {
    var pr = cariSatu_(produk, 'id_produk', it.id_produk);
    if (!pr) throw galat_('Produk tidak ditemukan', 'VALIDASI');
    var qty = qtyValid_(it.qty, 'Jumlah ' + pr.nama);
    if (qty <= 0) throw galat_('Jumlah ' + pr.nama + ' harus lebih dari 0', 'VALIDASI');
    var harga = uangValid_(it.harga, 'Harga ' + pr.nama);
    if (harga <= 0) throw galat_('Harga ' + pr.nama + ' harus lebih dari 0', 'VALIDASI');
    return { pr: pr, qty: qty, harga: harga };
  });
  if (!items.length) throw galat_('Tambahkan minimal satu produk', 'VALIDASI');
  var kirim = tanggalValid_(p.jadwal_kirim, 'Jadwal kirim');
  var dp = Number(pengaturanObj_().dp_persen || 70);

  var id = idHarian_('Pesanan', 'id_pesanan', 'PP-', 2);
  var waktu = sekarang_();
  tambah_('Pesanan', { id_pesanan: id, tanggal: waktu.slice(0, 10), id_pelanggan: idPelanggan, jadwal_kirim: kirim, alamat_kirim: String(p.alamat_kirim || '').trim(), dp_persen: dp, status: status, catatan: String(p.catatan || '').trim(), dibuat_pada: waktu, dibuat_oleh: ctx.user.id_pengguna });
  var ids = idBanyak_('Detail_Pesanan', 'id_detail', 'DPP-', 6, items.length);
  tambahBanyak_('Detail_Pesanan', items.map(function (it, i) { return { id_detail: ids[i], id_pesanan: id, id_produk: it.pr.id_produk, qty: it.qty, harga: it.harga, hpp_satuan: angka_(it.pr.hpp) }; }));
  catatLog_(ctx.user.id_pengguna, 'pesanan.simpan', 'Pesanan', id, status, ctx.requestId);
  return { id: id };
}

var ALUR_PESANAN = { draft: ['menunggu_dp', 'batal'], menunggu_dp: ['proses', 'batal'], proses: ['siap_kirim', 'batal'], siap_kirim: ['selesai', 'batal'], selesai: [], batal: [] };

function aksiPesananStatus_(ctx) {
  var id = wajib_(ctx.payload.id, 'Pesanan');
  var ke = String(ctx.payload.status || '');
  var ps = cariSatu_(baca_('Pesanan'), 'id_pesanan', id);
  if (!ps) throw galat_('Pesanan tidak ditemukan', 'NOT_FOUND');
  if ((ALUR_PESANAN[ps.status] || []).indexOf(ke) === -1) throw galat_('Status ' + ps.status + ' tidak bisa diubah menjadi ' + ke, 'VALIDASI');

  var patch = { status: ke };
  if (ke === 'batal') {
    var bersih = bayarBersih_('pesanan', id);
    var kembalikan = !!ctx.payload.refund;
    patch.dibatalkan_pada = sekarang_();
    patch.alasan_batal = String(ctx.payload.alasan || '').trim() + (bersih > 0 ? (kembalikan ? ' [DP dikembalikan ' + bersih + ']' : ' [DP hangus ' + bersih + ']') : '');
    if (bersih > 0 && kembalikan) {
      catatRefund_({ ref_tipe: 'pesanan', ref_id: id, jumlah: bersih, metode: pilihan_(ctx.payload.metode || 'transfer', ['tunai', 'transfer', 'qris'], 'Metode'), ket: 'Pengembalian DP pesanan ' + id }, ctx, sekarang_());
    }
  }
  if (ke === 'selesai') {
    var det = baca_('Detail_Pesanan').filter(function (d) { return d.id_pesanan === id; });
    var stok = stokPerProduk_();
    var produk = baca_('Produk');
    det.forEach(function (d) {
      if ((stok[d.id_produk] || 0) + 1e-9 < angka_(d.qty)) {
        var pr = cariSatu_(produk, 'id_produk', d.id_produk);
        throw galat_('Stok ' + (pr ? pr.nama : d.id_produk) + ' tidak cukup untuk menyelesaikan pesanan (sisa ' + bulat3_(stok[d.id_produk] || 0) + ')', 'VALIDASI');
      }
    });
    // Cegah pengurangan stok ganda bila aksi terulang
    var sudah = baca_('Mutasi_Stok').some(function (m) { return m.ref_tipe === 'pesanan' && m.ref_id === id && m.jenis === 'terjual'; });
    if (!sudah) {
      var waktu = sekarang_();
      var ids = idBanyak_('Mutasi_Stok', 'id_mutasi', 'MS-', 8, det.length);
      tambahBanyak_('Mutasi_Stok', det.map(function (d, i) { return { id_mutasi: ids[i], waktu: waktu, id_produk: d.id_produk, jenis: 'terjual', qty: -angka_(d.qty), nilai_hpp: Math.round(angka_(d.qty) * angka_(d.hpp_satuan)), ref_tipe: 'pesanan', ref_id: id, catatan: 'Pesanan partai selesai', dibuat_oleh: ctx.user.id_pengguna }; }));
    }
    patch.selesai_pada = sekarang_();
  }
  ubah_('Pesanan', 'id_pesanan', id, patch);
  catatLog_(ctx.user.id_pengguna, 'pesanan.status', 'Pesanan', id, ps.status + ' → ' + ke, ctx.requestId);
  return { id: id, status: ke };
}

function aksiPesananBayar_(ctx) {
  var p = ctx.payload;
  var id = wajib_(p.id, 'Pesanan');
  var ps = cariSatu_(baca_('Pesanan'), 'id_pesanan', id);
  if (!ps) throw galat_('Pesanan tidak ditemukan', 'NOT_FOUND');
  if (ps.status === 'batal' || ps.status === 'draft') throw galat_('Pesanan ' + ps.status + ' tidak bisa menerima pembayaran', 'VALIDASI');
  var total = baca_('Detail_Pesanan').filter(function (d) { return d.id_pesanan === id; }).reduce(function (s, d) { return s + Math.round(angka_(d.qty) * angka_(d.harga)); }, 0);
  var dibayar = bayarBersih_('pesanan', id);
  var jumlah = uangValid_(p.jumlah, 'Jumlah');
  if (jumlah <= 0) throw galat_('Jumlah harus lebih dari 0', 'VALIDASI');
  if (dibayar + jumlah > total) throw galat_('Melebihi sisa tagihan (' + (total - dibayar) + ')', 'VALIDASI');
  var jenis = pilihan_(p.jenis, ['dp', 'cicilan', 'pelunasan'], 'Jenis pembayaran');
  catatBayarMasuk_([{ ref_tipe: 'pesanan', ref_id: id, jenis: jenis, metode: pilihan_(p.metode, ['tunai', 'transfer', 'qris'], 'Metode'), jumlah: jumlah, bukti: String(p.bukti || ''),
    sumber: ps.status === 'selesai' ? 'pelunasan_pelanggan' : (jenis === 'pelunasan' ? 'pelunasan_pelanggan' : 'dp_pelanggan'), ket: (jenis === 'dp' ? 'DP' : 'Pembayaran') + ' pesanan ' + id }], ctx, sekarang_());

  var targetDp = Math.ceil(total * angka_(ps.dp_persen || 70) / 100 / 1000) * 1000;
  var statusBaru = ps.status;
  if (ps.status === 'menunggu_dp' && dibayar + jumlah >= targetDp) { ubah_('Pesanan', 'id_pesanan', id, { status: 'proses' }); statusBaru = 'proses'; }
  catatLog_(ctx.user.id_pengguna, 'pesanan.bayar', 'Pesanan', id, jenis + ' ' + jumlah, ctx.requestId);
  return { id: id, status: statusBaru };
}

/* =========================================================
 * PEMBELIAN
 * DP ke supplier = uang muka. Utang timbul saat barang diterima.
 * ======================================================= */

function aksiPembelianSimpan_(ctx) {
  var p = ctx.payload;
  var idSup = wajib_(p.id_supplier, 'Supplier');
  if (!cariSatu_(baca_('Supplier'), 'id_supplier', idSup)) throw galat_('Supplier tidak ditemukan', 'VALIDASI');
  var produk = baca_('Produk');
  var items = (p.items || []).map(function (it) {
    var pr = cariSatu_(produk, 'id_produk', it.id_produk);
    if (!pr) throw galat_('Produk tidak ditemukan', 'VALIDASI');
    var qty = qtyValid_(it.qty, 'Jumlah ' + pr.nama);
    if (qty <= 0) throw galat_('Jumlah ' + pr.nama + ' harus lebih dari 0', 'VALIDASI');
    return { pr: pr, qty: qty, harga: uangValid_(it.harga, 'Harga beli ' + pr.nama) };
  });
  if (!items.length) throw galat_('Tambahkan minimal satu produk', 'VALIDASI');
  var biaya = uangValid_(p.biaya_tambahan || 0, 'Biaya tambahan');
  var estimasi = items.reduce(function (s, it) { return s + Math.round(it.qty * it.harga); }, 0) + biaya;
  var dp = uangValid_(p.dp || 0, 'DP');
  if (dp > estimasi) throw galat_('DP melebihi nilai pembelian', 'VALIDASI');

  var id = idHarian_('Pembelian', 'id_pembelian', 'PB-', 2);
  var waktu = sekarang_();
  tambah_('Pembelian', { id_pembelian: id, tanggal: waktu.slice(0, 10), id_supplier: idSup, status_penerimaan: 'dipesan', biaya_tambahan: biaya, ket_biaya: String(p.ket_biaya || 'Ongkir'), catatan: String(p.catatan || ''), dibuat_pada: waktu, dibuat_oleh: ctx.user.id_pengguna });
  var ids = idBanyak_('Detail_Pembelian', 'id_detail', 'DPB-', 6, items.length);
  tambahBanyak_('Detail_Pembelian', items.map(function (it, i) { return { id_detail: ids[i], id_pembelian: id, id_produk: it.pr.id_produk, qty_pesan: it.qty, qty_terima: 0, harga_beli: it.harga }; }));
  if (dp > 0) catatBayarKeluar_({ ref_id: id, jenis: 'dp', metode: pilihan_(p.metode || 'transfer', ['tunai', 'transfer', 'qris'], 'Metode'), jumlah: dp, sumber: 'dp_supplier', ket: 'Uang muka pembelian ' + id }, ctx, waktu);
  catatLog_(ctx.user.id_pengguna, 'pembelian.simpan', 'Pembelian', id, 'Estimasi ' + estimasi + (dp ? ', DP ' + dp : ''), ctx.requestId);
  return { id: id };
}

function aksiPembelianTerima_(ctx) {
  var id = wajib_(ctx.payload.id, 'Pembelian');
  var pb = cariSatu_(baca_('Pembelian'), 'id_pembelian', id);
  if (!pb) throw galat_('Pembelian tidak ditemukan', 'NOT_FOUND');
  if (pb.status_penerimaan !== 'dipesan') throw galat_('Pembelian ini sudah diterima atau dibatalkan', 'VALIDASI');
  var qtyTerima = ctx.payload.qty || {};
  var det = baca_('Detail_Pembelian').filter(function (d) { return d.id_pembelian === id; });
  var nilaiBarang = 0;
  var baris = det.map(function (d) {
    var q = qtyValid_(qtyTerima[d.id_produk] === undefined ? d.qty_pesan : qtyTerima[d.id_produk], 'Berat diterima');
    nilaiBarang += Math.round(q * angka_(d.harga_beli));
    return { d: d, q: q };
  });
  if (!baris.some(function (b) { return b.q > 0; })) throw galat_('Isi berat/jumlah yang diterima', 'VALIDASI');
  var biaya = angka_(pb.biaya_tambahan);
  var waktu = sekarang_();
  var kedaluwarsa = ctx.payload.kedaluwarsa || {};
  var masuk = baris.filter(function (b) { return b.q > 0; });
  var idB = idBanyak_('Batch_Stok', 'id_batch', 'BAT-', 6, masuk.length);
  var idM = idBanyak_('Mutasi_Stok', 'id_mutasi', 'MS-', 8, masuk.length);
  // Biaya tambahan dialokasikan proporsional ke nilai barang → masuk ke HPP batch, bukan beban
  var batches = masuk.map(function (b, i) {
    var nilai = Math.round(b.q * angka_(b.d.harga_beli));
    var alokasi = nilaiBarang > 0 ? biaya * nilai / nilaiBarang : 0;
    var hpp = Math.round((nilai + alokasi) / b.q);
    var exp = kedaluwarsa[b.d.id_produk] ? tanggalValid_(kedaluwarsa[b.d.id_produk], 'Kedaluwarsa') : '';
    return { id_batch: idB[i], id_produk: b.d.id_produk, id_pembelian: id, tanggal_masuk: waktu.slice(0, 10), kedaluwarsa: exp, qty_awal: b.q, hpp_satuan: hpp, catatan: '' };
  });
  tambahBanyak_('Batch_Stok', batches);
  tambahBanyak_('Mutasi_Stok', masuk.map(function (b, i) { return { id_mutasi: idM[i], waktu: waktu, id_produk: b.d.id_produk, id_batch: idB[i], jenis: 'masuk', qty: b.q, nilai_hpp: Math.round(b.q * batches[i].hpp_satuan), ref_tipe: 'pembelian', ref_id: id, dibuat_oleh: ctx.user.id_pengguna }; }));
  baris.forEach(function (b) { ubah_('Detail_Pembelian', 'id_detail', b.d.id_detail, { qty_terima: b.q }); });
  ubah_('Pembelian', 'id_pembelian', id, { status_penerimaan: 'diterima' });
  catatLog_(ctx.user.id_pengguna, 'pembelian.terima', 'Pembelian', id, masuk.length + ' produk masuk stok', ctx.requestId);
  return { id: id };
}

function aksiPembelianBayar_(ctx) {
  var id = wajib_(ctx.payload.id, 'Pembelian');
  var pb = cariSatu_(baca_('Pembelian'), 'id_pembelian', id);
  if (!pb) throw galat_('Pembelian tidak ditemukan', 'NOT_FOUND');
  var det = baca_('Detail_Pembelian').filter(function (d) { return d.id_pembelian === id; });
  var diterima = pb.status_penerimaan !== 'dipesan';
  var nilai = det.reduce(function (s, d) { return s + Math.round(angka_(diterima ? d.qty_terima : d.qty_pesan) * angka_(d.harga_beli)); }, 0) + angka_(pb.biaya_tambahan);
  var sisa = nilai - totalBayar_('pembelian', id);
  var jumlah = uangValid_(ctx.payload.jumlah, 'Jumlah');
  if (jumlah <= 0 || jumlah > sisa) throw galat_('Jumlah harus 1 sampai ' + sisa, 'VALIDASI');
  catatBayarKeluar_({ ref_id: id, jenis: diterima ? 'pelunasan' : 'dp', metode: pilihan_(ctx.payload.metode || 'transfer', ['tunai', 'transfer', 'qris'], 'Metode'), jumlah: jumlah,
    sumber: diterima ? 'bayar_supplier' : 'dp_supplier', ket: (diterima ? 'Pembayaran' : 'Uang muka') + ' pembelian ' + id }, ctx, sekarang_());
  catatLog_(ctx.user.id_pengguna, 'pembelian.bayar', 'Pembelian', id, String(jumlah), ctx.requestId);
  return { id: id };
}

/* =========================================================
 * STOK, MODAL, PENGELUARAN
 * ======================================================= */

function aksiStokSesuaikan_(ctx) {
  var p = ctx.payload;
  var pr = cariSatu_(baca_('Produk'), 'id_produk', wajib_(p.id_produk, 'Produk'));
  if (!pr) throw galat_('Produk tidak ditemukan', 'NOT_FOUND');
  var jenis = pilihan_(p.jenis, ['rusak', 'susut', 'koreksi', 'retur'], 'Jenis penyesuaian');
  var qty = Number(p.qty);
  if (!isFinite(qty) || qty === 0) throw galat_('Jumlah penyesuaian tidak boleh 0', 'VALIDASI');
  qty = bulat3_(qty);
  if (jenis !== 'koreksi' && qty > 0) throw galat_('Rusak/susut/retur harus mengurangi stok', 'VALIDASI');
  var stok = stokPerProduk_()[pr.id_produk] || 0;
  if (stok + qty < -1e-9) throw galat_('Stok tidak boleh minus (sisa ' + bulat3_(stok) + ' ' + pr.satuan + ')', 'VALIDASI');
  var id = idBanyak_('Mutasi_Stok', 'id_mutasi', 'MS-', 8, 1)[0];
  tambah_('Mutasi_Stok', { id_mutasi: id, waktu: sekarang_(), id_produk: pr.id_produk, jenis: jenis, qty: qty, nilai_hpp: Math.round(qty * angka_(pr.hpp)), ref_tipe: 'penyesuaian', ref_id: id, catatan: String(p.catatan || '').trim(), dibuat_oleh: ctx.user.id_pengguna });
  catatLog_(ctx.user.id_pengguna, 'stok.sesuaikan', 'Mutasi_Stok', id, pr.nama + ' ' + qty + ' (' + jenis + ')', ctx.requestId);
  return { id: id };
}

function aksiModalSimpan_(ctx) {
  var p = ctx.payload;
  var jenis = pilihan_(p.jenis, ['awal', 'tambahan', 'penarikan'], 'Jenis modal');
  var jumlah = uangValid_(p.jumlah, 'Jumlah');
  if (jumlah <= 0) throw galat_('Jumlah harus lebih dari 0', 'VALIDASI');
  var tanggal = tanggalValid_(p.tanggal || sekarang_().slice(0, 10), 'Tanggal');
  var id = idBerikut_('Modal', 'id_modal', 'MOD-', 4);
  tambah_('Modal', { id_modal: id, tanggal: tanggal, jenis: jenis, jumlah: jumlah, keterangan: String(p.keterangan || '').trim(), status: 'sah', dibuat_oleh: ctx.user.id_pengguna });
  catatKas_({ arah: jenis === 'penarikan' ? 'keluar' : 'masuk', jumlah: jumlah, sumber: jenis === 'penarikan' ? 'penarikan_modal' : 'modal', ref_tipe: 'modal', ref_id: id, metode: 'tunai', keterangan: p.keterangan || jenis }, tanggal + ' 00:00:00');
  catatLog_(ctx.user.id_pengguna, 'modal.simpan', 'Modal', id, jenis + ' ' + jumlah, ctx.requestId);
  return { id: id };
}

function aksiPengeluaranSimpan_(ctx) {
  var p = ctx.payload;
  var jumlah = uangValid_(p.jumlah, 'Jumlah');
  if (jumlah <= 0) throw galat_('Jumlah harus lebih dari 0', 'VALIDASI');
  var tanggal = tanggalValid_(p.tanggal || sekarang_().slice(0, 10), 'Tanggal');
  var data = { kategori: pilihan_(p.kategori, ['Sewa', 'Listrik & Air', 'Gaji', 'Kemasan', 'Transportasi', 'Lain-lain'], 'Kategori'), keterangan: wajib_(p.keterangan, 'Keterangan'), metode: pilihan_(p.metode || 'tunai', ['tunai', 'transfer', 'qris'], 'Metode') };
  var id = idBerikut_('Pengeluaran', 'id_pengeluaran', 'EXP-', 4);
  tambah_('Pengeluaran', { id_pengeluaran: id, tanggal: tanggal, kategori: data.kategori, keterangan: data.keterangan, jumlah: jumlah, metode: data.metode, status: 'sah', dibuat_oleh: ctx.user.id_pengguna });
  catatKas_({ arah: 'keluar', jumlah: jumlah, sumber: 'pengeluaran', ref_tipe: 'pengeluaran', ref_id: id, metode: data.metode, keterangan: data.keterangan }, tanggal + ' 00:00:00');
  catatLog_(ctx.user.id_pengguna, 'pengeluaran.simpan', 'Pengeluaran', id, data.kategori + ' ' + jumlah, ctx.requestId);
  return { id: id };
}

/* =========================================================
 * Pembayaran & buku kas (selalu berpasangan, tepat satu baris kas per pembayaran)
 * ======================================================= */

function catatBayarMasuk_(daftar, ctx, waktu) {
  if (!daftar.length) return;
  var ids = idBanyak_('Pembayaran', 'id_pembayaran', 'BYR-', 8, daftar.length);
  tambahBanyak_('Pembayaran', daftar.map(function (b, i) { return { id_pembayaran: ids[i], waktu: waktu, arah: 'masuk', ref_tipe: b.ref_tipe, ref_id: b.ref_id, jenis: b.jenis, metode: b.metode, jumlah: b.jumlah, bukti_url: b.bukti || '', status: 'sah', dibuat_oleh: ctx.user.id_pengguna }; }));
  daftar.forEach(function (b, i) { catatKas_({ arah: 'masuk', jumlah: b.jumlah, sumber: b.sumber, ref_tipe: 'pembayaran', ref_id: ids[i], metode: b.metode, keterangan: b.ket }, waktu); });
}

function catatBayarKeluar_(b, ctx, waktu) {
  var id = idBanyak_('Pembayaran', 'id_pembayaran', 'BYR-', 8, 1)[0];
  tambah_('Pembayaran', { id_pembayaran: id, waktu: waktu, arah: 'keluar', ref_tipe: 'pembelian', ref_id: b.ref_id, jenis: b.jenis, metode: b.metode, jumlah: b.jumlah, bukti_url: '', status: 'sah', dibuat_oleh: ctx.user.id_pengguna });
  catatKas_({ arah: 'keluar', jumlah: b.jumlah, sumber: b.sumber, ref_tipe: 'pembayaran', ref_id: id, metode: b.metode, keterangan: b.ket }, waktu);
}

function catatKas_(k, waktu) {
  var ada = baca_('Kas_Mutasi').some(function (x) { return x.ref_tipe === k.ref_tipe && String(x.ref_id) === String(k.ref_id); });
  if (ada) return; // satu sumber = satu baris kas
  var id = idBanyak_('Kas_Mutasi', 'id_kas', 'KAS-', 8, 1)[0];
  tambah_('Kas_Mutasi', { id_kas: id, waktu: waktu, arah: k.arah, jumlah: k.jumlah, sumber: k.sumber, ref_tipe: k.ref_tipe, ref_id: k.ref_id, metode: k.metode, keterangan: String(k.keterangan || '') });
}

function totalBayar_(tipe, id) {
  return baca_('Pembayaran').filter(function (b) { return b.ref_tipe === tipe && String(b.ref_id) === String(id) && b.status !== 'batal'; })
    .reduce(function (s, b) { return s + angka_(b.jumlah); }, 0);
}

/* =========================================================
 * Utilitas tambahan
 * ======================================================= */

function gabungItems_(arr) {
  var m = {};
  (arr || []).forEach(function (it) {
    var id = String(it.id_produk || '');
    var q = Number(it.qty);
    if (!id || !isFinite(q) || q <= 0) throw galat_('Item keranjang tidak valid', 'VALIDASI');
    m[id] = bulat3_((m[id] || 0) + q);
  });
  return Object.keys(m).map(function (k) { return { id_produk: k, qty: m[k] }; });
}

function tambahBanyak_(nama, objs) {
  if (!objs.length) return;
  var sh = tab_(nama);
  var h = header_(sh);
  var rows = objs.map(function (o) { return h.map(function (k) { return o[k] === undefined ? '' : o[k]; }); });
  sh.getRange(sh.getLastRow() + 1, 1, rows.length, h.length).setValues(rows);
}

/** n ID berurutan, mis. MS-00000012..MS-00000014 */
function idBanyak_(nama, kolom, awalan, digit, n) {
  var mulai = parseInt(idBerikut_(nama, kolom, awalan, digit).slice(awalan.length), 10);
  var out = [];
  for (var i = 0; i < n; i++) { var a = String(mulai + i); while (a.length < digit) a = '0' + a; out.push(awalan + a); }
  return out;
}

/** ID berdasarkan tanggal hari ini, mis. TRX-20261019-007 */
function idHarian_(nama, kolom, awalan, digit) {
  var tgl = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyyMMdd');
  var awal = awalan + tgl + '-';
  var maks = 0;
  baca_(nama).forEach(function (r) { var s = String(r[kolom]); if (s.indexOf(awal) === 0) { var x = parseInt(s.slice(awal.length), 10); if (x > maks) maks = x; } });
  var a = String(maks + 1);
  while (a.length < digit) a = '0' + a;
  return awal + a;
}

function tgl_(v) { return String(v || '').slice(0, 10); }
function tanggalValid_(v, label) {
  var s = String(v || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw galat_(label + ' harus berformat YYYY-MM-DD', 'VALIDASI');
  return s;
}

/* =========================================================
 * PELUNASAN PIUTANG TEMPO & PEMBATALAN TRANSAKSI KASIR
 * ======================================================= */

function aksiPenjualanBayar_(ctx) {
  var id = wajib_(ctx.payload.id, 'Transaksi');
  var t = cariSatu_(baca_('Penjualan'), 'id_penjualan', id);
  if (!t) throw galat_('Transaksi tidak ditemukan', 'NOT_FOUND');
  if (t.status === 'batal') throw galat_('Transaksi sudah dibatalkan', 'VALIDASI');
  var sisa = angka_(t.total) - nilaiRetur_(id) - bayarBersih_('penjualan', id);
  var jumlah = uangValid_(ctx.payload.jumlah, 'Jumlah');
  if (jumlah <= 0 || jumlah > sisa) throw galat_(sisa <= 0 ? 'Transaksi ini tidak punya piutang' : 'Jumlah harus 1 sampai ' + sisa, 'VALIDASI');
  catatBayarMasuk_([{ ref_tipe: 'penjualan', ref_id: id, jenis: jumlah === sisa ? 'pelunasan' : 'cicilan', metode: pilihan_(ctx.payload.metode || 'tunai', ['tunai', 'transfer', 'qris'], 'Metode'), jumlah: jumlah,
    sumber: 'pelunasan_pelanggan', ket: 'Pelunasan piutang ' + id }], ctx, sekarang_());
  catatLog_(ctx.user.id_pengguna, 'penjualan.bayar', 'Penjualan', id, 'Pelunasan ' + jumlah + ', sisa ' + (sisa - jumlah), ctx.requestId);
  return { id: id, sisa: sisa - jumlah };
}

/** Batalkan transaksi kasir: baris tidak dihapus; stok dikembalikan dan uang yang sudah diterima dicatat sebagai pengembalian. */
function aksiPenjualanBatal_(ctx) {
  var id = wajib_(ctx.payload.id, 'Transaksi');
  var alasan = wajib_(ctx.payload.alasan, 'Alasan pembatalan');
  var t = cariSatu_(baca_('Penjualan'), 'id_penjualan', id);
  if (!t) throw galat_('Transaksi tidak ditemukan', 'NOT_FOUND');
  if (t.status === 'batal') return { id: id, sudah: true };
  var waktu = sekarang_();
  var sudahRetur = qtyRetur_(id);
  var det = baca_('Detail_Penjualan').filter(function (d) { return d.id_penjualan === id; })
    .map(function (d) { return { d: d, q: bulat3_(angka_(d.qty) - (sudahRetur[d.id_produk] || 0)) }; }).filter(function (x) { return x.q > 0; });
  var ids = idBanyak_('Mutasi_Stok', 'id_mutasi', 'MS-', 8, det.length);
  tambahBanyak_('Mutasi_Stok', det.map(function (x, i) { return { id_mutasi: ids[i], waktu: waktu, id_produk: x.d.id_produk, jenis: 'batal', qty: x.q, nilai_hpp: Math.round(x.q * angka_(x.d.hpp_satuan)), ref_tipe: 'penjualan', ref_id: id, catatan: 'Pembatalan: ' + alasan, dibuat_oleh: ctx.user.id_pengguna }; }));
  // Kembalikan uang bersih (setelah pengembalian retur sebelumnya), per metode agar buku kas per metode tetap benar
  var perMetode = {};
  baca_('Pembayaran').filter(function (b) { return b.ref_tipe === 'penjualan' && b.ref_id === id && b.status !== 'batal'; })
    .forEach(function (b) { perMetode[b.metode] = (perMetode[b.metode] || 0) + (b.arah === 'keluar' ? -1 : 1) * angka_(b.jumlah); });
  // Total yang dikembalikan tidak boleh melebihi uang bersih yang diterima
  var sisaKembali = Object.keys(perMetode).reduce(function (x, m) { return x + perMetode[m]; }, 0);
  Object.keys(perMetode).forEach(function (m) {
    var j = Math.min(perMetode[m], sisaKembali);
    if (j > 0) { catatRefund_({ ref_tipe: 'penjualan', ref_id: id, jumlah: j, metode: m, ket: 'Pengembalian uang ' + id + ' (dibatalkan)' }, ctx, waktu); sisaKembali -= j; }
  });
  ubah_('Penjualan', 'id_penjualan', id, { status: 'batal', dibatalkan_pada: waktu, alasan_batal: alasan });
  catatLog_(ctx.user.id_pengguna, 'penjualan.batal', 'Penjualan', id, alasan, ctx.requestId);
  return { id: id };
}

function catatRefund_(r, ctx, waktu) {
  var id = idBanyak_('Pembayaran', 'id_pembayaran', 'BYR-', 8, 1)[0];
  tambah_('Pembayaran', { id_pembayaran: id, waktu: waktu, arah: 'keluar', ref_tipe: r.ref_tipe, ref_id: r.ref_id, jenis: 'refund', metode: r.metode, jumlah: r.jumlah, bukti_url: '', status: 'sah', dibuat_oleh: ctx.user.id_pengguna });
  catatKas_({ arah: 'keluar', jumlah: r.jumlah, sumber: 'refund_pelanggan', ref_tipe: 'pembayaran', ref_id: id, metode: r.metode, keterangan: r.ket }, waktu);
}

/** Uang masuk dikurangi pengembalian untuk satu dokumen pelanggan. */
function bayarBersih_(tipe, id) {
  return baca_('Pembayaran').filter(function (b) { return b.ref_tipe === tipe && String(b.ref_id) === String(id) && b.status !== 'batal'; })
    .reduce(function (s, b) { return s + (b.arah === 'keluar' ? -1 : 1) * angka_(b.jumlah); }, 0);
}

/* =========================================================
 * RETUR SEBAGIAN TRANSAKSI KASIR
 * Nilai retur = qty × harga × (1 − diskon/subtotal), dibulatkan.
 * Mengurangi piutang lebih dulu; sisanya dikembalikan sebagai uang.
 * Barang layak jual kembali ke stok; barang rusak dicatat retur lalu rusak (stok bersih tetap).
 * ======================================================= */

function aksiPenjualanRetur_(ctx) {
  var p = ctx.payload;
  var id = wajib_(p.id, 'Transaksi');
  var alasan = wajib_(p.alasan, 'Alasan retur');
  var t = cariSatu_(baca_('Penjualan'), 'id_penjualan', id);
  if (!t) throw galat_('Transaksi tidak ditemukan', 'NOT_FOUND');
  if (t.status === 'batal') throw galat_('Transaksi sudah dibatalkan', 'VALIDASI');
  var kembaliStok = p.kembali_stok !== false;
  var det = baca_('Detail_Penjualan').filter(function (d) { return d.id_penjualan === id; });
  var sudah = qtyRetur_(id);
  var subtotal = angka_(t.subtotal), diskon = angka_(t.diskon);
  var faktor = subtotal > 0 ? (subtotal - diskon) / subtotal : 1;
  var baris = gabungItems_(p.items).map(function (it) {
    var d = cariSatu_(det, 'id_produk', it.id_produk);
    if (!d) throw galat_('Produk tidak ada di transaksi ini', 'VALIDASI');
    var sisa = bulat3_(angka_(d.qty) - (sudah[d.id_produk] || 0));
    if (it.qty > sisa + 1e-9) throw galat_('Jumlah retur melebihi sisa yang bisa diretur (' + sisa + ')', 'VALIDASI');
    return { d: d, qty: it.qty, nilai: Math.round(it.qty * angka_(d.harga) * faktor) };
  });
  if (!baris.length) throw galat_('Pilih item yang diretur', 'VALIDASI');
  var nilai = baris.reduce(function (s, b) { return s + b.nilai; }, 0);

  var piutang = Math.max(0, angka_(t.total) - nilaiRetur_(id) - bayarBersih_('penjualan', id));
  var kurangiPiutang = Math.min(nilai, piutang);
  var kembaliUang = nilai - kurangiPiutang;

  var waktu = sekarang_();
  var idR = idBanyak_('Retur', 'id_retur', 'RTR-', 6, baris.length);
  tambahBanyak_('Retur', baris.map(function (b, i) { return { id_retur: idR[i], waktu: waktu, id_penjualan: id, id_produk: b.d.id_produk, qty: b.qty, harga: angka_(b.d.harga), nilai: b.nilai, hpp_satuan: angka_(b.d.hpp_satuan), kembali_stok: kembaliStok ? 'TRUE' : 'FALSE', alasan: alasan, dibuat_oleh: ctx.user.id_pengguna }; }));
  var mutasi = [];
  baris.forEach(function (b) {
    mutasi.push({ waktu: waktu, id_produk: b.d.id_produk, jenis: 'retur', qty: b.qty, nilai_hpp: Math.round(b.qty * angka_(b.d.hpp_satuan)), ref_tipe: 'penjualan', ref_id: id, catatan: 'Retur: ' + alasan, dibuat_oleh: ctx.user.id_pengguna });
    if (!kembaliStok) mutasi.push({ waktu: waktu, id_produk: b.d.id_produk, jenis: 'rusak', qty: -b.qty, nilai_hpp: -Math.round(b.qty * angka_(b.d.hpp_satuan)), ref_tipe: 'penjualan', ref_id: id, catatan: 'Barang retur rusak: ' + alasan, dibuat_oleh: ctx.user.id_pengguna });
  });
  var idM = idBanyak_('Mutasi_Stok', 'id_mutasi', 'MS-', 8, mutasi.length);
  tambahBanyak_('Mutasi_Stok', mutasi.map(function (m, i) { m.id_mutasi = idM[i]; return m; }));
  if (kembaliUang > 0) {
    catatRefund_({ ref_tipe: 'penjualan', ref_id: id, jumlah: kembaliUang, metode: pilihan_(p.metode || 'tunai', ['tunai', 'transfer', 'qris'], 'Metode'), ket: 'Pengembalian uang retur ' + id }, ctx, waktu);
  }
  catatLog_(ctx.user.id_pengguna, 'penjualan.retur', 'Penjualan', id, 'Retur ' + nilai + ' (piutang -' + kurangiPiutang + ', uang kembali ' + kembaliUang + ')' + (kembaliStok ? '' : ' rusak'), ctx.requestId);
  return { id: id, nilai: nilai, kurangi_piutang: kurangiPiutang, kembali_uang: kembaliUang };
}

function qtyRetur_(idPenjualan) {
  var m = {};
  baca_('Retur').filter(function (r) { return r.id_penjualan === idPenjualan; }).forEach(function (r) { m[r.id_produk] = bulat3_((m[r.id_produk] || 0) + angka_(r.qty)); });
  return m;
}
function nilaiRetur_(idPenjualan) {
  return baca_('Retur').filter(function (r) { return r.id_penjualan === idPenjualan; }).reduce(function (s, r) { return s + angka_(r.nilai); }, 0);
}
