import { panggilGas } from '../_lib/gas.js';
import { asalSama, bodyJson, kirim, hanyaMetode, type Req, type Res } from '../_lib/http.js';
import { buatCookie, type Pengguna } from '../_lib/sesi.js';
import { tanganiGalat } from '../_lib/galat.js';

/** POST /api/auth/login  { login, pin }  — login = username atau email */
export default async function handler(req: Req, res: Res) {
  if (!hanyaMetode(req, res, ['POST'])) return;
  if (!asalSama(req)) return kirim(res, 403, { ok: false, error: 'Asal permintaan tidak diizinkan', kode: 'ORIGIN' });
  const { login, pin } = bodyJson(req);
  if (typeof login !== 'string' || !login.trim() || login.length > 100 || typeof pin !== 'string' || !/^\d{6}$/.test(pin)) {
    return kirim(res, 422, { ok: false, error: 'Username dan PIN 6 digit wajib diisi', kode: 'VALIDASI' });
  }
  try {
    const u = await panggilGas<Pengguna>('auth.login', { login: login.trim().toLowerCase(), pin });
    buatCookie(res, u);
    return kirim(res, 200, { ok: true, data: u });
  } catch (e) {
    return tanganiGalat(res, e);
  }
}
