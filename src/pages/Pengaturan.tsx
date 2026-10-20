import { useEffect, useState } from 'react';
import { Store, Users, CreditCard, Hash, Percent, Boxes, ReceiptText, Check, Minus, Plug, type LucideIcon } from 'lucide-react';
import { useData, pesanGalat, type Pengaturan as TPengaturan } from '@/context/DataContext';
import { useToast } from '@/context/ToastContext';
import { PageHeader, Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Toggle, Textarea, Select } from '@/components/ui/FormInput';
import { ProductThumb } from '@/components/ui/ProductThumb';
import { StrukKertas } from './kasir/Struk';
import { hariIni } from '@/utils/waktu';
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
  const { pengaturan, simpanPengaturan, produk, simpanProduk, transaksi } = useData();
  const toast = useToast();
  const [b, setB] = useState<Bagian>('profil');
  const [f, setF] = useState<TPengaturan>(pengaturan);
  const [proses, setProses] = useState(false);
  useEffect(() => setF(pengaturan), [pengaturan]);
  const berubah = JSON.stringify(f) !== JSON.stringify(pengaturan);
  const simpan = async () => {
    setProses(true);
    try {
      await simpanPengaturan({
        nama_usaha: f.namaUsaha, tagline: f.tagline, alamat_usaha: f.alamat, telepon_usaha: f.telepon, npwp: f.npwp,
        rekening_transfer: f.rekening, dp_persen: String(f.dpPersen),
        struk_lebar: f.strukLebar, struk_footer: f.strukFooter, struk_logo: f.tampilLogoStruk ? 'TRUE' : 'FALSE',
        metode_tunai: f.metodeAktif.tunai ? 'TRUE' : 'FALSE', metode_qris: f.metodeAktif.qris ? 'TRUE' : 'FALSE',
        metode_transfer: f.metodeAktif.transfer ? 'TRUE' : 'FALSE', metode_tempo: f.metodeAktif.tempo ? 'TRUE' : 'FALSE',
      });
      toast({ jenis: 'sukses', judul: 'Pengaturan tersimpan', pesan: 'Tersimpan di Google Sheets dan berlaku untuk semua perangkat.' });
    } catch (e) {
      toast({ jenis: 'gagal', judul: 'Pengaturan belum tersimpan', pesan: pesanGalat(e) });
    } finally { setProses(false); }
  };
  const set = <K extends keyof TPengaturan>(k: K, v: TPengaturan[K]) => setF((x) => ({ ...x, [k]: v }));
  const contohTrx = transaksi[transaksi.length - 1];

  return (
    <>
      <PageHeader judul="Pengaturan" sub="Konfigurasi toko, pengguna, dan aturan transaksi." aksi={['pengguna', 'stok', 'koneksi'].includes(b) ? undefined : <Button ikon={<Check className="h-4 w-4" />} disabled={!berubah || proses} onClick={() => void simpan()}>{proses ? 'Menyimpan…' : berubah ? 'Simpan perubahan' : 'Tersimpan'}</Button>} />
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
                <Input label="Nama usaha" value={f.namaUsaha} onChange={(e) => set('namaUsaha', e.target.value)} />
                <Input label="Telepon / WhatsApp" type="tel" value={f.telepon} onChange={(e) => set('telepon', e.target.value)} />
                <div className="sm:col-span-2"><Input label="Alamat toko" value={f.alamat} onChange={(e) => set('alamat', e.target.value)} /></div>
                <Input label="Slogan" value={f.tagline} onChange={(e) => set('tagline', e.target.value)} />
                <Input label="NPWP (opsional)" value={f.npwp} onChange={(e) => set('npwp', e.target.value)} />
                <p className="text-xs text-gray-500 sm:col-span-2">Semua waktu transaksi memakai WIB (Asia/Jakarta).</p>
              </div>
            </Card>
          )}

          {b === 'pengguna' && (
            <div className="space-y-4">
              <PenggunaLive />
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
                <Toggle label="Transfer bank" keterangan={f.rekening || 'Isi rekening di bawah'} checked={f.metodeAktif.transfer} onChange={(v) => set('metodeAktif', { ...f.metodeAktif, transfer: v })} />
                <Toggle label="Tempo (piutang)" keterangan="Hanya untuk pelanggan terdaftar" checked={f.metodeAktif.tempo} onChange={(v) => set('metodeAktif', { ...f.metodeAktif, tempo: v })} />
                <div className="py-3"><Input label="Rekening tujuan transfer" value={f.rekening} onChange={(e) => set('rekening', e.target.value)} placeholder="mis. BCA 1234567890 a.n. Steak Hook Premium" bantuan="Ditampilkan ke kasir saat pelanggan memilih transfer." /></div>
              </div>
            </Card>
          )}

          {b === 'nomor' && (
            <Card>
              <CardHeader judul="Format nomor transaksi" sub="Dibuat otomatis oleh server, berurutan per hari" />
              <dl className="grid gap-3 px-5 pb-5 text-sm sm:grid-cols-3">
                {[['Transaksi kasir', `TRX-${hariIni().replace(/-/g, '')}-001`], ['Pesanan partai', `PP-${hariIni().replace(/-/g, '')}-01`], ['Pembelian', `PB-${hariIni().replace(/-/g, '')}-01`]].map(([a, c]) => (
                  <div key={a} className="rounded-xl bg-gray-50 p-3"><dt className="text-xs text-gray-500">{a}</dt><dd className="num mt-0.5 font-semibold">{c}</dd></div>
                ))}
              </dl>
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
                      <input inputMode="decimal" defaultValue={String(p.stokMinimum).replace('.', ',')} onBlur={async (e) => { const v = parseFloat(e.target.value.replace(',', '.')); if (v >= 0 && v !== p.stokMinimum) { try { await simpanProduk({ ...p, stokMinimum: v }, false); toast({ jenis: 'sukses', judul: 'Stok minimum tersimpan', pesan: `${p.nama}: ${qtySatuan(v, p.satuan)}` }); } catch (err) { toast({ jenis: 'gagal', judul: 'Stok minimum belum tersimpan', pesan: pesanGalat(err) }); e.target.value = String(p.stokMinimum).replace('.', ','); } } }}
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
                  <p className="text-xs text-gray-500">Pratinjau diperbarui setelah menekan Simpan perubahan.</p>
                </div>
              </Card>
              <Card className="bg-gray-100 p-5">{contohTrx ? <StrukKertas trx={contohTrx} /> : <p className="text-center text-sm text-gray-500">Pratinjau tampil setelah ada transaksi kasir pertama.</p>}</Card>
            </div>
          )}

          {b === 'koneksi' && <KoneksiLive />}
        </div>
      </div>
    </>
  );
}
