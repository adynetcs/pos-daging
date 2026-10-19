import {
  LayoutDashboard, ShoppingCart, ClipboardList, Beef, Warehouse, Truck, Users, Factory, Wallet, FileBarChart, Settings,
  type LucideIcon,
} from 'lucide-react';
import type { PageKey } from '@/types';
import type { Peran } from '@/services/api';

export interface ItemMenu { key: PageKey; label: string; ikon: LucideIcon; grup: 'operasional' | 'data' | 'bisnis' }

/** Halaman yang boleh dibuka per peran. Apps Script tetap memeriksa ulang setiap aksi data. */
const AKSES: Record<Peran, PageKey[] | 'semua'> = {
  pemilik: 'semua',
  admin: ['dashboard', 'kasir', 'pesanan', 'produk', 'stok', 'pembelian', 'pelanggan', 'supplier'],
  kasir: ['kasir', 'pesanan', 'produk', 'stok', 'pelanggan'],
};
export const bolehBuka = (peran: Peran, k: PageKey) => AKSES[peran] === 'semua' || (AKSES[peran] as PageKey[]).includes(k);
export const MENU: ItemMenu[] = [
  { key: 'dashboard', label: 'Dashboard', ikon: LayoutDashboard, grup: 'operasional' },
  { key: 'kasir', label: 'Kasir / Penjualan', ikon: ShoppingCart, grup: 'operasional' },
  { key: 'pesanan', label: 'Pesanan Partai', ikon: ClipboardList, grup: 'operasional' },
  { key: 'produk', label: 'Produk', ikon: Beef, grup: 'data' },
  { key: 'stok', label: 'Stok', ikon: Warehouse, grup: 'data' },
  { key: 'pembelian', label: 'Pembelian', ikon: Truck, grup: 'data' },
  { key: 'pelanggan', label: 'Pelanggan', ikon: Users, grup: 'data' },
  { key: 'supplier', label: 'Supplier', ikon: Factory, grup: 'data' },
  { key: 'keuangan', label: 'Keuangan', ikon: Wallet, grup: 'bisnis' },
  { key: 'laporan', label: 'Laporan', ikon: FileBarChart, grup: 'bisnis' },
  { key: 'pengaturan', label: 'Pengaturan', ikon: Settings, grup: 'bisnis' },
];
export const menuUntuk = (peran: Peran) => MENU.filter((m) => bolehBuka(peran, m.key));
export const halamanAwal = (peran: Peran): PageKey => (bolehBuka(peran, 'dashboard') ? 'dashboard' : 'kasir');
export const labelHalaman = (k: PageKey) => MENU.find((m) => m.key === k)?.label ?? '';
