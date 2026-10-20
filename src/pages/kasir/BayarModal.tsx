import { useEffect, useMemo, useState } from 'react';
import { Banknote, Landmark, QrCode, Split, Clock3 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import type { MetodeBayar } from '@/types';
import { rupiah, angka } from '@/utils/format';

type Mode = 'tunai' | 'transfer' | 'qris' | 'campuran' | 'tempo';
export interface HasilBayar { pembayaran: { metode: MetodeBayar; jumlah: number }[]; diterima: number; kembalian: number }

const parse = (s: string) => parseInt(s.replace(/\D/g, ''), 10) || 0;

export function BayarModal({ buka, total, bolehTempo, metodeAktif, memproses = false, rekening = '', onTutup, onBayar }: {
  buka: boolean; total: number; bolehTempo: boolean; memproses?: boolean; rekening?: string;
  metodeAktif: Record<MetodeBayar, boolean>;
  onTutup: () => void; onBayar: (h: HasilBayar) => void;
}) {
  const [mode, setMode] = useState<Mode>('tunai');
  const [uang, setUang] = useState('');
  const [split, setSplit] = useState({ tunai: '', transfer: '', qris: '' });
  useEffect(() => { if (buka) { setMode('tunai'); setUang(''); setSplit({ tunai: '', transfer: '', qris: '' }); } }, [buka]);

  const pecahan = useMemo(() => {
    const s = new Set<number>([total]);
    [10000, 50000, 100000].forEach((k) => s.add(Math.ceil(total / k) * k));
    s.add(Math.ceil(total / 100000) * 100000 + 100000);
    return [...s].sort((a, b) => a - b).slice(0, 4);
  }, [total]);

  const diterima = parse(uang);
  const totalSplit = parse(split.tunai) + parse(split.transfer) + parse(split.qris);
  const sisaSplit = total - totalSplit;

  let valid = true, pesan = '';
  if (mode === 'tunai') { valid = diterima >= total; if (uang && !valid) pesan = `Uang kurang ${rupiah(total - diterima)}`; }
  if (mode === 'campuran') {
    valid = sisaSplit === 0;
    if (totalSplit > 0 && !valid) pesan = sisaSplit > 0 ? `Masih kurang ${rupiah(sisaSplit)}` : `Kelebihan ${rupiah(-sisaSplit)}`;
  }

  const semuaMode: { k: Mode; label: string; ikon: typeof Banknote; tampil: boolean }[] = [
    { k: 'tunai', label: 'Tunai', ikon: Banknote, tampil: metodeAktif.tunai },
    { k: 'qris', label: 'QRIS', ikon: QrCode, tampil: metodeAktif.qris },
    { k: 'transfer', label: 'Transfer', ikon: Landmark, tampil: metodeAktif.transfer },
    { k: 'campuran', label: 'Campuran', ikon: Split, tampil: true },
    { k: 'tempo', label: 'Tempo', ikon: Clock3, tampil: metodeAktif.tempo && bolehTempo },
  ];

  const kirim = () => {
    if (!valid) return;
    if (mode === 'campuran') {
      const p = (['tunai', 'transfer', 'qris'] as const).map((m) => ({ metode: m, jumlah: parse(split[m]) })).filter((x) => x.jumlah > 0);
      onBayar({ pembayaran: p, diterima: total, kembalian: 0 });
    } else if (mode === 'tunai') onBayar({ pembayaran: [{ metode: 'tunai', jumlah: total }], diterima, kembalian: diterima - total });
    else onBayar({ pembayaran: [{ metode: mode, jumlah: total }], diterima: total, kembalian: 0 });
  };

  return (
    <Modal buka={buka} onTutup={onTutup} judul="Pembayaran" sub="Pastikan uang/dana sudah diterima sebelum menekan Bayar." lebar="sm"
      footer={<><Button varian="garis" onClick={onTutup} disabled={memproses}>Kembali</Button><Button disabled={!valid || memproses} onClick={kirim} className="min-w-36">{memproses ? 'Menyimpan…' : `Bayar ${rupiah(total)}`}</Button></>}>
      <div className="rounded-2xl bg-gray-50 p-4 text-center">
        <p className="text-[13px] text-gray-500">Total tagihan</p>
        <p className="num text-3xl font-extrabold text-gray-900">{rupiah(total)}</p>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5" role="radiogroup" aria-label="Metode pembayaran">
        {semuaMode.filter((m) => m.tampil).map((m) => (
          <button key={m.k} role="radio" aria-checked={mode === m.k} onClick={() => setMode(m.k)}
            className={`flex flex-col items-center gap-1 rounded-xl py-2.5 text-xs font-semibold ring-1 ring-inset ${mode === m.k ? 'bg-brand-50 text-brand-800 ring-brand-400' : 'text-gray-600 ring-gray-200 hover:bg-gray-50'}`}>
            <m.ikon className="h-5 w-5" />{m.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {mode === 'tunai' && (
          <>
            <label className="label" htmlFor="uang">Uang diterima</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-500">Rp</span>
              <input id="uang" inputMode="numeric" value={uang ? angka(diterima) : ''} onChange={(e) => setUang(e.target.value)}
                className="input num pl-10 text-lg font-bold" placeholder="0" />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {pecahan.map((p) => (
                <button key={p} onClick={() => setUang(String(p))} className="num h-10 rounded-xl text-[13px] font-semibold ring-1 ring-inset ring-gray-200 hover:bg-gray-50">
                  {p === total ? 'Uang pas' : rupiah(p)}
                </button>
              ))}
            </div>
            {diterima >= total && (
              <div className="mt-3 flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3">
                <span className="text-sm font-semibold text-emerald-800">Kembalian</span>
                <span className="num text-xl font-extrabold text-emerald-700">{rupiah(diterima - total)}</span>
              </div>
            )}
          </>
        )}
        {mode === 'qris' && (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-gray-300 p-5 text-center">
            <QrCode className="h-24 w-24 text-gray-800" strokeWidth={1.2} />
            <p className="mt-2 text-sm font-semibold">Gunakan QRIS toko Anda</p>
            <p className="text-xs text-gray-500">Tekan Bayar setelah dana terlihat masuk di aplikasi merchant.</p>
          </div>
        )}
        {mode === 'transfer' && (
          <div className="rounded-2xl border border-gray-200 p-4 text-sm">
            <p className="text-gray-500">Rekening tujuan</p>
            <p className="mt-1 font-bold">{rekening || 'Isi nomor rekening di Pengaturan → Metode pembayaran'}</p>
            <p className="mt-2 text-xs text-gray-500">Pastikan dana sudah masuk sebelum menekan Bayar.</p>
          </div>
        )}
        {mode === 'tempo' && (
          <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
            Transaksi dicatat sebagai <b>piutang</b> pelanggan sebesar {rupiah(total)}. Omzet diakui hari ini, sedangkan kas baru bertambah saat pelanggan melunasi.
          </div>
        )}
        {mode === 'campuran' && (
          <div className="space-y-2">
            {(['tunai', 'qris', 'transfer'] as const).map((m) => (
              <div key={m} className="flex items-center gap-2">
                <span className="w-16 text-sm font-semibold capitalize text-gray-700">{m === 'qris' ? 'QRIS' : m}</span>
                <div className="relative min-w-0 flex-1">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-500">Rp</span>
                  <input inputMode="numeric" value={split[m] ? angka(parse(split[m])) : ''} placeholder="0" aria-label={`Nominal ${m}`}
                    onChange={(e) => setSplit((s) => ({ ...s, [m]: e.target.value }))} className="input num pl-10" />
                </div>
                <button onClick={() => setSplit((s) => ({ ...s, [m]: String(parse(s[m]) + Math.max(0, sisaSplit)) }))}
                  className="h-10 shrink-0 rounded-lg px-2.5 text-xs font-semibold text-brand-700 hover:bg-brand-50">Isi sisa</button>
              </div>
            ))}
            <div className="flex justify-between pt-1 text-sm"><span className="text-gray-500">Teralokasi</span><span className="num font-semibold">{rupiah(totalSplit)} / {rupiah(total)}</span></div>
          </div>
        )}
        {pesan && <p className="mt-2 text-sm font-medium text-red-600">{pesan}</p>}
      </div>
    </Modal>
  );
}
