import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/FormInput';
import { useData, pesanGalat } from '@/context/DataContext';
import { useToast } from '@/context/ToastContext';
import { angka, rupiah } from '@/utils/format';

export interface Piutang { ref: string; sumber: string; nilai: number; pelangganId: string }

/** Terima pelunasan/cicilan piutang dari transaksi kasir tempo atau sisa tagihan pesanan partai. */
export function TerimaPiutangModal({ piutang, onTutup }: { piutang: Piutang | null; onTutup: () => void }) {
  const { bayarPenjualan, bayarPesanan, pelanggan } = useData();
  const toast = useToast();
  const [n, setN] = useState('');
  const [metode, setMetode] = useState<'tunai' | 'transfer' | 'qris'>('tunai');
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState('');
  useEffect(() => { if (piutang) { setN(String(piutang.nilai)); setMetode('tunai'); setGalat(''); } }, [piutang]);
  if (!piutang) return null;
  const v = parseInt(n.replace(/\D/g, ''), 10) || 0;
  const salah = v <= 0 ? 'Isi nominal.' : v > piutang.nilai ? `Melebihi sisa piutang ${rupiah(piutang.nilai)}.` : '';
  const nama = pelanggan.find((c) => c.id === piutang.pelangganId)?.nama ?? '';
  const simpan = async () => {
    setProses(true); setGalat('');
    try {
      if (piutang.ref.startsWith('PP-')) await bayarPesanan(piutang.ref, { jenis: v === piutang.nilai ? 'pelunasan' : 'cicilan', metode, jumlah: v });
      else await bayarPenjualan(piutang.ref, v, metode);
      toast({ jenis: 'sukses', judul: `Pembayaran ${rupiah(v)} diterima`, pesan: v === piutang.nilai ? `Piutang ${nama} untuk ${piutang.ref} lunas.` : `Sisa piutang ${rupiah(piutang.nilai - v)}.` });
      onTutup();
    } catch (e) { setGalat(pesanGalat(e)); } finally { setProses(false); }
  };
  return (
    <Modal buka onTutup={onTutup} judul="Terima pembayaran piutang" sub={`${nama}, ${piutang.ref} (${piutang.sumber}), sisa ${rupiah(piutang.nilai)}`} lebar="sm"
      footer={<><Button varian="garis" onClick={onTutup} disabled={proses}>Batal</Button><Button disabled={!!salah || proses} onClick={() => void simpan()}>{proses ? 'Menyimpan…' : 'Simpan pembayaran'}</Button></>}>
      <div className="space-y-4">
        <Input label="Nominal diterima" awalan="Rp" inputMode="numeric" value={v ? angka(v) : ''} onChange={(e) => setN(e.target.value)}
          error={v > piutang.nilai ? salah : undefined} bantuan="Boleh dicicil. Kas bertambah pada hari ini." />
        <Select label="Metode" value={metode} onChange={(e) => setMetode(e.target.value as 'tunai' | 'transfer' | 'qris')} opsi={[{ nilai: 'tunai', label: 'Tunai' }, { nilai: 'transfer', label: 'Transfer' }, { nilai: 'qris', label: 'QRIS' }]} />
        {galat && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{galat}</p>}
      </div>
    </Modal>
  );
}
