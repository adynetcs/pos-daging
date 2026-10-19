import { GasError } from './gas.js';
import { kirim, type Res } from './http.js';

/** Ubah error apa pun menjadi jawaban JSON yang konsisten tanpa membocorkan detail rahasia. */
export function tanganiGalat(res: Res, e: unknown) {
  if (e instanceof GasError) return kirim(res, e.status, { ok: false, error: e.message, kode: e.kode });
  const err = e as Error & { kode?: string };
  if (err?.kode === 'CONFIG') return kirim(res, 500, { ok: false, error: err.message, kode: 'CONFIG' });
  console.error(e);
  return kirim(res, 500, { ok: false, error: 'Terjadi kesalahan di server', kode: 'SERVER' });
}
