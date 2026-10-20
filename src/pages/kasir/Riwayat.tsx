import { useMemo, useState } from 'react';
import { Ban, Receipt } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/StatusBadge';
import { Textarea } from '@/components/ui/FormInput';
import { DatePicker } from '@/components/ui/DatePicker';
import { EmptyState } from '@/components/ui/States';
import { useData, useLookup, pesanGalat } from '@/context/DataContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { StrukModal } from './Struk';
import type { TransaksiEceran } from '@/types';
import { tempoTrx, totalTrx } from '@/utils/finance';
import { hariIni } from '@/utils/waktu';
import { jam, rupiah } from '@/utils/format';

const label = (m: string) => (m === 'qris' ? 'QRIS' : m.charAt(0).toUpperCase() + m.slice(1));

/** Riwayat transaksi kasir per hari: cetak ulang struk & pembatalan (pemilik/admin). */
export function RiwayatKasir({ buka, onTutup }: { buka: boolean; onTutup: () => void }) {
  const { transaksi, batalPenjualan } = useData();
  const cari = useLookup();
  const { pengguna } = useAuth();
  const toast = useToast();
  const bolehBatal = pengguna?.peran !== 'kasir';
  const [tgl, setTgl] = useState(hariIni());
  const [struk, setStruk] = useState<TransaksiEceran | null>(null);
  const [batal, setBatal] = useState<TransaksiEceran | null>(null);
  const [alasan, setAlasan] = useState('');
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState('');

  const daftar = useMemo(() => transaksi.filter((t) => t.tanggal.startsWith(tgl)).sort((a, b) => b.tanggal.localeCompare(a.tanggal)), [transaksi, tgl]);
  const total = daftar.reduce((s, t) => s + totalTrx(t), 0);

  const konfirmasiBatal = async () => {
    if (!batal) return;
    setProses(true); setGalat('');
    try {
      const dibayar = totalTrx(batal) - tempoTrx(batal);
      await batalPenjualan(batal.id, alasan.trim());
      toast({ jenis: 'sukses', judul: `${batal.id} dibatalkan`, pesan: `Stok dikembalikan.${dibayar ? ` Kembalikan uang ${rupiah(dibayar)} ke pelanggan.` : ''}` });
      setBatal(null); setAlasan('');
    } catch (e) { setGalat(pesanGalat(e)); } finally { setProses(false); }
  };

  return (
    <>
      <Modal buka={buka && !struk && !batal} onTutup={onTutup} judul="Riwayat transaksi kasir" sub={`${daftar.length} transaksi, total ${rupiah(total)}`} lebar="md">
        <div className="mb-3 sm:w-60"><DatePicker label="Tanggal" value={tgl} max={hariIni()} onChange={setTgl} /></div>
        {daftar.length === 0 ? <EmptyState ikon={Receipt} judul="Belum ada transaksi di tanggal ini" /> : (
          <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200">
            {daftar.map((t) => {
              const tempo = tempoTrx(t);
              return (
                <li key={t.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5">
                  <span className="num w-11 text-sm font-semibold text-gray-500">{jam(t.tanggal)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{t.id}</p>
                    <p className="truncate text-xs text-gray-500">{cari.pelanggan(t.pelangganId)?.nama}, {t.items.length} produk, {t.pembayaran.filter((b) => b.metode !== 'tempo').map((b) => label(b.metode)).join(' + ') || 'Tempo'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {tempo > 0 && <Badge nada="kuning">Piutang {rupiah(tempo)}</Badge>}
                    <span className="num text-sm font-bold">{rupiah(totalTrx(t))}</span>
                    <Button ukur="sm" varian="garis" onClick={() => setStruk(t)} aria-label={`Struk ${t.id}`}>Struk</Button>
                    {bolehBatal && <Button ukur="sm" varian="hantu" className="text-red-600 hover:bg-red-50" onClick={() => { setBatal(t); setAlasan(''); setGalat(''); }} aria-label={`Batalkan ${t.id}`}>Batalkan</Button>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {!bolehBatal && <p className="mt-3 text-xs text-gray-500">Pembatalan transaksi hanya bisa dilakukan pemilik atau admin.</p>}
      </Modal>
      <StrukModal trx={struk} cetakUlang onTutup={() => setStruk(null)} />
      <Modal buka={!!batal} onTutup={() => !proses && setBatal(null)} judul={`Batalkan ${batal?.id ?? ''}?`} sub="Riwayat tetap tersimpan dengan status batal" lebar="sm"
        footer={<><Button varian="garis" onClick={() => setBatal(null)} disabled={proses}>Kembali</Button><Button varian="bahaya" ikon={<Ban className="h-4 w-4" />} disabled={!alasan.trim() || proses} onClick={() => void konfirmasiBatal()}>{proses ? 'Membatalkan…' : 'Ya, batalkan'}</Button></>}>
        {batal && (
          <div className="space-y-3 text-sm">
            <ul className="rounded-xl bg-gray-50 p-3 text-gray-700">
              <li>Stok semua produk di transaksi ini <b>dikembalikan</b>.</li>
              {totalTrx(batal) - tempoTrx(batal) > 0 && <li>Uang <b>{rupiah(totalTrx(batal) - tempoTrx(batal))}</b> dicatat sebagai pengembalian ke pelanggan (kas berkurang).</li>}
              {tempoTrx(batal) > 0 && <li>Piutang <b>{rupiah(tempoTrx(batal))}</b> dihapus.</li>}
            </ul>
            <Textarea label="Alasan pembatalan (wajib)" value={alasan} onChange={(e) => setAlasan(e.target.value)} placeholder="mis. salah input berat, pelanggan batal beli" />
            {galat && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 font-medium text-red-700">{galat}</p>}
          </div>
        )}
      </Modal>
    </>
  );
}
