import { useEffect, useState } from 'react';
import { CalendarClock, FileImage, MapPin, Phone, Truck, CheckCircle2, Circle, Wallet, XCircle } from 'lucide-react';
import { useData, useLookup, pesanGalat } from '@/context/DataContext';
import { useToast } from '@/context/ToastContext';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/FormInput';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { StatusPesananBadge, STATUS_PESANAN, Badge } from '@/components/ui/StatusBadge';
import { ProgressBar } from '@/components/charts/Charts';
import { ProductThumb } from '@/components/ui/ProductThumb';
import { hariIni } from '@/utils/waktu';
import type { PembayaranPesanan, PesananPartai, StatusPesanan } from '@/types';
import { nilaiBaris } from '@/utils/calc';
import { dibayarPesanan, dpPesanan, sisaPesanan, totalPesanan } from '@/utils/finance';
import { angka, qtySatuan, rupiah, tanggal, tanggalPendek, berat } from '@/utils/format';

const ALUR: StatusPesanan[] = ['draft', 'menunggu_dp', 'proses', 'siap_kirim', 'selesai'];
const LANJUT: Partial<Record<StatusPesanan, { ke: StatusPesanan; label: string }>> = {
  draft: { ke: 'menunggu_dp', label: 'Konfirmasi & tagih DP' },
  menunggu_dp: { ke: 'proses', label: 'Mulai proses' },
  proses: { ke: 'siap_kirim', label: 'Tandai siap dikirim' },
  siap_kirim: { ke: 'selesai', label: 'Tandai selesai (terkirim)' },
};

