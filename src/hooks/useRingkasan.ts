import { useMemo } from 'react';
import { useData } from '@/context/DataContext';
import { hariIni } from '@/utils/waktu';
import * as F from '@/utils/finance';

/** Ringkasan bisnis yang dipakai bersama Dashboard, Keuangan, dan Laporan. */
export function useRingkasan() {
  const d = useData();
  return useMemo(() => {
    const HARI_INI = hariIni();
    const hari7 = F.rentangHari(HARI_INI, 7);
    const harian = F.penjualanHarian(d, hari7);
    const ini = harian[harian.length - 1];
    const kemarin = harian[harian.length - 2];
    return {
      harian,
      omzetHariIni: ini.nilai,
      trxHariIni: ini.transaksi,
      perubahan: kemarin.nilai ? (ini.nilai - kemarin.nilai) / kemarin.nilai : 0,
      pesananAktif: d.pesanan.filter((p) => F.STATUS_AKTIF.includes(p.status)),
      stokMenipis: d.produk.filter((p) => p.aktif && p.stok < p.stokMinimum),
      piutang: F.piutang(d),
      saldoKas: F.saldoKas(d),
      kategori: F.penjualanPerKategori(d, { dari: hari7[0], sampai: HARI_INI }),
    };
  }, [d]);
}
