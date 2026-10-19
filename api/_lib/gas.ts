/**
 * Pemanggil Google Apps Script. Hanya berjalan di server Vercel.
 * GAS_URL dan GAS_SECRET tidak pernah dikirim ke browser.
 */
import { randomUUID } from 'node:crypto';
import { env } from './http.js';

export interface GasHasil<T = unknown> { ok: boolean; data?: T; error?: string; kode?: string }

export class GasError extends Error {
  constructor(message: string, public kode: string, public status = 502) { super(message); }
}

export async function panggilGas<T = unknown>(action: string, payload: unknown = {}, userId?: string, requestId?: string): Promise<T> {
  const url = env('GAS_URL');
  const secret = env('GAS_SECRET');
  const ctrl = new AbortController();
  const batas = setTimeout(() => ctrl.abort(), 25_000);
  let teks = '';
  try {
    // Apps Script membalas 302 ke googleusercontent; fetch mengikutinya otomatis.
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ secret, action, payload, userId, requestId: requestId ?? randomUUID() }),
      redirect: 'follow',
      signal: ctrl.signal,
    });
    teks = await r.text();
    if (!r.ok) throw new GasError(`Apps Script membalas HTTP ${r.status}`, 'GAS_HTTP');
  } catch (e) {
    if (e instanceof GasError) throw e;
    if ((e as Error).name === 'AbortError') throw new GasError('Apps Script tidak merespons dalam 25 detik', 'GAS_TIMEOUT', 504);
    throw new GasError('Tidak bisa menghubungi Apps Script', 'GAS_NETWORK');
  } finally {
    clearTimeout(batas);
  }

  let hasil: GasHasil<T>;
  try {
    hasil = JSON.parse(teks) as GasHasil<T>;
  } catch {
    // Biasanya halaman HTML: deployment salah akses, belum di-deploy ulang, atau URL keliru.
    const judul = /<title>([^<]*)<\/title>/i.exec(teks)?.[1]?.trim();
    throw new GasError(`Jawaban Apps Script bukan JSON${judul ? ` (${judul})` : ''}. Periksa GAS_URL dan pengaturan deploy (Execute as: Me, Who has access: Anyone).`, 'GAS_FORMAT');
  }
  if (!hasil.ok) {
    const status = hasil.kode === 'AUTH' ? 401 : hasil.kode === 'FORBIDDEN' ? 403 : hasil.kode === 'VALIDASI' ? 422 : hasil.kode === 'TERKUNCI' ? 429 : hasil.kode === 'NOT_FOUND' ? 404 : 502;
    throw new GasError(hasil.error ?? 'Apps Script menolak permintaan', hasil.kode ?? 'GAS_ERROR', status);
  }
  return hasil.data as T;
}
