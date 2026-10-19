import { randomUUID } from 'node:crypto';
import { panggilGas, GasError } from './_lib/gas.js';
import { asalSama, bodyJson, kirim, hanyaMetode, type Req, type Res } from './_lib/http.js';
import { bacaSesi, hapusCookie } from './_lib/sesi.js';
import { tanganiGalat } from './_lib/galat.js';

/**
 * POST /api/rpc  { action, payload, requestId? }
 * Satu pintu untuk semua aksi data. Identitas pengguna diambil dari cookie sesi,
 * BUKAN dari body, sehingga browser tidak bisa mengaku sebagai orang lain.
 * Hak akses per aksi diperiksa ulang di Apps Script.
 */
const AKSI_DIIZINKAN = new Set([
  'pengguna.list', 'pengguna.simpan', 'pengguna.aturPin',
  'data.ringkasan',
  'produk.list', 'produk.simpan',
]);

export default async function handler(req: Req, res: Res) {
  if (!hanyaMetode(req, res, ['POST'])) return;
  if (!asalSama(req)) return kirim(res, 403, { ok: false, error: 'Asal permintaan tidak diizinkan', kode: 'ORIGIN' });
  const sesi = bacaSesi(req);
  if (!sesi) return kirim(res, 401, { ok: false, error: 'Sesi berakhir, silakan login lagi', kode: 'AUTH' });

  const { action, payload, requestId } = bodyJson(req);
  if (typeof action !== 'string' || !AKSI_DIIZINKAN.has(action)) {
    return kirim(res, 400, { ok: false, error: 'Aksi tidak diizinkan', kode: 'BAD_ACTION' });
  }
  try {
    const data = await panggilGas(action, payload ?? {}, sesi.id_pengguna, typeof requestId === 'string' ? requestId : randomUUID());
    return kirim(res, 200, { ok: true, data });
  } catch (e) {
    if (e instanceof GasError && e.kode === 'AUTH') hapusCookie(res);
    return tanganiGalat(res, e);
  }
}
