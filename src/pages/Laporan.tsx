import { useEffect, useMemo, useState } from 'react';
import { FileSpreadsheet, Printer, BarChart3, Trophy, Boxes, Truck, PiggyBank, Receipt, ArrowLeftRight, Scale, HandCoins, type LucideIcon } from 'lucide-react';
import { useData, useLookup } from '@/context/DataContext';
import { useToast } from '@/context/ToastContext';
import { PageHeader, Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FilterChips } from '@/components/ui/FilterBar';
import { RentangTanggal } from '@/components/ui/DatePicker';
import { LoadingState, EmptyState, DemoBadge } from '@/components/ui/States';
import { AreaChart } from '@/components/charts/Charts';
import { LabaRugi, SUMBER_KAS } from './Keuangan';
import { HARI_INI } from '@/data/dummy';
import * as F from '@/utils/finance';
import { qtySatuan, rupiah, tanggalLabel, tanggalPendek, angka } from '@/utils/format';

type Jenis = 'harian' | 'terlaris' | 'stok' | 'pembelian' | 'modal' | 'pengeluaran' | 'kas' | 'labarugi' | 'piutang';
type Preset = 'hari' | '7' | 'bulan' | 'kustom';
type Sel = string | number;
interface Tabel { kolom: string[]; kanan?: number[]; baris: Sel[][]; total?: Sel[] }

const JENIS: { k: Jenis; label: string; ikon: LucideIcon }[] = [
  { k: 'harian', label: 'Penjualan harian', ikon: BarChart3 },
  { k: 'terlaris', label: 'Produk terlaris', ikon: Trophy },
  { k: 'stok', label: 'Stok', ikon: Boxes },
  { k: 'pembelian', label: 'Pembelian', ikon: Truck },
  { k: 'modal', label: 'Modal', ikon: PiggyBank },
  { k: 'pengeluaran', label: 'Pengeluaran', ikon: Receipt },
  { k: 'kas', label: 'Arus kas', ikon: ArrowLeftRight },
  { k: 'labarugi', label: 'Laba rugi', ikon: Scale },
  { k: 'piutang', label: 'Piutang & utang', ikon: HandCoins },
];

