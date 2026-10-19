/**
 * Lapisan service untuk integrasi Google Apps Script (tahap berikutnya).
 *
 * Status saat ini: MODE DEMO. Aplikasi memakai data contoh di memori (src/data/dummy.ts)
 * dan TIDAK mengirim apa pun ke server. Fungsi di bawah sengaja melempar error jika
 * dipanggil tanpa VITE_GAS_URL, supaya tidak ada "koneksi palsu".
 *
 * Konvensi:
 * - POST memakai Content-Type: text/plain agar tidak memicu CORS preflight di GAS.
 * - Tidak ada kredensial rahasia di frontend. Otorisasi dilakukan di sisi GAS
 *   (mis. token sesi hasil login), bukan API key yang ditanam di bundle.
 */
import type {
  MutasiStok, Pelanggan, Pembelian, Pengeluaran, PesananPartai, Produk, TransaksiEceran,
} from '@/types';

export const DATA_MODE: 'demo' | 'gas' =
  import.meta.env.VITE_DATA_MODE === 'gas' && import.meta.env.VITE_GAS_URL ? 'gas' : 'demo';
export const IS_DEMO = DATA_MODE === 'demo';

const GAS_URL = (import.meta.env.VITE_GAS_URL as string | undefined) ?? '';

export interface ApiResponse<T> { ok: boolean; data?: T; error?: string }

export class ApiBelumTerhubung extends Error {
  constructor() { super('Backend belum terhubung. Aplikasi berjalan dalam mode DEMO.'); }
}

async function call<T>(action: string, payload?: unknown): Promise<T> {
  if (IS_DEMO) throw new ApiBelumTerhubung();
  const res = await fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, payload }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as ApiResponse<T>;
  if (!json.ok) throw new Error(json.error ?? 'Permintaan gagal');
  return json.data as T;
}

/** Endpoint yang disiapkan. Nama action akan dipetakan ke handler doPost() di GAS. */
export const api = {
  produk: {
    list: () => call<Produk[]>('produk.list'),
    simpan: (p: Produk) => call<Produk>('produk.simpan', p),
  },
  pelanggan: { list: () => call<Pelanggan[]>('pelanggan.list') },
  transaksi: {
    list: (dari: string, sampai: string) => call<TransaksiEceran[]>('transaksi.list', { dari, sampai }),
    simpan: (t: TransaksiEceran) => call<TransaksiEceran>('transaksi.simpan', t),
  },
  pesanan: {
    list: () => call<PesananPartai[]>('pesanan.list'),
    simpan: (p: PesananPartai) => call<PesananPartai>('pesanan.simpan', p),
    ubahStatus: (id: string, status: PesananPartai['status']) => call<void>('pesanan.status', { id, status }),
  },
  pembelian: { list: () => call<Pembelian[]>('pembelian.list') },
  stok: { mutasi: (m: MutasiStok) => call<MutasiStok>('stok.mutasi', m) },
  pengeluaran: { simpan: (e: Pengeluaran) => call<Pengeluaran>('pengeluaran.simpan', e) },
};
