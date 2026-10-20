import { ShoppingBag, ClipboardList, AlertTriangle, HandCoins, Wallet, ArrowUpRight, ArrowDownRight, Plus, ShoppingCart } from 'lucide-react';
import { useData, useLookup } from '@/context/DataContext';
import { useNav } from '@/context/NavContext';
import { useRingkasan } from '@/hooks/useRingkasan';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader, PageHeader } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { AreaChart, DonutChart, ProgressBar } from '@/components/charts/Charts';
import { StatusPesananBadge, Badge } from '@/components/ui/StatusBadge';
import { ProductThumb, LABEL_KATEGORI, WARNA_KATEGORI } from '@/components/ui/ProductThumb';
import { Button } from '@/components/ui/Button';
import { Catatan } from '@/components/ui/States';
import { rupiah, persen, qtySatuan, tanggalLabel, tanggalPendek, jam, namaHari } from '@/utils/format';
import { dpPesanan, rekonsiliasiKas, totalPesanan, totalTrx } from '@/utils/finance';
import { hariIni } from '@/utils/waktu';
import type { Kategori } from '@/types';

export default function Dashboard() {
  const d = useData();
  const cari = useLookup();
  const { buka } = useNav();
  const r = useRingkasan();
  const { pengguna } = useAuth();
  const rek = rekonsiliasiKas(d);
  const HARI_INI = hariIni();

  const pesananTerbaru = [...d.pesanan].sort((a, b) => b.id.localeCompare(a.id)).slice(0, 5);
  const trxTerbaru = [...d.transaksi].sort((a, b) => b.tanggal.localeCompare(a.tanggal)).slice(0, 6);
  const naik = r.perubahan >= 0;

  return (
    <>
      <PageHeader
        judul={`Selamat datang, ${pengguna!.nama}`}
        sub={<>Ringkasan usaha untuk {namaHari(HARI_INI)}, {tanggalPendek(HARI_INI)}.</>}
        aksi={<>
          <Button varian="garis" ikon={<Plus className="h-4 w-4" />} onClick={() => buka('pesanan')}>Pesanan partai</Button>
          <Button ikon={<ShoppingCart className="h-4 w-4" />} onClick={() => buka('kasir')}>Buka kasir</Button>
        </>}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6">
        <StatCard label="Omzet hari ini" nilai={rupiah(r.omzetHariIni)} ikon={ShoppingBag}
          keterangan={<span className={`inline-flex flex-wrap items-center font-semibold ${naik ? 'text-emerald-600' : 'text-red-600'}`}>
            {naik ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}{persen(Math.abs(r.perubahan))}<span className="ml-1 font-normal text-gray-500">dari kemarin</span></span>} />
        <StatCard label="Transaksi" nilai={`${r.trxHariIni}`} ikon={ShoppingCart} warna="abu" keterangan="hari ini" onClick={() => buka('kasir')} />
        <StatCard label="Pesanan aktif" nilai={`${r.pesananAktif.length} pesanan`} ikon={ClipboardList} warna="biru"
          keterangan={`${r.pesananAktif.filter((p) => p.status === 'menunggu_dp').length} menunggu DP`} onClick={() => buka('pesanan')} />
        <StatCard label="Stok menipis" nilai={`${r.stokMenipis.length} produk`} ikon={AlertTriangle} warna="merah" keterangan="perlu restock" onClick={() => buka('stok')} />
        <StatCard label="Piutang pelanggan" nilai={rupiah(r.piutang.total)} ikon={HandCoins} warna="kuning" keterangan={`${r.piutang.jumlahPelanggan} pelanggan`} onClick={() => buka('keuangan')} />
        <StatCard label="Kas tersedia" nilai={rupiah(r.saldoKas)} ikon={Wallet} warna="hijau" keterangan="bukan laba" onClick={() => buka('keuangan')} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader judul="Penjualan 7 hari terakhir" sub="Omzet eceran + pesanan partai yang selesai" aksi={<Badge nada="abu" titik={false}>{rupiah(r.harian.reduce((s, h) => s + h.nilai, 0))}</Badge>} />
          <div className="px-3 pb-4">
            <AreaChart data={r.harian.map((h) => ({ label: tanggalLabel(h.tanggal), nilai: h.nilai, sub: `${namaHari(h.tanggal)}, ${tanggalLabel(h.tanggal)} (${h.transaksi} transaksi)` }))} />
          </div>
        </Card>

        <Card>
          <CardHeader judul="Penjualan per kategori" sub="7 hari terakhir" />
          <div className="flex flex-col items-center gap-5 px-5 pb-5 sm:flex-row xl:flex-col 2xl:flex-row">
            <div className="h-40 w-40 shrink-0">
              <DonutChart tengah={persen(r.kategori.data[0]?.porsi ?? 0)} subTengah={LABEL_KATEGORI[(r.kategori.data[0]?.kategori ?? 'sapi') as Kategori]}
                data={r.kategori.data.map((k) => ({ label: k.kategori, nilai: k.nilai, warna: WARNA_KATEGORI[k.kategori] }))} />
            </div>
            <ul className="w-full space-y-3">
              {r.kategori.data.map((k) => (
                <li key={k.kategori}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-gray-700"><span className="h-2.5 w-2.5 rounded-full" style={{ background: WARNA_KATEGORI[k.kategori] }} />{LABEL_KATEGORI[k.kategori as Kategori]}</span>
                    <span className="num font-semibold">{persen(k.porsi)}</span>
                  </div>
                  <p className="num mt-0.5 pl-[18px] text-xs text-gray-500">{rupiah(k.nilai)}</p>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 2xl:grid-cols-5">
        <Card className="2xl:col-span-2">
          <CardHeader judul="Stok menipis" sub="Di bawah stok minimum" aksi={<button onClick={() => buka('stok')} className="text-sm font-semibold text-brand-700 hover:underline">Lihat stok</button>} />
          <ul className="divide-y divide-gray-100 border-t border-gray-100">
            {r.stokMenipis.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-5 py-3">
                <ProductThumb produk={p} ukuran="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-800">{p.nama}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <ProgressBar nilai={p.stok / p.stokMinimum} warna="bg-red-500" />
                    <span className="num shrink-0 text-xs text-gray-500">min {qtySatuan(p.stokMinimum, p.satuan)}</span>
                  </div>
                </div>
                <span className="num text-right text-sm font-bold text-red-600">{qtySatuan(p.stok, p.satuan)}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="2xl:col-span-3">
          <CardHeader judul="Pesanan partai terbaru" sub="DP 70% adalah target uang muka, bagian dari nilai pesanan" aksi={<button onClick={() => buka('pesanan')} className="text-sm font-semibold text-brand-700 hover:underline">Lihat semua</button>} />
          <div className="overflow-x-auto border-t border-gray-100">
            <table className="w-full min-w-[560px]">
              <thead className="bg-gray-50/70"><tr><th className="th">No. pesanan</th><th className="th">Pelanggan</th><th className="th text-right">Total</th><th className="th text-right">DP {d.pengaturan.dpPersen}%</th><th className="th">Status</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {pesananTerbaru.map((p) => (
                  <tr key={p.id} className="cursor-pointer hover:bg-gray-50" onClick={() => buka('pesanan')}>
                    <td className="td font-medium text-gray-900">{p.id}</td>
                    <td className="td"><span className="block max-w-[160px] truncate">{cari.pelanggan(p.pelangganId)?.nama}</span></td>
                    <td className="td num text-right">{rupiah(totalPesanan(p))}</td>
                    <td className="td num text-right text-gray-500">{rupiah(dpPesanan(p, d.pengaturan.dpPersen / 100))}</td>
                    <td className="td"><StatusPesananBadge status={p.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader judul="Transaksi terbaru" sub="Penjualan kasir" />
          <ul className="divide-y divide-gray-100 border-t border-gray-100">
            {trxTerbaru.map((t) => {
              const metode = t.pembayaran.map((b) => b.metode).join(' + ');
              return (
                <li key={t.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="num w-12 shrink-0 text-sm font-semibold text-gray-500">{jam(t.tanggal)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-800">{t.items.map((i) => cari.produk(i.produkId)?.nama.replace('Daging ', '')).join(', ')}</p>
                    <p className="text-xs text-gray-500">{t.id}, {cari.pelanggan(t.pelangganId)?.nama}</p>
                  </div>
                  <div className="text-right">
                    <p className="num text-sm font-bold">{rupiah(totalTrx(t))}</p>
                    <p className={`text-xs capitalize ${metode === 'tempo' ? 'font-semibold text-amber-700' : 'text-gray-500'}`}>{metode === 'qris' ? 'QRIS' : metode}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
        <Card className="flex flex-col">
          <CardHeader judul="Isi kas tersedia" sub={`Saldo ${rupiah(rek.saldo)}, bukan laba`} />
          <ul className="flex-1 divide-y divide-gray-100 border-t border-gray-100 text-sm">
            {rek.baris.map((b) => (
              <li key={b.label} className="flex items-center justify-between gap-3 px-5 py-2">
                <span className="text-gray-600">{b.label}</span>
                <span className={`num shrink-0 font-semibold ${b.nilai < 0 ? 'text-red-600' : 'text-gray-900'}`}>{b.nilai < 0 ? '−' : '+'}{rupiah(Math.abs(b.nilai))}</span>
              </li>
            ))}
          </ul>
          <div className="p-4"><Button varian="garis" className="w-full" onClick={() => buka('keuangan')}>Lihat rincian keuangan</Button></div>
        </Card>
      </div>

      <div className="mt-5"><Catatan>Data dari Google Sheets. Tekan ikon ↻ di atas untuk memuat perubahan terbaru dari perangkat lain.</Catatan></div>
    </>
  );
}
