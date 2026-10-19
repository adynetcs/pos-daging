import { kirim, hanyaMetode, type Req, type Res } from '../_lib/http.js';
import { hapusCookie } from '../_lib/sesi.js';

/** POST /api/auth/logout */
export default function handler(req: Req, res: Res) {
  if (!hanyaMetode(req, res, ['POST'])) return;
  hapusCookie(res);
  return kirim(res, 200, { ok: true });
}
