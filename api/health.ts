import { panggilGas } from './_lib/gas.js';
import { kirim, hanyaMetode, type Req, type Res } from './_lib/http.js';
import { tanganiGalat } from './_lib/galat.js';

/** GET /api/health — cek konfigurasi Vercel dan koneksi ke Apps Script + Spreadsheet. */
export default async function handler(req: Req, res: Res) {
  if (!hanyaMetode(req, res, ['GET'])) return;
  const konfigurasi = {
    GAS_URL: !!process.env.GAS_URL,
    GAS_SECRET: !!process.env.GAS_SECRET,
    SESSION_SECRET: !!process.env.SESSION_SECRET,
  };
  if (!konfigurasi.GAS_URL || !konfigurasi.GAS_SECRET || !konfigurasi.SESSION_SECRET) {
    return kirim(res, 500, { ok: false, kode: 'CONFIG', error: 'Environment variable di Vercel belum lengkap', data: { konfigurasi } });
  }
  const mulai = Date.now();
  try {
    const gas = await panggilGas('health');
    return kirim(res, 200, { ok: true, data: { konfigurasi, latensi_ms: Date.now() - mulai, gas } });
  } catch (e) {
    return tanganiGalat(res, e);
  }
}
