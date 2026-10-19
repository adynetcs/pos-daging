import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Select, Textarea } from '@/components/ui/FormInput';
import { DatePicker } from '@/components/ui/DatePicker';
import { useData } from '@/context/DataContext';
import { HARI_INI } from '@/data/dummy';
import type { PesananPartai, StatusPesanan } from '@/types';
import { nilaiBaris, targetDP } from '@/utils/calc';
import { angka, rupiah } from '@/utils/format';

interface Baris { produkId: string; qty: string; harga: string }
const num = (s: string) => parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;

export function FormPesanan({ buka, onTutup, onSimpan }: { buka: boolean; onTutup: () => void; onSimpan: (p: PesananPartai) => void }) {
  const { produk, pelanggan, pesanan, pengaturan } = useData();
  const partai = pelanggan.filter((c) => c.jenis === 'partai');
  const [pelangganId, setPelangganId] = useState(partai[0]?.id ?? '');
  const [kirim, setKirim] = useState('2026-10-15');
  const [alamat, setAlamat] = useState('');
  const [catatan, setCatatan] = useState('');
  const [baris, setBaris] = useState<Baris[]>([]);
  const [salah, setSalah] = useState('');

  useEffect(() => {
    if (!buka) return;
    const p = produk.find((x) => x.id === 'p3')!;
    setPelangganId(partai[0]?.id ?? '');
    setAlamat(partai[0]?.alamat ?? '');
    setKirim('2026-10-15'); setCatatan(''); setSalah('');
    setBaris([{ produkId: p.id, qty: '10', harga: String(p.hargaJual) }]);
  }, [buka]);

  const items = baris.map((b) => ({ produkId: b.produkId, qty: num(b.qty), harga: num(b.harga) })).filter((i) => i.qty > 0);
  const total = items.reduce((s, i) => s + nilaiBaris(i.qty, i.harga), 0);
  const dp = targetDP(total, pengaturan.dpPersen / 100);

  const simpan = (status: StatusPesanan) => {
    if (!pelangganId) return setSalah('Pilih pelanggan.');
    if (!items.length) return setSalah('Tambahkan minimal satu produk dengan berat/jumlah.');
    const urut = pesanan.filter((p) => p.tanggal === HARI_INI).length + 1;
    onSimpan({
      id: `PP-${HARI_INI.replace(/-/g, '')}-${String(urut).padStart(2, '0')}`,
      tanggal: HARI_INI, pelangganId, items, pembayaran: [], jadwalKirim: kirim, alamatKirim: alamat || '-',
      catatan: catatan || undefined, status,
    });
  };

  const ubah = (i: number, patch: Partial<Baris>) => setBaris((l) => l.map((b, k) => (k === i ? { ...b, ...patch } : b)));

  return (
    <Modal buka={buka} onTutup={onTutup} judul="Buat pesanan partai" sub={`DP ${pengaturan.dpPersen}% dari total pesanan wajib dibayar sebelum diproses`} lebar="lg"
      footer={<>
        <Button varian="garis" onClick={() => simpan('draft')}>Simpan draft</Button>
        <Button onClick={() => simpan('menunggu_dp')}>Buat dan tagih DP</Button>
      </>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Pelanggan" value={pelangganId} onChange={(e) => { setPelangganId(e.target.value); setAlamat(pelanggan.find((c) => c.id === e.target.value)?.alamat ?? ''); }}
          opsi={partai.map((c) => ({ nilai: c.id, label: c.nama }))} />
        <DatePicker label="Jadwal kirim" value={kirim} min={HARI_INI} onChange={setKirim} />
        <div className="sm:col-span-2">
          <label className="label" htmlFor="alamat">Alamat pengiriman</label>
          <input id="alamat" className="input" value={alamat} onChange={(e) => setAlamat(e.target.value)} />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <p className="text-sm font-bold">Item pesanan</p>
        <Button varian="hantu" ukur="sm" ikon={<Plus className="h-4 w-4" />} onClick={() => setBaris((l) => [...l, { produkId: produk[0].id, qty: '', harga: String(produk[0].hargaJual) }])}>Tambah item</Button>
      </div>
      <div className="mt-2 space-y-2">
        {baris.map((b, i) => {
          const p = produk.find((x) => x.id === b.produkId)!;
          return (
            <div key={i} className="grid grid-cols-[1fr_auto] gap-2 rounded-xl bg-gray-50 p-3 sm:grid-cols-[minmax(0,1.6fr)_0.8fr_1fr_1fr_auto] sm:items-end">
              <div className="col-span-2 sm:col-span-1">
                <label className="text-xs font-semibold text-gray-600">Produk</label>
                <select className="input mt-1" value={b.produkId} onChange={(e) => ubah(i, { produkId: e.target.value, harga: String(produk.find((x) => x.id === e.target.value)!.hargaJual) })}>
                  {produk.filter((x) => x.aktif).map((x) => <option key={x.id} value={x.id}>{x.nama}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">{p.satuan === 'kg' ? 'Berat (kg)' : 'Jumlah (pcs)'}</label>
                <input inputMode="decimal" className="input num mt-1" value={b.qty} onChange={(e) => ubah(i, { qty: e.target.value.replace(/[^0-9.,]/g, '') })} placeholder="0" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">Harga partai / {p.satuan}</label>
                <input inputMode="numeric" className="input num mt-1" value={b.harga ? angka(num(b.harga)) : ''} onChange={(e) => ubah(i, { harga: e.target.value.replace(/\D/g, '') })} />
              </div>
              <div className="flex flex-col justify-end">
                <span className="text-xs font-semibold text-gray-600">Subtotal</span>
                <span className="num mt-1 py-2.5 text-sm font-bold">{rupiah(nilaiBaris(num(b.qty), num(b.harga)))}</span>
              </div>
              <button onClick={() => setBaris((l) => l.filter((_, k) => k !== i))} className="row-start-1 col-start-2 self-start rounded-lg p-2 text-gray-400 hover:text-red-600 sm:row-auto sm:col-auto sm:self-end" aria-label="Hapus item"><Trash2 className="h-4 w-4" /></button>
            </div>
          );
        })}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Textarea label="Catatan" value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Mis. potong dadu, kirim pagi" />
        <div className="space-y-2 rounded-xl border border-gray-200 p-4 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Total pesanan</span><span className="num font-bold">{rupiah(total)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Target DP {pengaturan.dpPersen}%</span><span className="num font-bold text-brand-800">{rupiah(dp)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Pelunasan saat kirim</span><span className="num">{rupiah(total - dp)}</span></div>
          <p className="border-t border-gray-100 pt-2 text-xs text-gray-500">DP adalah bagian dari total pesanan, bukan tambahan pendapatan.</p>
        </div>
      </div>
      {salah && <p className="mt-3 text-sm font-medium text-red-600">{salah}</p>}
    </Modal>
  );
}
