import type { ComponentType } from 'react';
import { DataProvider } from '@/context/DataContext';
import { ToastProvider } from '@/context/ToastContext';
import { NavProvider, useNav } from '@/context/NavContext';
import { AppLayout } from '@/components/layout/AppLayout';
import type { PageKey } from '@/types';
import Dashboard from '@/pages/Dashboard';
import Kasir from '@/pages/Kasir';
import PesananPartai from '@/pages/PesananPartai';
import Produk from '@/pages/Produk';
import Stok from '@/pages/Stok';
import Pembelian from '@/pages/Pembelian';
import Pelanggan from '@/pages/Pelanggan';
import Supplier from '@/pages/Supplier';
import Keuangan from '@/pages/Keuangan';
import Laporan from '@/pages/Laporan';
import Pengaturan from '@/pages/Pengaturan';

const HALAMAN: Record<PageKey, ComponentType> = {
  dashboard: Dashboard, kasir: Kasir, pesanan: PesananPartai, produk: Produk, stok: Stok,
  pembelian: Pembelian, pelanggan: Pelanggan, supplier: Supplier, keuangan: Keuangan,
  laporan: Laporan, pengaturan: Pengaturan,
};

function Halaman() {
  const { halaman } = useNav();
  const H = HALAMAN[halaman];
  return <AppLayout><H key={halaman} /></AppLayout>;
}

export default function App() {
  return (
    <ToastProvider>
      <DataProvider>
        <NavProvider>
          <Halaman />
        </NavProvider>
      </DataProvider>
    </ToastProvider>
  );
}
