/**
 * Tipe minimal untuk Vercel Node.js Functions (tanpa dependensi tambahan).
 * Vercel mengisi req.body (JSON sudah di-parse) dan menyediakan res.status().json().
 */
import type { IncomingMessage, ServerResponse } from 'node:http';

export interface Req extends IncomingMessage {
  body?: unknown;
  query?: Record<string, string | string[]>;
}
export interface Res extends ServerResponse {
  status(code: number): Res;
  json(body: unknown): Res;
}

export function kirim(res: Res, status: number, body: unknown) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).json(body);
}

export function hanyaMetode(req: Req, res: Res, metode: string[]): boolean {
  if (metode.includes(req.method ?? '')) return true;
  res.setHeader('Allow', metode.join(', '));
  kirim(res, 405, { ok: false, error: 'Metode tidak diizinkan', kode: 'METHOD' });
  return false;
}

export function bodyJson(req: Req): Record<string, unknown> {
  const b = req.body;
  if (!b) return {};
  if (typeof b === 'string') {
    try { return JSON.parse(b) as Record<string, unknown>; } catch { return {}; }
  }
  return typeof b === 'object' ? (b as Record<string, unknown>) : {};
}

/** Tolak permintaan tulis dari situs lain (perlindungan CSRF tambahan selain SameSite cookie). */
export function asalSama(req: Req): boolean {
  const origin = req.headers.origin;
  if (!origin) return true; // permintaan same-origin dari browser lama / alat uji
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}

export function env(nama: string): string {
  const v = process.env[nama];
  if (!v) throw Object.assign(new Error(`Environment variable ${nama} belum diatur di Vercel`), { kode: 'CONFIG' });
  return v;
}
