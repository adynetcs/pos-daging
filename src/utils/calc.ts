import type { ItemTransaksi } from '@/types';

/**
 * Uang dihitung dalam rupiah bulat. Berat disimpan dalam kg dengan presisi gram
 * (3 desimal) agar tidak terjadi galat pembulatan floating point.
 */
export const bulatkanBerat = (kg: number) => Math.round(kg * 1000) / 1000;
export const nilaiBaris = (qty: number, harga: number) => Math.round(bulatkanBerat(qty) * harga);
export const totalItems = (items: ItemTransaksi[]) =>
  items.reduce((s, i) => s + nilaiBaris(i.qty, i.harga), 0);
export const jumlah = <T,>(arr: T[], f: (x: T) => number) => arr.reduce((s, x) => s + f(x), 0);

export const DP_PERSEN_DEFAULT = 0.7;
/** Target DP dibulatkan ke atas ke kelipatan Rp1.000 */
export const targetDP = (total: number, persen = DP_PERSEN_DEFAULT) =>
  Math.ceil((total * persen) / 1000) * 1000;
