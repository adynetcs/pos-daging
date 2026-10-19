import { useState } from 'react';
import { Store, Users, CreditCard, Hash, Percent, Boxes, ReceiptText, Check, Minus, Plug, type LucideIcon } from 'lucide-react';
import { useData, type Pengaturan as TPengaturan } from '@/context/DataContext';
import { useToast } from '@/context/ToastContext';
import { PageHeader, Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Toggle, Textarea, Select } from '@/components/ui/FormInput';
import { Badge } from '@/components/ui/StatusBadge';
import { ProductThumb } from '@/components/ui/ProductThumb';
import { StrukKertas } from './kasir/Struk';
import { USAHA, HARI_INI } from '@/data/dummy';
import { IS_DEMO } from '@/services/api';
import { PenggunaLive } from './pengaturan/PenggunaLive';
import { KoneksiLive } from './pengaturan/KoneksiLive';
import { qtySatuan, rupiah } from '@/utils/format';
import { targetDP } from '@/utils/calc';

type Bagian = 'profil' | 'pengguna' | 'bayar' | 'nomor' | 'dp' | 'stok' | 'struk' | 'koneksi';
const BAGIAN: { k: Bagian; label: string; ikon: LucideIcon }[] = [
  { k: 'profil', label: 'Profil usaha', ikon: Store },
  { k: 'pengguna', label: 'Pengguna & hak akses', ikon: Users },
  { k: 'bayar', label: 'Metode pembayaran', ikon: CreditCard },
  { k: 'nomor', label: 'Format nomor', ikon: Hash },
  { k: 'dp', label: 'DP pesanan partai', ikon: Percent },
  { k: 'stok', label: 'Stok minimum', ikon: Boxes },
  { k: 'struk', label: 'Preferensi struk', ikon: ReceiptText },
  { k: 'koneksi', label: 'Koneksi data', ikon: Plug },
];

const PENGGUNA = [
  { nama: 'Ady', email: 'ady@contoh.id', peran: 'Pemilik', aktif: true },
  { nama: 'Rina', email: 'rina@contoh.id', peran: 'Admin', aktif: true },
  { nama: 'Dimas', email: '-', peran: 'Kasir', aktif: true },
  { nama: 'Yusuf', email: '-', peran: 'Kasir', aktif: false },
];
const AKSES: [string, boolean, boolean, boolean][] = [
  ['Kasir & penjualan', true, true, true],
  ['Pesanan partai', true, true, true],
  ['Produk (lihat)', true, true, true],
  ['Produk (tambah & ubah harga)', true, true, false],
  ['Stok', true, true, true],
  ['Pelanggan', true, true, true],
  ['Pembelian & supplier', true, true, false],
  ['Dashboard', true, true, false],
  ['Keuangan & laporan', true, false, false],
  ['Pengaturan & pengguna', true, false, false],
];

