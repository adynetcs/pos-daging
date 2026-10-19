/**
 * Sesi login: token bertanda tangan HMAC di cookie HttpOnly.
 * Browser tidak bisa membaca atau memalsukan isinya.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { env, type Req, type Res } from './http.js';

export interface Pengguna { id_pengguna: string; nama: string; username: string; email: string; peran: 'pemilik' | 'admin' | 'kasir' }
interface IsiToken extends Pengguna { exp: number }

const NAMA_COOKIE = 'posdaging_sesi';
const DURASI_DETIK = 12 * 60 * 60; // 12 jam, satu shift kerja

const b64 = (s: string | Buffer) => Buffer.from(s).toString('base64url');
const tanda = (data: string) => createHmac('sha256', env('SESSION_SECRET')).update(data).digest('base64url');

export function buatCookie(res: Res, u: Pengguna) {
  const isi: IsiToken = { id_pengguna: u.id_pengguna, nama: u.nama, username: u.username, email: u.email, peran: u.peran, exp: Math.floor(Date.now() / 1000) + DURASI_DETIK };
  const data = b64(JSON.stringify(isi));
  const token = `${data}.${tanda(data)}`;
  res.setHeader('Set-Cookie', `${NAMA_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${DURASI_DETIK}`);
}

export function hapusCookie(res: Res) {
  res.setHeader('Set-Cookie', `${NAMA_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
}

export function bacaSesi(req: Req): Pengguna | null {
  const cookie = req.headers.cookie ?? '';
  const m = cookie.split(/;\s*/).find((c) => c.startsWith(`${NAMA_COOKIE}=`));
  if (!m) return null;
  const token = m.slice(NAMA_COOKIE.length + 1);
  const [data, sig] = token.split('.');
  if (!data || !sig) return null;
  const harus = Buffer.from(tanda(data));
  const ada = Buffer.from(sig);
  if (harus.length !== ada.length || !timingSafeEqual(harus, ada)) return null;
  try {
    const isi = JSON.parse(Buffer.from(data, 'base64url').toString()) as IsiToken;
    if (!isi.exp || isi.exp < Date.now() / 1000) return null;
    return { id_pengguna: isi.id_pengguna, nama: isi.nama, username: isi.username ?? '', email: isi.email, peran: isi.peran };
  } catch {
    return null;
  }
}
