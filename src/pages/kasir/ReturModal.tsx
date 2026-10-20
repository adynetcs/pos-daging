import { useEffect, useMemo, useState } from 'react';
import { Undo2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Select, Textarea, Toggle } from '@/components/ui/FormInput';
import { useData, useLookup, pesanGalat } from '@/context/DataContext';
import { useToast } from '@/context/ToastContext';
import type { TransaksiEceran } from '@/types';
import { subtotalTrx, tempoTrx } from '@/utils/finance';
import { angka, qtySatuan, rupiah } from '@/utils/format';

/** Retur sebagian dari satu transaksi kasir. Nilai dihitung ulang di server; di sini hanya perkiraan. */
export function ReturModal({ trx, onTutup }: { trx: TransaksiEceran | null; onTutup: () => void }) {
  const { returPenjualan } = useData();
  const cari = useLookup();
  const toast = useToast();
  const [qty, setQty] = useState<Record<string, string>>({});
  const [alasan, setAlasan] = useState('');
  const [layak, setLayak] = useState(true);
  const [metode, setMetode] = useState<'tunai' | 'transfer' | 'qris'>('tunai');
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState('');
  useEffect(() => { if (trx) { setQty({}); setAlasan(''); setLayak(true); setMetode('tunai'); setGalat(''); } }, [trx]);

  const sisa = useMemo(() => {
    const m: Record<string, number> = {};
    if (!trx) return m;
    for (const i of trx.items) m[i.produkId] = (m[i.produkId] ?? 0) + i.qty;
    for (const r of trx.retur ?? []) m[r.produkId] = Math.round(((m[r.produkId] ?? 0) - r.qty) * 1000) / 1000;
    return m;
  }, [trx]);
  if (!trx) return null;

  const num = (s: string) => parseFloat((s ?? '').replace(',', '.')) || 0;
  const faktor = subtotalTrx(trx) > 0 ? (subtotalTrx(trx) - trx.diskon) / subtotalTrx(trx) : 1;
  const items = trx.items.map((i) => ({ i, q: num(qty[i.produkId]) })).filter((x) => x.q > 0);
  const lebih = items.find((x) => x.q > (sisa[x.i.produkId] ?? 0) + 1e-9);
  const nilai = items.reduce((s, x) => s + Math.round(x.q * x.i.harga * faktor), 0);
  const piutang = tempoTrx(trx);
  const kurangiPiutang = Math.min(nilai, piutang);
  const kembaliUang = nilai - kurangiPiutang;
  const valid = items.length > 0 && !lebih && !!alasan.trim();

  const simpan = async () => {
    setProses(true); setGalat('');
    try {
      const h = await returPenjualan({ id: trx.id, items: items.map((x) => ({ id_produk: x.i.produkId, qty: x.q })), alasan: alasan.trim(), kembali_stok: layak, metode });
      toast({ jenis: 'sukses', judul: `Retur ${rupiah(h.nilai)} tersimpan`, pesan: h.kembali_uang > 0 ? `Kembalikan uang ${rupiah(h.kembali_uang)} ke pelanggan.` : `Piutang berkurang ${rupiah(h.kurangi_piutang)}.` });
      onTutup();
    } catch (e) { setGalat(pesanGalat(e)); } finally { setProses(false); }
  };

  return (
    <Modal buka onTutup={() => !proses && onTutup()} judul={`Retur ${trx.id}`} sub="Isi jumlah yang dikembalikan pelanggan" lebar="md"
      footer={<><Button varian="garis" onClick={onTutup} disabled={proses}>Batal</Button><Button ikon={<Undo2 className="h-4 w-4" />} disabled={!valid || proses} onClick={() => void simpan()}>{proses ? 'Menyimpan…' : `Simpan retur ${nilai ? rupiah(nilai) : ''}`}</Button></>}>
      <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200">
        {trx.items.map((i) => {
          const p = cari.produk(i.produkId);
          const s = sisa[i.produkId] ?? 0;
          const q = num(qty[i.produkId]);
          return (
            <li key={i.produkId} className="grid grid-cols-[1fr_120px] items-center gap-3 px-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{p?.nama ?? i.produkId}</p>
                <p className="text-xs text-gray-500">Dibeli {qtySatuan(i.qty, p?.satuan ?? 'kg')} × {rupiah(i.harga)}, bisa diretur {qtySatuan(s, p?.satuan ?? 'kg')}</p>
                {q > s + 1e-9 && <p className="text-xs font-medium text-red-600">Melebihi sisa yang bisa diretur</p>}
              </div>
              <label className="relative"><span className="sr-only">Jumlah retur {p?.nama}</span>
                <input inputMode="decimal" disabled={s <= 0} className="input num pr-10 text-right" placeholder="0" value={qty[i.produkId] ?? ''}
                  onChange={(e) => setQty((x) => ({ ...x, [i.produkId]: e.target.value.replace(/[^0-9.,]/g, '') }))} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">{p?.satuan}</span></label>
            </li>
          );
        })}
      </ul>
      <div className="mt-4 space-y-3">
        <Toggle label="Barang layak dijual lagi" keterangan={layak ? 'Kembali ke stok' : 'Dicatat sebagai stok rusak'} checked={layak} onChange={setLayak} />
        <Textarea label="Alasan retur (wajib)" value={alasan} onChange={(e) => setAlasan(e.target.value)} placeholder="mis. daging kurang segar, salah potong" />
        {nilai > 0 && (
          <div className="rounded-xl bg-gray-50 p-3 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Nilai retur{trx.diskon ? ' (setelah diskon)' : ''}</span><span className="num font-bold">{rupiah(nilai)}</span></div>
            {kurangiPiutang > 0 && <div className="flex justify-between"><span className="text-gray-500">Mengurangi piutang</span><span className="num">{rupiah(kurangiPiutang)}</span></div>}
            {kembaliUang > 0 && <div className="flex justify-between font-semibold text-red-700"><span>Uang dikembalikan</span><span className="num">{rupiah(kembaliUang)}</span></div>}
          </div>
        )}
        {kembaliUang > 0 && <Select label="Uang dikembalikan lewat" value={metode} onChange={(e) => setMetode(e.target.value as 'tunai' | 'transfer' | 'qris')} opsi={[{ nilai: 'tunai', label: 'Tunai' }, { nilai: 'transfer', label: 'Transfer' }, { nilai: 'qris', label: 'QRIS' }]} />}
        {galat && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{galat}</p>}
        <p className="text-xs text-gray-500">Angka final dihitung server. Omzet & HPP berkurang pada tanggal retur. {angka(Object.values(sisa).filter((v) => v > 0).length)} produk masih bisa diretur.</p>
      </div>
    </Modal>
  );
}
