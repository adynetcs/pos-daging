# POS Daging — Mockup UI/UX

Mockup aplikasi manajemen usaha daging (eceran + pesanan partai): kasir, pesanan partai dengan DP 70%,
stok, pembelian, pelanggan, supplier, keuangan, laporan, dan pengaturan.

> **Status: MODE DEMO.** Semua data adalah data contoh di memori browser. Tidak ada yang tersimpan ke
> database, dan perubahan hilang saat halaman dimuat ulang.

## Menjalankan (Windows / VS Code)

Butuh Node.js 18 atau lebih baru.

```bash
npm install
npm run dev      # buka http://localhost:5173
npm run build    # cek tipe (tsc) + build produksi ke folder dist/
npm run preview  # coba hasil build
```

## Stack

React 18, TypeScript (strict), Tailwind CSS v3, Vite 5, lucide-react. Grafik dibuat dengan SVG sendiri
(tanpa library chart). Navigasi memakai hash (`#/kasir`) sehingga aman untuk hosting statis.

## Struktur folder

```
src/
  types/index.ts          Tipe data (Produk, Pesanan, Pembelian, BarisKas, dst.)
  data/dummy.ts           SATU-SATUNYA sumber data contoh (ganti dengan API nanti)
  utils/format.ts         Format Rupiah, tanggal Indonesia, berat kg/gram
  utils/calc.ts           Perhitungan berbasis berat (presisi gram), target DP
  utils/finance.ts        Semua angka turunan: omzet, HPP, laba, buku kas, piutang, utang, rekonsiliasi
  services/api.ts         Lapisan service Google Apps Script (belum aktif)
  context/                DataContext (store lokal), ToastContext, NavContext (router hash)
  hooks/useRingkasan.ts   Ringkasan bersama untuk Dashboard
  components/layout/      Sidebar, Header, MobileNav, AppLayout
  components/ui/          Button, Card, StatCard, DataTable, SearchInput, FilterBar/Tabs, StatusBadge,
                          Modal, ConfirmDialog, FormInput, DatePicker, Pagination, States (Empty/Loading/Demo),
                          ProductThumb
  components/charts/      AreaChart, DonutChart, BarChart, ProgressBar
  pages/                  11 halaman + subkomponen (kasir/, pesanan/)
```

Menambah halaman baru: buat file di `src/pages`, daftarkan di `components/layout/menu.ts`,
`types/index.ts` (PageKey), `context/NavContext.tsx`, dan peta `HALAMAN` di `App.tsx`.

## Aturan pencatatan keuangan

Diterapkan di `utils/finance.ts`:

- Modal masuk bukan omzet; penarikan modal (prive) bukan beban.
- Omzet eceran diakui saat transaksi kasir; omzet pesanan partai diakui saat pesanan **selesai**.
- DP pelanggan sebelum pesanan selesai = uang muka (titipan), bukan pendapatan tambahan.
- Pembelian stok masuk ke persediaan; hanya barang terjual yang menjadi HPP.
- DP ke supplier = uang muka pembelian (aset). Utang supplier baru timbul setelah barang diterima.
- Buku kas dibentuk dari setiap pembayaran satu kali saja (tidak ada pencatatan ganda).
- Halaman Keuangan menampilkan rekonsiliasi: saldo kas = modal bersih + laba bersih + DP pelanggan
  + utang supplier − piutang − uang muka supplier − persediaan. Dengan data contoh selisihnya Rp0.

## Integrasi Google Apps Script (tahap berikutnya)

1. Salin `.env.example` menjadi `.env.local` (jangan di-commit), isi:
   ```
   VITE_DATA_MODE=gas
   VITE_GAS_URL=https://script.google.com/macros/s/XXXX/exec
   ```
   Di Vercel, isi variabel yang sama lewat dashboard.
2. Di GAS, buat `doPost(e)` yang membaca `JSON.parse(e.postData.contents)` → `{ action, payload }` dan
   mengembalikan `{ ok, data, error }`. Nama action sudah disiapkan di `src/services/api.ts`
   (`produk.list`, `transaksi.simpan`, `pesanan.status`, dst.).
3. Request POST memakai `Content-Type: text/plain` agar tidak memicu CORS preflight.
4. Ganti pemakaian `useState(D.xxxAwal)` di `DataContext.tsx` dengan pemuatan dari `api.*`.
5. Jangan menaruh kredensial rahasia di frontend; lakukan otorisasi di sisi GAS.

## Yang masih demo

- Data tidak tersimpan (memori browser saja).
- Foto produk berupa ilustrasi SVG; unggah foto dan bukti pembayaran hanya mencatat nama berkas.
- Cetak PDF memakai dialog cetak browser. Ekspor CSV sudah berfungsi saat dijalankan lokal.
- Pengguna & hak akses, undangan pengguna: tampilan saja, belum ada login.
- Nomor rekening dan QRIS adalah contoh.

## Deploy ke Vercel

Framework preset: Vite. Build command `npm run build`, output `dist`. `vercel.json` sudah berisi rewrite SPA.

## Tahap 5 — Koneksi ke Google Sheets (sudah tersedia)

Arsitektur: **Browser → Vercel `/api` → Google Apps Script → Google Sheets.**
Browser tidak pernah mengetahui URL Apps Script maupun kunci rahasia.

```
api/
  health.ts          GET  cek konfigurasi + koneksi
  auth/login.ts      POST username (atau email) + PIN → cookie sesi HttpOnly (12 jam)
  auth/logout.ts     POST
  auth/me.ts         GET  pengguna yang sedang login
  rpc.ts             POST satu pintu untuk aksi data (daftar aksi di-whitelist)
  _lib/              pemanggil GAS, sesi HMAC, helper (tidak menjadi route)
gas/
  Setup.gs           membuat/memperbarui struktur 18 tab
  Api.gs             doPost: validasi API_SECRET, peran, payload, kunci tulis, log aktivitas
```

Environment Variables di Vercel (Settings → Environment Variables):

| Nama | Isi | Rahasia? |
|---|---|---|
| `VITE_DATA_MODE` | `api` | Tidak |
| `GAS_URL` | URL Web App Apps Script (`.../exec`) | Ya |
| `GAS_SECRET` | Kunci acak, sama dengan `API_SECRET` di Script Properties | Ya |
| `SESSION_SECRET` | Kunci acak lain, hanya di Vercel | Ya |

Buat kunci acak di terminal: `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`

Keamanan yang diterapkan: PIN di-hash (salt per pengguna + pepper rahasia), akun terkunci 15 menit setelah 5 PIN salah,
pesan gagal login tidak membedakan email/PIN, identitas pengguna diambil dari cookie bertanda tangan (bukan dari body),
peran diperiksa ulang di Apps Script untuk setiap aksi, penulisan memakai LockService, setiap perubahan dicatat di Log_Aktivitas.

Yang sudah memakai data asli di mode `api`: login, pengguna & PIN, master produk, status koneksi.
Modul lain (kasir, pesanan, stok, pembelian, keuangan) masih data contoh sampai Tahap 6.

Keterbatasan Google Sheets: penulisan diproses satu per satu (antre lewat LockService) dan tiap permintaan butuh 1–3 detik.
Cocok untuk 1 toko dengan beberapa kasir. Jika transaksi ramai bersamaan atau data sudah puluhan ribu baris,
pindahkan penyimpanan ke database (mis. PostgreSQL) cukup dengan mengganti isi `api/_lib/gas.ts`; frontend tidak berubah.
