import type { ComponentType } from 'react';
import { DataProvider } from '@/context/DataContext';
import { ToastProvider } from '@/context/ToastContext';
import { NavProvider, useNav } from '@/context/NavContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import Login from '@/pages/Login';
import { AppLayout } from '@/components/layout/AppLayout';
import type { PageKey } from '@/types';
import { useEffect } from 'react';
import { bolehBuka, halamanAwal } from '@/components/layout/menu';
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

function Gerbang() {
  const { pengguna, memuat } = useAuth();
  if (memuat) {
    return (
      <div className="grid min-h-screen place-items-center bg-ink-900 text-white/70" style={{ minHeight: '100dvh' }}>
        <p className="text-sm">Memeriksa sesi…</p>
      </div>
    );
  }
  if (!pengguna) return <Login />;
  return (
    <DataProvider>
      <NavProvider>
        <Halaman />
      </NavProvider>
    </DataProvider>
  );
}

function Halaman() {
  const { halaman, buka } = useNav();
  const { pengguna } = useAuth();
  const boleh = !!pengguna && bolehBuka(pengguna.peran, halaman);
  useEffect(() => { if (pengguna && !boleh) buka(halamanAwal(pengguna.peran)); }, [boleh, pengguna, buka]);
  const H = HALAMAN[boleh ? halaman : halamanAwal(pengguna!.peran)];
  return <AppLayout><H key={halaman} /></AppLayout>;
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Gerbang />
      </AuthProvider>
    </ToastProvider>
  );
}
