import { useMemo, useState } from 'react';
import { Plus, ClipboardList, Clock, Wallet, Truck } from 'lucide-react';
import { useData, useLookup } from '@/context/DataContext';
import { useToast } from '@/context/ToastContext';
import { PageHeader, Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/ui/StatCard';
import { FilterBar, FilterChips } from '@/components/ui/FilterBar';
import { SearchInput } from '@/components/ui/SearchInput';
import { DataTable, type Kolom } from '@/components/ui/DataTable';
import { StatusPesananBadge, STATUS_PESANAN } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { EmptyState, CatatanDemo } from '@/components/ui/States';
import { DetailPesanan } from './pesanan/DetailPesanan';
import { FormPesanan } from './pesanan/FormPesanan';
import type { PesananPartai as TPesanan, StatusPesanan } from '@/types';
import { dibayarPesanan, dpPesanan, sisaPesanan, totalPesanan, STATUS_AKTIF, uangMukaPelanggan } from '@/utils/finance';
import { rupiah, tanggalPendek } from '@/utils/format';

type Filter = 'semua' | StatusPesanan;

export default function PesananPartai() {
  const data = useData();
  const { pesanan, simpanPesanan, pengaturan } = data;
  const cari = useLookup();
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>('semua');
  const [q, setQ] = useState('');
  const [dipilih, setDipilih] = useState<string | null>('PP-20261012-01');
  const [detailMobile, setDetailMobile] = useState(false);
  const [form, setForm] = useState(false);

  const dpP = pengaturan.dpPersen / 100;
  const daftar = useMemo(() => {
    const s = q.trim().toLowerCase();
    return [...pesanan]
      .filter((p) => (filter === 'semua' || p.status === filter) && (!s || p.id.toLowerCase().includes(s) || (cari.pelanggan(p.pelangganId)?.nama.toLowerCase().includes(s) ?? false)))
      .sort((a, b) => b.id.localeCompare(a.id));
  }, [pesanan, filter, q, cari]);

  const aktif = pesanan.filter((p) => STATUS_AKTIF.includes(p.status));
  const detail = pesanan.find((p) => p.id === dipilih);
  const hitung = (s: StatusPesanan) => pesanan.filter((p) => p.status === s).length;

  const kolom: Kolom<TPesanan>[] = [
    { key: 'id', judul: 'No. pesanan', render: (p) => <span className="font-semibold text-gray-900">{p.id}</span>, sortBy: (p) => p.id },
    { key: 'tgl', judul: 'Tanggal', kelasKolom: 'hidden 2xl:table-cell', render: (p) => tanggalPendek(p.tanggal), sortBy: (p) => p.tanggal },
    { key: 'pel', judul: 'Pelanggan', render: (p) => <span className="block max-w-[170px] truncate">{cari.pelanggan(p.pelangganId)?.nama}</span>, sortBy: (p) => cari.pelanggan(p.pelangganId)?.nama ?? '' },
    { key: 'tot', judul: 'Total', rata: 'kanan', render: (p) => <span className="num">{rupiah(totalPesanan(p))}</span>, sortBy: totalPesanan },
    { key: 'dp', judul: `DP ${pengaturan.dpPersen}%`, rata: 'kanan', render: (p) => <span className="num text-gray-500">{rupiah(dpPesanan(p, dpP))}</span> },
    { key: 'bayar', judul: 'Total dibayar', rata: 'kanan', render: (p) => <span className="num">{rupiah(dibayarPesanan(p))}</span> },
    { key: 'sisa', judul: 'Sisa tagihan', rata: 'kanan', render: (p) => <span className={`num font-semibold ${sisaPesanan(p) ? 'text-brand-800' : 'text-gray-400'}`}>{rupiah(sisaPesanan(p))}</span>, sortBy: sisaPesanan },
    { key: 'kirim', judul: 'Jadwal kirim', render: (p) => tanggalPendek(p.jadwalKirim), sortBy: (p) => p.jadwalKirim },
    { key: 'st', judul: 'Status', render: (p) => <StatusPesananBadge status={p.status} /> },
  ];

  const pilih = (p: TPesanan) => { setDipilih(p.id); if (window.matchMedia('(max-width: 1535px)').matches) setDetailMobile(true); };

  return (
    <>
      <PageHeader judul="Pesanan Partai" sub={`Pesanan besar dengan DP ${pengaturan.dpPersen}% sebelum diproses.`}
        aksi={<Button ikon={<Plus className="h-4 w-4" />} onClick={() => setForm(true)}>Buat pesanan</Button>} />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Pesanan aktif" nilai={aktif.length} ikon={ClipboardList} warna="biru" keterangan={`Nilai ${rupiah(aktif.reduce((s, p) => s + totalPesanan(p), 0))}`} />
        <StatCard label="Menunggu DP" nilai={hitung('menunggu_dp')} ikon={Clock} warna="kuning" keterangan="belum boleh diproses" onClick={() => setFilter('menunggu_dp')} />
        <StatCard label="Siap dikirim" nilai={hitung('siap_kirim')} ikon={Truck} warna="brand" keterangan="jadwalkan pengiriman" onClick={() => setFilter('siap_kirim')} />
        <StatCard label="DP diterima" nilai={rupiah(uangMukaPelanggan(data))} ikon={Wallet} warna="hijau" keterangan="uang muka, belum pendapatan" />
      </div>

      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card className="min-w-0 overflow-hidden">
          <FilterBar>
            <SearchInput value={q} onChange={setQ} placeholder="Cari pelanggan atau nomor pesanan…" className="sm:w-72" />
            <div className="min-w-0 flex-1">
              <FilterChips<Filter> label="Status" value={filter} onChange={setFilter}
                opsi={[{ nilai: 'semua', label: 'Semua', jumlah: pesanan.length },
                  ...(Object.keys(STATUS_PESANAN) as StatusPesanan[]).map((s) => ({ nilai: s, label: STATUS_PESANAN[s].label, jumlah: hitung(s) }))]} />
            </div>
          </FilterBar>
          <DataTable data={daftar} kolom={kolom} rowKey={(p) => p.id} onRowClick={pilih} dipilih={dipilih}
            kosong={{ judul: 'Tidak ada pesanan', pesan: 'Ubah filter status atau buat pesanan baru.' }}
            kartuMobile={(p) => (
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold">{cari.pelanggan(p.pelangganId)?.nama}</span>
                  <StatusPesananBadge status={p.status} />
                </div>
                <p className="mt-0.5 text-xs text-gray-500">{p.id}, kirim {tanggalPendek(p.jadwalKirim)}</p>
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                  <div><p className="text-gray-500">Total</p><p className="num font-semibold">{rupiah(totalPesanan(p))}</p></div>
                  <div><p className="text-gray-500">Dibayar</p><p className="num font-semibold">{rupiah(dibayarPesanan(p))}</p></div>
                  <div className="text-right"><p className="text-gray-500">Sisa</p><p className="num font-semibold text-brand-800">{rupiah(sisaPesanan(p))}</p></div>
                </div>
              </div>
            )} />
        </Card>

        <Card className="hidden self-start p-5 2xl:block">
          {detail ? <DetailPesanan p={detail} /> : <EmptyState ikon={ClipboardList} judul="Pilih pesanan" pesan="Klik baris di tabel untuk melihat detail." />}
        </Card>
      </div>
      <div className="mt-4"><CatatanDemo>Perubahan status dan pembayaran hanya tersimpan di memori browser.</CatatanDemo></div>

      <Modal buka={detailMobile && !!detail} onTutup={() => setDetailMobile(false)} judul="Detail pesanan" lebar="md">
        {detail && <DetailPesanan p={detail} />}
      </Modal>
      <FormPesanan buka={form} onTutup={() => setForm(false)} onSimpan={(p) => {
        simpanPesanan(p); setForm(false); setDipilih(p.id); setFilter('semua');
        toast({ jenis: 'sukses', judul: `Pesanan ${p.id} dibuat (demo)`, pesan: p.status === 'draft' ? 'Disimpan sebagai draft.' : `Tagih DP ${rupiah(dpPesanan(p, dpP))} ke pelanggan.` });
      }} />
    </>
  );
}
