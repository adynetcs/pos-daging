import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { ProductThumb } from '@/components/ui/ProductThumb';
import type { Produk } from '@/types';
import { angka, berat, rupiah } from '@/utils/format';
import { bulatkanBerat, nilaiBaris } from '@/utils/calc';

/**
 * Input berat bergaya layar timbangan digital. Kasir bisa mengetik dalam kg atau gram,
 * atau memilih preset. Nilai disimpan dalam kg dengan presisi gram.
 */
export function TimbangModal({ produk, awal, sisaStok, onTutup, onSimpan }: {
  produk: Produk | null; awal?: number; sisaStok: number; onTutup: () => void; onSimpan: (kg: number) => void;
}) {
  const [satuan, setSatuan] = useState<'kg' | 'g'>('kg');
  const [teks, setTeks] = useState('');
  useEffect(() => {
    if (produk) { setSatuan('kg'); setTeks(awal ? angka(awal, 3) : ''); }
  }, [produk, awal]);
  if (!produk) return null;

  const parse = (s: string) => parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;
  const kg = bulatkanBerat(satuan === 'kg' ? parse(teks) : parse(teks) / 1000);
  const lebih = kg > sisaStok;
  const valid = kg > 0 && !lebih;
  const preset = [0.25, 0.5, 1, 1.5, 2, 5];
  const gantiSatuan = (s: 'kg' | 'g') => {
    if (s === satuan) return;
    if (kg > 0) setTeks(s === 'g' ? String(Math.round(kg * 1000)) : angka(kg, 3));
    setSatuan(s);
  };

  return (
    <Modal buka onTutup={onTutup} judul={awal ? 'Ubah berat' : 'Timbang produk'} lebar="sm"
      footer={<><Button varian="garis" onClick={onTutup}>Batal</Button><Button disabled={!valid} onClick={() => onSimpan(kg)}>{awal ? 'Simpan berat' : 'Masukkan ke keranjang'}</Button></>}>
      <div className="flex items-center gap-3">
        <ProductThumb produk={produk} />
        <div>
          <p className="font-bold text-gray-900">{produk.nama}</p>
          <p className="num text-sm text-gray-500">{rupiah(produk.hargaJual)} / kg, tersedia {berat(sisaStok)}</p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-ink-900 p-4 text-white">
        <div className="flex items-center justify-between text-[12px] text-white/50">
          <span>Berat</span>
          <div className="flex rounded-lg bg-white/10 p-0.5" role="radiogroup" aria-label="Satuan berat">
            {(['kg', 'g'] as const).map((s) => (
              <button key={s} role="radio" aria-checked={satuan === s} onClick={() => gantiSatuan(s)}
                className={`rounded-md px-2.5 py-0.5 text-xs font-bold ${satuan === s ? 'bg-white text-ink-900' : 'text-white/70'}`}>{s === 'g' ? 'gram' : 'kg'}</button>
            ))}
          </div>
        </div>
        <div className="mt-2 flex items-baseline justify-end gap-2">
          <input autoFocus inputMode="decimal" value={teks} placeholder="0"
            onChange={(e) => setTeks(e.target.value.replace(/[^0-9.,]/g, ''))}
            onKeyDown={(e) => e.key === 'Enter' && valid && onSimpan(kg)}
            aria-label={`Berat dalam ${satuan}`}
            className="num w-full min-w-0 bg-transparent text-right text-5xl font-extrabold tracking-tight text-emerald-300 outline-none placeholder:text-white/20" />
          <span className="text-xl font-bold text-white/60">{satuan}</span>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3 text-sm">
          <span className="text-white/60">{kg > 0 ? `${berat(kg)} × ${rupiah(produk.hargaJual)}` : 'Ketik berat atau pilih cepat'}</span>
          <span key={kg} className="num scale-tick text-lg font-bold">{rupiah(nilaiBaris(kg, produk.hargaJual))}</span>
        </div>
      </div>
      {lebih && <p className="mt-2 text-sm font-medium text-red-600">Berat melebihi stok tersedia ({berat(sisaStok)}).</p>}

      <p className="mb-2 mt-4 text-[13px] font-semibold text-gray-700">Pilih cepat</p>
      <div className="grid grid-cols-3 gap-2">
        {preset.map((p) => (
          <button key={p} disabled={p > sisaStok}
            onClick={() => { setSatuan('kg'); setTeks(angka(p, 3)); }}
            className={`num h-11 rounded-xl text-sm font-semibold ring-1 ring-inset disabled:opacity-35 ${kg === p ? 'bg-brand-50 text-brand-800 ring-brand-300' : 'ring-gray-200 hover:bg-gray-50'}`}>
            {berat(p)}
          </button>
        ))}
      </div>
    </Modal>
  );
}
