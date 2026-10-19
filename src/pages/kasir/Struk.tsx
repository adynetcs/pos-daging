import { Printer } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useData, useLookup } from '@/context/DataContext';
import { USAHA } from '@/data/dummy';
import type { TransaksiEceran } from '@/types';
import { nilaiBaris } from '@/utils/calc';
import { qtySatuan, rupiah, tanggalJam } from '@/utils/format';
import { subtotalTrx, totalTrx } from '@/utils/finance';

const labelMetode = (m: string) => (m === 'qris' ? 'QRIS' : m.charAt(0).toUpperCase() + m.slice(1));

export function StrukKertas({ trx, diterima, kembalian }: { trx: TransaksiEceran; diterima?: number; kembalian?: number }) {
  const cari = useLookup();
  const { pengaturan } = useData();
  const garis = <div className="my-2 border-t border-dashed border-gray-400" />;
  return (
    <div className={`mx-auto bg-white px-4 py-5 font-mono text-[12px] leading-snug text-gray-900 shadow-card ring-1 ring-gray-200 ${pengaturan.strukLebar === '58mm' ? 'max-w-[280px]' : 'max-w-[360px]'}`}>
      <div className="text-center">
        {pengaturan.tampilLogoStruk && <p className="text-lg">🥩</p>}
        <p className="text-sm font-bold">{USAHA.nama.toUpperCase()}</p>
        <p>{USAHA.alamat}</p>
        <p>Telp {USAHA.telepon}</p>
      </div>
      {garis}
      <div className="flex justify-between"><span>No</span><span>{trx.id}</span></div>
      <div className="flex justify-between"><span>Waktu</span><span>{tanggalJam(trx.tanggal)}</span></div>
      <div className="flex justify-between"><span>Pelanggan</span><span className="truncate pl-2">{cari.pelanggan(trx.pelangganId)?.nama}</span></div>
      {garis}
      {trx.items.map((i) => {
        const p = cari.produk(i.produkId)!;
        return (
          <div key={i.produkId} className="mb-1">
            <p>{p.nama}</p>
            <div className="flex justify-between pl-2"><span>{qtySatuan(i.qty, p.satuan)} x {rupiah(i.harga)}</span><span>{rupiah(nilaiBaris(i.qty, i.harga))}</span></div>
          </div>
        );
      })}
      {garis}
      <div className="flex justify-between"><span>Subtotal</span><span>{rupiah(subtotalTrx(trx))}</span></div>
      {trx.diskon > 0 && <div className="flex justify-between"><span>Diskon</span><span>-{rupiah(trx.diskon)}</span></div>}
      <div className="flex justify-between text-sm font-bold"><span>TOTAL</span><span>{rupiah(totalTrx(trx))}</span></div>
      {garis}
      {trx.pembayaran.map((b) => <div key={b.metode} className="flex justify-between"><span>{labelMetode(b.metode)}</span><span>{rupiah(b.metode === 'tunai' && diterima ? diterima : b.jumlah)}</span></div>)}
      {!!kembalian && <div className="flex justify-between"><span>Kembali</span><span>{rupiah(kembalian)}</span></div>}
      {garis}
      <p className="text-center">{pengaturan.strukFooter}</p>
      <p className="mt-2 text-center text-[10px] text-gray-500">STRUK DEMO, BUKAN BUKTI TRANSAKSI SAH</p>
    </div>
  );
}

export function StrukModal({ trx, diterima, kembalian, onTutup }: { trx: TransaksiEceran | null; diterima?: number; kembalian?: number; onTutup: () => void }) {
  if (!trx) return null;
  return (
    <Modal buka onTutup={onTutup} judul="Pembayaran berhasil (simulasi)" sub="Pratinjau struk" lebar="sm"
      footer={<><Button varian="garis" ikon={<Printer className="h-4 w-4" />} onClick={() => window.print()}>Cetak</Button><Button onClick={onTutup}>Transaksi baru</Button></>}>
      <div className="print-area rounded-xl bg-gray-100 p-4"><StrukKertas trx={trx} diterima={diterima} kembalian={kembalian} /></div>
    </Modal>
  );
}
