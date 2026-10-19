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

var API_VERSI = '1.0.0';
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

  'pengguna.list': { peran: ['pemilik'], fn: aksiPenggunaList_ },
  'pengguna.simpan': { peran: ['pemilik'], tulis: true, fn: aksiPenggunaSimpan_ },
  'pengguna.aturPin': { peran: ['pemilik'], tulis: true, fn: aksiPenggunaAturPin_ },

  'data.ringkasan': { peran: PENGELOLA, fn: aksiRingkasan_ },

  'produk.list': { peran: SEMUA, fn: aksiProdukList_ },
  'produk.simpan': { peran: PENGELOLA, tulis: true, fn: aksiProdukSimpan_ }
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
