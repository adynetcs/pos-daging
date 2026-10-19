import { useCallback, useEffect, useState } from 'react';
import { api, IS_DEMO, type ProdukSheet } from '@/services/api';
import type { Produk } from '@/types';

/** Ubah baris Sheets ke bentuk Produk yang dipakai komponen UI. */
export const dariSheet = (p: ProdukSheet): Produk => ({
  id: p.id_produk, sku: p.sku, nama: p.nama,
  kategori: p.kategori === 'lainnya' ? 'kemasan' : p.kategori,
  potongan: p.potongan || '-', tipe: p.tipe, satuan: p.satuan,
  hpp: p.hpp, hargaJual: p.harga_jual, stok: p.stok, stokMinimum: p.stok_minimum,
  aktif: p.aktif, keterangan: p.keterangan || undefined,
});

const keSheet = (p: Produk, baru: boolean) => ({
  id_produk: baru ? '' : p.id, sku: p.sku, nama: p.nama, kategori: p.kategori, potongan: p.potongan,
  tipe: p.tipe, satuan: p.satuan, hpp: p.hpp, harga_jual: p.hargaJual, stok_minimum: p.stokMinimum,
  aktif: p.aktif, keterangan: p.keterangan ?? '',
});

/** Produk dari Google Sheets (mode api). Di mode demo hook ini tidak melakukan apa pun. */
export function useProdukSheet() {
  const [daftar, setDaftar] = useState<Produk[]>([]);
  const [memuat, setMemuat] = useState(!IS_DEMO);
  const [galat, setGalat] = useState<string | null>(null);

  const muatUlang = useCallback(async () => {
    if (IS_DEMO) return;
    setMemuat(true);
    setGalat(null);
    try {
      setDaftar((await api.rpc<ProdukSheet[]>('produk.list')).map(dariSheet));
    } catch (e) {
      setGalat((e as Error).message);
    } finally {
      setMemuat(false);
    }
  }, []);

  useEffect(() => { void muatUlang(); }, [muatUlang]);

  const simpan = useCallback(async (p: Produk, baru: boolean) => {
    const r = await api.rpc<{ id_produk: string }>('produk.simpan', keSheet(p, baru));
    await muatUlang();
    return r.id_produk;
  }, [muatUlang]);

  return { daftar, memuat, galat, muatUlang, simpan };
}