export function DetailPesanan({ p }: { p: PesananPartai }) {
  const { ubahStatusPesanan, bayarPesanan, pengaturan } = useData();
  const [proses, setProses] = useState(false);
  const cari = useLookup();
  const toast = useToast();
  const [modalBayar, setModalBayar] = useState(false);
  const [konfirmasi, setKonfirmasi] = useState<null | 'batal' | 'selesai_piutang' | 'proses_tanpa_dp'>(null);
  const [bukti, setBukti] = useState<string | null>(null);

  const pel = cari.pelanggan(p.pelangganId);
  const total = totalPesanan(p);
  const dp = dpPesanan(p, pengaturan.dpPersen / 100);
  const dibayar = dibayarPesanan(p);
  const sisa = sisaPesanan(p);
  const dpOk = dibayar >= dp;
  const beratTotal = p.items.reduce((s, i) => s + (cari.produk(i.produkId)?.satuan === 'kg' ? i.qty : 0), 0);
  const lanjut = LANJUT[p.status];

  const ubah = async (s: StatusPesanan) => {
    setProses(true);
    try {
      await ubahStatusPesanan(p.id, s);
      toast({ jenis: 'sukses', judul: `Status: ${STATUS_PESANAN[s].label}`, pesan: s === 'selesai' ? `${p.id} selesai. Stok sudah dikurangi.` : `${p.id} diperbarui.` });
    } catch (e) {
      toast({ jenis: 'gagal', judul: 'Status belum berubah', pesan: pesanGalat(e) });
    } finally {
      setProses(false);
    }
  };
  const klikLanjut = () => {
    if (!lanjut) return;
    if (lanjut.ke === 'proses' && !dpOk) return setKonfirmasi('proses_tanpa_dp');
    if (lanjut.ke === 'selesai' && sisa > 0) return setKonfirmasi('selesai_piutang');
    void ubah(lanjut.ke);
  };

  const idxAlur = ALUR.indexOf(p.status);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-lg font-extrabold">{p.id}</p>
          <p className="text-sm text-gray-500">Dibuat {tanggal(p.tanggal)}</p>
        </div>
        <StatusPesananBadge status={p.status} />
      </div>

      {p.status !== 'batal' && (
        <ol className="mt-4 flex items-center" aria-label="Tahapan pesanan">
          {ALUR.map((s, i) => (
            <li key={s} className="flex flex-1 items-center last:flex-none">
              <span title={STATUS_PESANAN[s].label} className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${i <= idxAlur ? 'bg-brand-700 text-white' : 'bg-gray-200 text-gray-400'}`}>
                {i < idxAlur ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-2.5 w-2.5 fill-current" />}
              </span>
              {i < ALUR.length - 1 && <span className={`h-0.5 flex-1 ${i < idxAlur ? 'bg-brand-700' : 'bg-gray-200'}`} />}
            </li>
          ))}
        </ol>
      )}

      <div className="mt-5 rounded-2xl bg-gray-50 p-4">
        <div className="flex items-end justify-between">
          <div><p className="text-xs text-gray-500">Total pesanan</p><p className="num text-xl font-extrabold">{rupiah(total)}</p></div>
          <div className="text-right"><p className="text-xs text-gray-500">Sisa tagihan</p><p className={`num text-lg font-extrabold ${sisa > 0 ? 'text-brand-800' : 'text-emerald-700'}`}>{rupiah(sisa)}</p></div>
        </div>
        <div className="mt-3"><ProgressBar nilai={total ? dibayar / total : 0} warna={dpOk ? 'bg-emerald-500' : 'bg-amber-500'} /></div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-[13px]">
          <div><span className="text-gray-500">Target DP {pengaturan.dpPersen}%</span><p className="num font-semibold">{rupiah(dp)} {dpOk ? <Badge nada="hijau" titik={false}>Terpenuhi</Badge> : null}</p></div>
          <div className="text-right"><span className="text-gray-500">Sudah dibayar</span><p className="num font-semibold">{rupiah(dibayar)}</p></div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {lanjut && <Button onClick={klikLanjut} disabled={proses}>{proses ? 'Menyimpan…' : lanjut.label}</Button>}
        {p.status !== 'batal' && sisa > 0 && p.status !== 'draft' && <Button varian="garis" ikon={<Wallet className="h-4 w-4" />} onClick={() => setModalBayar(true)}>Catat pembayaran</Button>}
        {!['selesai', 'batal'].includes(p.status) && <Button varian="hantu" className="text-red-600 hover:bg-red-50 hover:text-red-700" ikon={<XCircle className="h-4 w-4" />} onClick={() => setKonfirmasi('batal')}>Batalkan</Button>}
      </div>

      <h3 className="mt-6 text-sm font-bold">Item ({p.items.length}), total berat {berat(beratTotal)}</h3>
      <ul className="mt-2 divide-y divide-gray-100 rounded-xl border border-gray-200">
        {p.items.map((i) => {
          const pr = cari.produk(i.produkId)!;
          return (
            <li key={i.produkId} className="flex items-center gap-3 px-3 py-2.5">
              <ProductThumb produk={pr} ukuran="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{pr.nama}</p>
                <p className="num text-xs text-gray-500">{qtySatuan(i.qty, pr.satuan)} × {rupiah(i.harga)}</p>
              </div>
              <span className="num text-sm font-bold">{rupiah(nilaiBaris(i.qty, i.harga))}</span>
            </li>
          );
        })}
      </ul>

      <h3 className="mt-6 text-sm font-bold">Riwayat pembayaran</h3>
      {p.pembayaran.length === 0 ? <p className="mt-2 rounded-xl border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500">Belum ada pembayaran.</p> : (
        <ul className="mt-2 space-y-2">
          {p.pembayaran.map((b) => (
            <li key={b.id} className="flex items-center gap-3 rounded-xl border border-gray-200 px-3 py-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-50 text-emerald-700"><Wallet className="h-4 w-4" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold capitalize">{b.jenis === 'dp' ? 'DP' : b.jenis} <span className="font-normal text-gray-500">via {b.metode === 'qris' ? 'QRIS' : b.metode}</span></p>
                <p className="text-xs text-gray-500">{tanggalPendek(b.tanggal)}, {b.id}</p>
              </div>
              <div className="text-right">
                <p className="num text-sm font-bold">{rupiah(b.jumlah)}</p>
                {b.bukti && <button onClick={() => setBukti(b.bukti!)} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline"><FileImage className="h-3 w-3" />Bukti</button>}
              </div>
            </li>
          ))}
        </ul>
      )}

      <h3 className="mt-6 text-sm font-bold">Pengiriman</h3>
      <dl className="mt-2 space-y-2 rounded-xl border border-gray-200 p-3 text-sm">
        <div className="flex gap-2"><Truck className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" /><div><dt className="sr-only">Pelanggan</dt><dd className="font-semibold">{pel?.nama}</dd></div></div>
        <div className="flex gap-2"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" /><dd>{pel?.telepon}</dd></div>
        <div className="flex gap-2"><CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" /><dd>{tanggal(p.jadwalKirim)}{p.jadwalKirim < hariIni() && !['selesai', 'batal'].includes(p.status) && <span className="ml-2"><Badge nada="merah">Terlambat</Badge></span>}</dd></div>
        <div className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" /><dd>{p.alamatKirim}</dd></div>
        {p.catatan && <p className="rounded-lg bg-amber-50 px-3 py-2 text-[13px] text-amber-900">{p.catatan}</p>}
      </dl>

      <BayarPesananModal buka={modalBayar} p={p} dp={dp} onTutup={() => setModalBayar(false)}
        onSimpan={async (b) => {
          const statusBaru = await bayarPesanan(p.id, b);
          setModalBayar(false);
          toast({ jenis: 'sukses', judul: `Pembayaran ${rupiah(b.jumlah)} tersimpan`, pesan: statusBaru !== p.status ? 'DP terpenuhi, status berubah menjadi Dalam proses.' : undefined });
        }} />

      <ConfirmDialog buka={konfirmasi === 'batal'} bahaya judul="Batalkan pesanan?" labelYa="Ya, batalkan"
        pesan={<>Pesanan {p.id} akan dibatalkan.{dibayar > 0 && <> Sudah ada pembayaran <b>{rupiah(dibayar)}</b>; pengembalian dana perlu dicatat terpisah.</>}</>}
        onBatal={() => setKonfirmasi(null)} onYa={() => { void ubah('batal'); setKonfirmasi(null); }} />
      <ConfirmDialog buka={konfirmasi === 'proses_tanpa_dp'} judul="DP belum terpenuhi" labelYa="Tetap proses"
        pesan={<>DP baru {rupiah(dibayar)} dari target {rupiah(dp)}. Sesuai ketentuan, pesanan sebaiknya diproses setelah DP {pengaturan.dpPersen}% diterima.</>}
        onBatal={() => setKonfirmasi(null)} onYa={() => { void ubah('proses'); setKonfirmasi(null); }} />
      <ConfirmDialog buka={konfirmasi === 'selesai_piutang'} judul="Masih ada sisa tagihan" labelYa="Selesai, catat piutang"
        pesan={<>Sisa {rupiah(sisa)} akan tercatat sebagai <b>piutang</b> {pel?.nama} setelah barang diserahkan.</>}
        onBatal={() => setKonfirmasi(null)} onYa={() => { void ubah('selesai'); setKonfirmasi(null); }} />
      <Modal buka={!!bukti} onTutup={() => setBukti(null)} judul="Bukti pembayaran" sub={bukti ?? ''} lebar="sm">
        {bukti && /^https?:\/\//i.test(bukti) ? (
          <a href={bukti} target="_blank" rel="noopener noreferrer" className="btn h-11 w-full bg-brand-700 text-white">Buka bukti pembayaran</a>
        ) : (
          <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-700">Referensi: <b>{bukti}</b></p>
        )}
      </Modal>
    </div>
  );
}

function BayarPesananModal({ buka, p, dp, onTutup, onSimpan }: { buka: boolean; p: PesananPartai; dp: number; onTutup: () => void; onSimpan: (b: { jenis: 'dp' | 'cicilan' | 'pelunasan'; metode: 'tunai' | 'transfer' | 'qris'; jumlah: number; bukti?: string }) => Promise<void> }) {
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState('');
  const dibayar = dibayarPesanan(p);
  const sisa = sisaPesanan(p);
  const kurangDp = Math.max(0, dp - dibayar);
  const [jenis, setJenis] = useState<PembayaranPesanan['jenis']>('dp');
  const [metode, setMetode] = useState<PembayaranPesanan['metode']>('transfer');
  const [jumlah, setJumlah] = useState('');
  const [file, setFile] = useState('');
  useEffect(() => {
    if (!buka) return;
    const j = kurangDp > 0 ? 'dp' : 'pelunasan';
    setJenis(j); setJumlah(String(j === 'dp' ? kurangDp : sisa)); setFile(''); setMetode('transfer'); setGalat('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buka]);
  const n = parseInt(jumlah.replace(/\D/g, ''), 10) || 0;
  const salah = n <= 0 ? 'Isi nominal pembayaran.' : n > sisa ? `Melebihi sisa tagihan ${rupiah(sisa)}.` : '';
  return (
    <Modal buka={buka} onTutup={onTutup} judul="Catat pembayaran pelanggan" sub={`${p.id}, sisa ${rupiah(sisa)}`} lebar="sm"
      footer={<><Button varian="garis" onClick={onTutup} disabled={proses}>Batal</Button><Button disabled={!!salah || proses} onClick={async () => {
        setProses(true); setGalat('');
        try { await onSimpan({ jenis: jenis === 'cicilan' || jenis === 'pelunasan' ? jenis : 'dp', metode, jumlah: n, bukti: file.trim() || undefined }); }
        catch (e) { setGalat(pesanGalat(e)); } finally { setProses(false); }
      }}>{proses ? 'Menyimpan…' : 'Simpan pembayaran'}</Button></>}>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Jenis pembayaran">
          {([['dp', 'DP'], ['cicilan', 'Cicilan'], ['pelunasan', 'Pelunasan']] as const).map(([k, l]) => (
            <button key={k} role="radio" aria-checked={jenis === k} onClick={() => { setJenis(k); if (k === 'pelunasan') setJumlah(String(sisa)); if (k === 'dp') setJumlah(String(kurangDp)); }}
              className={`h-10 rounded-xl text-sm font-semibold ring-1 ring-inset ${jenis === k ? 'bg-brand-50 text-brand-800 ring-brand-400' : 'ring-gray-200'}`}>{l}</button>
          ))}
        </div>
        <div>
          <label className="label" htmlFor="nom">Nominal</label>
          <div className="relative"><span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-500">Rp</span>
            <input id="nom" inputMode="numeric" className="input num pl-10 text-lg font-bold" value={n ? angka(n) : ''} onChange={(e) => setJumlah(e.target.value)} /></div>
          {salah ? <p className="mt-1 text-xs font-medium text-red-600">{salah}</p> : <p className="mt-1 text-xs text-gray-500">Kekurangan DP: {rupiah(kurangDp)}. Uang ini mengurangi sisa tagihan, bukan pendapatan tambahan.</p>}
        </div>
        <div>
          <label className="label" htmlFor="met">Metode</label>
          <select id="met" className="input" value={metode} onChange={(e) => setMetode(e.target.value as PembayaranPesanan['metode'])}>
            <option value="transfer">Transfer</option><option value="tunai">Tunai</option><option value="qris">QRIS</option>
          </select>
        </div>
        <Input label="Link atau nomor referensi bukti (opsional)" value={file} onChange={(e) => setFile(e.target.value)}
          placeholder="mis. link Google Drive foto bukti, atau no. referensi transfer" />
        {galat && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{galat}</p>}
      </div>
    </Modal>
  );
}