export default function Laporan() {
  const d = useData();
  const cari = useLookup();
  const toast = useToast();
  const [jenis, setJenis] = useState<Jenis>('harian');
  const [preset, setPreset] = useState<Preset>('bulan');
  const [rentang, setRentang] = useState({ dari: '2026-10-01', sampai: HARI_INI });
  const [muat, setMuat] = useState(false);

  const pilihPreset = (p: Preset) => {
    setPreset(p);
    if (p === 'hari') setRentang({ dari: HARI_INI, sampai: HARI_INI });
    if (p === '7') setRentang({ dari: F.rentangHari(HARI_INI, 7)[0], sampai: HARI_INI });
    if (p === 'bulan') setRentang({ dari: '2026-10-01', sampai: HARI_INI });
  };
  useEffect(() => { setMuat(true); const t = setTimeout(() => setMuat(false), 350); return () => clearTimeout(t); }, [jenis, rentang]);

  const per: F.Periode = rentang;
  const hari = useMemo(() => {
    const out: string[] = [];
    for (let t = new Date(`${per.dari}T00:00:00`); t <= new Date(`${per.sampai}T00:00:00`); t.setDate(t.getDate() + 1))
      out.push(`${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`);
    return out;
  }, [per.dari, per.sampai]);

  const tabel: Tabel | null = useMemo(() => {
    const dlm = (t: string) => t.slice(0, 10) >= per.dari && t.slice(0, 10) <= per.sampai;
    switch (jenis) {
      case 'harian': {
        const h = F.penjualanHarian(d, hari);
        return { kolom: ['Tanggal', 'Transaksi kasir', 'Omzet'], kanan: [1, 2], baris: h.map((x) => [tanggalPendek(x.tanggal), x.transaksi, x.nilai]), total: ['Total', h.reduce((s, x) => s + x.transaksi, 0), h.reduce((s, x) => s + x.nilai, 0)] };
      }
      case 'terlaris': {
        const t = F.produkTerlaris(d, per);
        return { kolom: ['Peringkat', 'Produk', 'Terjual', 'Omzet', 'Laba kotor'], kanan: [2, 3, 4], baris: t.map((x, i) => { const p = cari.produk(x.produkId)!; return [i + 1, p.nama, qtySatuan(x.qty, p.satuan), x.nilai, x.laba]; }), total: ['', 'Total', '', t.reduce((s, x) => s + x.nilai, 0), t.reduce((s, x) => s + x.laba, 0)] };
      }
      case 'stok':
        return { kolom: ['SKU', 'Produk', 'Stok', 'Minimum', 'HPP', 'Nilai persediaan'], kanan: [2, 3, 4, 5], baris: d.produk.filter((p) => p.aktif).map((p) => [p.sku, p.nama, qtySatuan(p.stok, p.satuan), qtySatuan(p.stokMinimum, p.satuan), p.hpp, Math.round(p.stok * p.hpp)]), total: ['', 'Total', '', '', '', F.nilaiPersediaan(d)] };
      case 'pembelian': {
        const pb = d.pembelian.filter((b) => dlm(b.tanggal));
        return { kolom: ['No.', 'Tanggal', 'Supplier', 'Total', 'Dibayar', 'Sisa utang', 'Status'], kanan: [3, 4, 5], baris: pb.map((b) => [b.id, tanggalPendek(b.tanggal), cari.supplier(b.supplierId)!.nama, F.nilaiPembelian(b), F.dibayarPembelian(b), F.utangPembelian(b), b.statusPenerimaan === 'dipesan' ? 'Belum diterima' : 'Diterima']), total: ['Total', '', '', pb.reduce((s, b) => s + F.nilaiPembelian(b), 0), pb.reduce((s, b) => s + F.dibayarPembelian(b), 0), pb.reduce((s, b) => s + F.utangPembelian(b), 0), ''] };
      }
      case 'modal': {
        const m = d.modal.filter((x) => dlm(x.tanggal));
        return { kolom: ['Tanggal', 'Jenis', 'Keterangan', 'Jumlah'], kanan: [3], baris: m.map((x) => [tanggalPendek(x.tanggal), x.jenis === 'awal' ? 'Modal awal' : x.jenis === 'tambahan' ? 'Modal masuk' : 'Penarikan', x.keterangan, x.jenis === 'penarikan' ? -x.jumlah : x.jumlah]), total: ['Modal bersih', '', '', m.reduce((s, x) => s + (x.jenis === 'penarikan' ? -x.jumlah : x.jumlah), 0)] };
      }
      case 'pengeluaran': {
        const e = d.pengeluaran.filter((x) => dlm(x.tanggal));
        return { kolom: ['Tanggal', 'Kategori', 'Keterangan', 'Jumlah'], kanan: [3], baris: e.map((x) => [tanggalPendek(x.tanggal), x.kategori, x.keterangan, x.jumlah]), total: ['Total', '', '', e.reduce((s, x) => s + x.jumlah, 0)] };
      }
      case 'kas': {
        const k = F.bukuKas(d).filter((b) => dlm(b.tanggal));
        return { kolom: ['Tanggal', 'Jenis', 'Keterangan', 'Masuk', 'Keluar'], kanan: [3, 4], baris: k.map((b) => [tanggalPendek(b.tanggal), SUMBER_KAS[b.sumber].label, `${b.keterangan} (${b.referensi})`, b.masuk, b.keluar]), total: ['Total', '', `Saldo akhir ${rupiah(F.saldoKas(d, per.sampai))}`, k.reduce((s, b) => s + b.masuk, 0), k.reduce((s, b) => s + b.keluar, 0)] };
      }
      case 'piutang': {
        const pi = F.piutang(d).semua.map((x) => ['Piutang', x.ref, cari.pelanggan(x.pelangganId)!.nama, tanggalPendek(x.tanggal), x.nilai]);
        const ut = F.utangSupplier(d).daftar.map((b) => ['Utang', b.id, cari.supplier(b.supplierId)!.nama, tanggalPendek(b.tanggal), F.utangPembelian(b)]);
        return { kolom: ['Jenis', 'Referensi', 'Pihak', 'Tanggal', 'Sisa'], kanan: [4], baris: [...pi, ...ut] };
      }
      default: return null;
    }
  }, [jenis, d, per, hari, cari]);

  const fmt = (v: Sel, i: number, t: Tabel) => (typeof v === 'number' && t.kolom[i] !== 'Peringkat' && !t.kolom[i].startsWith('Transaksi') ? rupiah(v) : typeof v === 'number' ? angka(v) : v);

  const eksporCSV = () => {
    if (!tabel) return;
    const esc = (v: Sel) => `"${String(v).replace(/"/g, '""')}"`;
    const isi = [tabel.kolom, ...tabel.baris, ...(tabel.total ? [tabel.total] : [])].map((r) => r.map(esc).join(';')).join('\n');
    try {
      const url = URL.createObjectURL(new Blob(['\ufeff' + isi], { type: 'text/csv;charset=utf-8' }));
      const a = document.createElement('a');
      a.href = url; a.download = `laporan-${jenis}-${per.dari}_${per.sampai}.csv`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast({ jenis: 'sukses', judul: 'CSV dibuat', pesan: 'Bisa dibuka di Excel (pemisah titik koma).' });
    } catch {
      toast({ jenis: 'gagal', judul: 'Unduhan diblokir', pesan: 'Browser ini tidak mengizinkan unduhan dari halaman. Jalankan aplikasi secara lokal.' });
    }
  };

  const jdl = JENIS.find((j) => j.k === jenis)!;

  return (
    <>
      <PageHeader judul="Laporan" sub={`Periode ${tanggalPendek(per.dari)} – ${tanggalPendek(per.sampai)}`}
        aksi={<>
          <Button varian="garis" ikon={<FileSpreadsheet className="h-4 w-4" />} onClick={eksporCSV} disabled={jenis === 'labarugi'}>Ekspor CSV</Button>
          <Button varian="garis" ikon={<Printer className="h-4 w-4" />} onClick={() => { toast({ jenis: 'info', judul: 'Cetak PDF (demo)', pesan: 'Gunakan "Simpan sebagai PDF" di dialog cetak. Format PDF khusus belum dibuat.' }); setTimeout(() => window.print(), 300); }}>Cetak PDF <DemoBadge /></Button>
        </>} />

      <Card className="mb-4 flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
        <FilterChips<Preset> label="Periode" value={preset} onChange={pilihPreset} opsi={[{ nilai: 'hari', label: 'Hari ini' }, { nilai: '7', label: '7 hari' }, { nilai: 'bulan', label: 'Bulan ini' }, { nilai: 'kustom', label: 'Pilih tanggal' }]} />
        {preset === 'kustom' && <RentangTanggal dari={rentang.dari} sampai={rentang.sampai} onChange={(a, b) => setRentang({ dari: a, sampai: b })} />}
      </Card>

      <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <nav aria-label="Jenis laporan" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:block lg:space-y-1 lg:px-0">
          {JENIS.map((j) => (
            <button key={j.k} onClick={() => setJenis(j.k)} aria-current={jenis === j.k ? 'page' : undefined}
              className={`flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold lg:w-full ${jenis === j.k ? 'bg-white text-brand-800 shadow-card ring-1 ring-brand-200' : 'text-gray-600 hover:bg-white'}`}>
              <j.ikon className="h-4 w-4" />{j.label}
            </button>
          ))}
        </nav>

        <div className="print-area min-w-0">
          {muat ? <Card><LoadingState baris={6} /></Card> : jenis === 'labarugi' ? <LabaRugi periode={per} /> : tabel && (
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4">
                <div><h2 className="font-bold">Laporan {jdl.label.toLowerCase()}</h2><p className="text-[13px] text-gray-500">{['stok', 'piutang'].includes(jenis) ? `Posisi per ${tanggalPendek(HARI_INI)}` : `${tanggalPendek(per.dari)} – ${tanggalPendek(per.sampai)}`}</p></div>
              </div>
              {jenis === 'harian' && hari.length > 1 && (
                <div className="px-3 pb-2"><AreaChart tinggi={180} data={F.penjualanHarian(d, hari).map((h) => ({ label: tanggalLabel(h.tanggal), nilai: h.nilai }))} /></div>
              )}
              {tabel.baris.length === 0 ? <EmptyState judul="Tidak ada data di periode ini" pesan="Pilih rentang tanggal lain." /> : (
                <div className="overflow-x-auto border-t border-gray-100">
                  <table className="w-full min-w-max">
                    <thead className="bg-gray-50/70"><tr>{tabel.kolom.map((k, i) => <th key={k} className={`th ${tabel.kanan?.includes(i) ? 'text-right' : ''}`}>{k}</th>)}</tr></thead>
                    <tbody className="divide-y divide-gray-100">
                      {tabel.baris.map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j} className={`td ${tabel.kanan?.includes(j) ? 'num text-right' : ''} ${typeof v === 'number' && v < 0 ? 'text-red-600' : ''}`}>{fmt(v, j, tabel)}</td>)}</tr>)}
                    </tbody>
                    {tabel.total && <tfoot className="border-t-2 border-gray-200 bg-gray-50"><tr>{tabel.total.map((v, j) => <td key={j} className={`td font-bold text-gray-900 ${tabel.kanan?.includes(j) ? 'num text-right' : ''}`}>{v === '' ? '' : fmt(v, j, tabel)}</td>)}</tr></tfoot>}
                  </table>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