export default function Pengaturan() {
  const { pengaturan, setPengaturan, produk, simpanProduk, transaksi } = useData();
  const toast = useToast();
  const [b, setB] = useState<Bagian>('profil');
  const [f, setF] = useState<TPengaturan>(pengaturan);
  const [usaha, setUsaha] = useState(USAHA);
  const simpan = () => { setPengaturan(f); toast({ jenis: 'sukses', judul: 'Pengaturan disimpan (demo)', pesan: 'Berlaku sampai halaman dimuat ulang.' }); };
  const set = <K extends keyof TPengaturan>(k: K, v: TPengaturan[K]) => setF((x) => ({ ...x, [k]: v }));
  const contohTrx = transaksi[transaksi.length - 1];

  return (
    <>
      <PageHeader judul="Pengaturan" sub="Konfigurasi toko, pengguna, dan aturan transaksi." aksi={<Button ikon={<Check className="h-4 w-4" />} onClick={simpan}>Simpan perubahan</Button>} />
      <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <nav aria-label="Bagian pengaturan" className="no-scrollbar -mx-3 flex gap-2 overflow-x-auto px-3 sm:-mx-4 sm:px-4 lg:mx-0 lg:block lg:space-y-1 lg:px-0">
          {BAGIAN.map((x) => (
            <button key={x.k} onClick={() => setB(x.k)} aria-current={b === x.k ? 'page' : undefined}
              className={`flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold lg:w-full ${b === x.k ? 'bg-white text-brand-800 shadow-card ring-1 ring-brand-200' : 'text-gray-600 hover:bg-white'}`}>
              <x.ikon className="h-4 w-4" />{x.label}
            </button>
          ))}
        </nav>

        <div className="min-w-0">
          {b === 'profil' && (
            <Card>
              <CardHeader judul="Profil usaha & informasi toko" sub="Tampil di struk dan laporan" />
              <div className="grid gap-4 px-5 pb-5 sm:grid-cols-2">
                <Input label="Nama usaha" value={usaha.nama} onChange={(e) => setUsaha({ ...usaha, nama: e.target.value })} />
                <Input label="Telepon / WhatsApp" value={usaha.telepon} onChange={(e) => setUsaha({ ...usaha, telepon: e.target.value })} />
                <div className="sm:col-span-2"><Input label="Alamat toko" value={usaha.alamat} onChange={(e) => setUsaha({ ...usaha, alamat: e.target.value })} /></div>
                <Input label="Slogan" value={usaha.tagline} onChange={(e) => setUsaha({ ...usaha, tagline: e.target.value })} />
                <Input label="NPWP (opsional)" value={usaha.npwp} onChange={(e) => setUsaha({ ...usaha, npwp: e.target.value })} />
                <Select label="Jam operasional" opsi={[{ nilai: '1', label: '06.00 – 15.00 WIB' }, { nilai: '2', label: '05.00 – 12.00 WIB' }, { nilai: '3', label: '24 jam' }]} />
                <Select label="Zona waktu" opsi={[{ nilai: 'wib', label: 'WIB (UTC+7)' }, { nilai: 'wita', label: 'WITA (UTC+8)' }, { nilai: 'wit', label: 'WIT (UTC+9)' }]} />
              </div>
            </Card>
          )}

          {b === 'pengguna' && (
            <div className="space-y-4">
              {!IS_DEMO ? <PenggunaLive /> : <Card className="overflow-hidden">
                <CardHeader judul="Pengguna" aksi={<Button ukur="sm" varian="garis" onClick={() => toast({ jenis: 'info', judul: 'Fitur demo', pesan: 'Undangan pengguna aktif setelah sistem login terhubung.' })}>Undang pengguna</Button>} />
                <ul className="divide-y divide-gray-100 border-t border-gray-100">
                  {PENGGUNA.map((u) => (
                    <li key={u.nama} className="flex items-center gap-3 px-5 py-3">
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-50 text-sm font-bold text-brand-800">{u.nama[0]}</span>
                      <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{u.nama}</p><p className="text-xs text-gray-500">{u.email}</p></div>
                      <Badge nada={u.peran === 'Pemilik' ? 'brand' : u.peran === 'Admin' ? 'biru' : 'abu'} titik={false}>{u.peran}</Badge>
                      {!u.aktif && <Badge nada="abu">Nonaktif</Badge>}
                    </li>
                  ))}
                </ul>
              </Card>}
              <Card className="overflow-hidden">
                <CardHeader judul="Hak akses per peran" />
                <div className="overflow-x-auto border-t border-gray-100">
                  <table className="w-full min-w-[440px]">
                    <thead className="bg-gray-50/70"><tr><th className="th">Menu</th><th className="th text-center">Pemilik</th><th className="th text-center">Admin</th><th className="th text-center">Kasir</th></tr></thead>
                    <tbody className="divide-y divide-gray-100">
                      {AKSES.map(([m, ...r]) => (
                        <tr key={m}><td className="td font-medium">{m}</td>{r.map((v, i) => <td key={i} className="td text-center">{v ? <Check className="mx-auto h-4 w-4 text-emerald-600" aria-label="Boleh" /> : <Minus className="mx-auto h-4 w-4 text-gray-300" aria-label="Tidak" />}</td>)}</tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {b === 'bayar' && (
            <Card>
              <CardHeader judul="Metode pembayaran" sub="Yang aktif akan tampil di kasir" />
              <div className="divide-y divide-gray-100 px-5 pb-3">
                <Toggle label="Tunai" keterangan="Dengan hitung kembalian otomatis" checked={f.metodeAktif.tunai} onChange={(v) => set('metodeAktif', { ...f.metodeAktif, tunai: v })} />
                <Toggle label="QRIS" keterangan="Konfirmasi manual oleh kasir" checked={f.metodeAktif.qris} onChange={(v) => set('metodeAktif', { ...f.metodeAktif, qris: v })} />
                <Toggle label="Transfer bank" keterangan="BCA 123-456-7890 (contoh)" checked={f.metodeAktif.transfer} onChange={(v) => set('metodeAktif', { ...f.metodeAktif, transfer: v })} />
                <Toggle label="Tempo (piutang)" keterangan="Hanya untuk pelanggan terdaftar" checked={f.metodeAktif.tempo} onChange={(v) => set('metodeAktif', { ...f.metodeAktif, tempo: v })} />
              </div>
            </Card>
          )}

          {b === 'nomor' && (
            <Card>
              <CardHeader judul="Format nomor transaksi" sub="{YYYYMMDD} tanggal, {NNN} nomor urut harian" />
              <div className="grid gap-4 px-5 pb-5 sm:grid-cols-2">
                <Input label="Transaksi kasir" value={f.formatNoTransaksi} onChange={(e) => set('formatNoTransaksi', e.target.value)} bantuan={`Contoh: ${f.formatNoTransaksi.replace('{YYYYMMDD}', HARI_INI.replace(/-/g, '')).replace('{NNN}', '021')}`} />
                <Input label="Pesanan partai" value={f.formatNoPesanan} onChange={(e) => set('formatNoPesanan', e.target.value)} bantuan={`Contoh: ${f.formatNoPesanan.replace('{YYYYMMDD}', HARI_INI.replace(/-/g, '')).replace('{NN}', '03')}`} />
              </div>
            </Card>
          )}

          {b === 'dp' && (
            <Card>
              <CardHeader judul="DP pesanan partai" sub="Persentase uang muka dari total pesanan" />
              <div className="px-5 pb-5">
                <div className="flex items-center gap-4">
                  <input type="range" min={10} max={100} step={5} value={f.dpPersen} onChange={(e) => set('dpPersen', Number(e.target.value))} className="flex-1 accent-brand-700" aria-label="Persentase DP" />
                  <span className="num w-16 text-right text-2xl font-extrabold">{f.dpPersen}%</span>
                </div>
                <div className="mt-4 rounded-xl bg-gray-50 p-4 text-sm">
                  <p className="font-semibold">Contoh pesanan {rupiah(10_000_000)}</p>
                  <p className="mt-1 text-gray-600">DP {rupiah(targetDP(10_000_000, f.dpPersen / 100))}, pelunasan {rupiah(10_000_000 - targetDP(10_000_000, f.dpPersen / 100))} saat kirim. DP dibulatkan ke atas per Rp1.000.</p>
                </div>
                <p className="mt-3 text-xs text-gray-500">DP tetap bagian dari total pesanan. Pesanan sebaiknya baru diproses setelah DP terpenuhi.</p>
              </div>
            </Card>
          )}

          {b === 'stok' && (
            <Card className="overflow-hidden">
              <CardHeader judul="Stok minimum per produk" sub="Produk di bawah angka ini ditandai menipis" />
              <ul className="divide-y divide-gray-100 border-t border-gray-100">
                {produk.filter((p) => p.aktif).map((p) => (
                  <li key={p.id} className="flex items-center gap-3 px-5 py-2.5">
                    <ProductThumb produk={p} ukuran="sm" />
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{p.nama}</p><p className="text-xs text-gray-500">Stok saat ini {qtySatuan(p.stok, p.satuan)}</p></div>
                    <label className="relative w-28"><span className="sr-only">Stok minimum {p.nama}</span>
                      <input inputMode="decimal" defaultValue={String(p.stokMinimum).replace('.', ',')} onBlur={(e) => { const v = parseFloat(e.target.value.replace(',', '.')); if (v >= 0 && v !== p.stokMinimum) { simpanProduk({ ...p, stokMinimum: v }); toast({ jenis: 'sukses', judul: 'Stok minimum diperbarui (demo)', pesan: `${p.nama}: ${qtySatuan(v, p.satuan)}` }); } }}
                        className="input num pr-10 text-right" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">{p.satuan}</span></label>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {b === 'struk' && (
            <div className="grid gap-4 xl:grid-cols-2">
              <Card>
                <CardHeader judul="Preferensi struk" />
                <div className="space-y-4 px-5 pb-5">
                  <Select label="Lebar kertas" value={f.strukLebar} onChange={(e) => set('strukLebar', e.target.value as '58mm' | '80mm')} opsi={[{ nilai: '58mm', label: 'Thermal 58 mm' }, { nilai: '80mm', label: 'Thermal 80 mm' }]} />
                  <Toggle label="Tampilkan logo" checked={f.tampilLogoStruk} onChange={(v) => set('tampilLogoStruk', v)} />
                  <Textarea label="Catatan kaki struk" value={f.strukFooter} onChange={(e) => set('strukFooter', e.target.value)} />
                  <p className="text-xs text-gray-500">Pratinjau di samping diperbarui setelah menekan Simpan perubahan.</p>
                </div>
              </Card>
              <Card className="bg-gray-100 p-5">{contohTrx && <StrukKertas trx={contohTrx} />}</Card>
            </div>
          )}

          {b === 'koneksi' && !IS_DEMO && <KoneksiLive />}
          {b === 'koneksi' && IS_DEMO && (
            <Card>
              <CardHeader judul="Koneksi data" sub="Google Sheets melalui Google Apps Script" />
              <div className="space-y-3 px-5 pb-5 text-sm">
                <div className="flex items-center justify-between rounded-xl border border-gray-200 p-4">
                  <div><p className="font-semibold">Status</p><p className="text-gray-500">Belum terhubung. Aplikasi memakai data contoh di memori browser.</p></div>
                  <Badge nada="kuning">Mode demo</Badge>
                </div>
                <p className="text-gray-600">Untuk menghubungkan, isi <code className="rounded bg-gray-100 px-1">VITE_DATA_MODE=api</code> beserta <code className="rounded bg-gray-100 px-1">GAS_URL</code>, <code className="rounded bg-gray-100 px-1">GAS_SECRET</code>, dan <code className="rounded bg-gray-100 px-1">SESSION_SECRET</code> di Vercel → Settings → Environment Variables, lalu deploy ulang.</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
