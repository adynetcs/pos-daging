import { panggilGas } from '../_lib/gas.js';
import { kirim, hanyaMetode, type Req, type Res } from '../_lib/http.js';
import { bacaSesi, hapusCookie, type Pengguna } from '../_lib/sesi.js';
import { tanganiGalat } from '../_lib/galat.js';
import { GasError } from '../_lib/gas.js';

/** GET /api/auth/me — pengguna yang sedang login (dicek ulang ke spreadsheet: masih aktif?). */
export default async function handler(req: Req, res: Res) {
  if (!hanyaMetode(req, res, ['GET'])) return;
  const sesi = bacaSesi(req);
  if (!sesi) return kirim(res, 401, { ok: false, error: 'Belum login', kode: 'AUTH' });
  try {
    const u = await panggilGas<Pengguna>('auth.me', {}, sesi.id_pengguna);
    return kirim(res, 200, { ok: true, data: u });
  } catch (e) {
    if (e instanceof GasError && e.kode === 'AUTH') hapusCookie(res);
    return tanganiGalat(res, e);
  }
}
