/**
 * Lapisan service frontend.
 *
 * Mode:
 *   demo  data contoh di memori (src/data/dummy.ts), tidak ada panggilan server
 *   api   semua data lewat /api di Vercel → Google Apps Script → Google Sheets
 *
 * Browser hanya bicara ke /api di domain yang sama. URL Apps Script dan semua kunci
 * rahasia hanya ada di server Vercel. Login memakai cookie HttpOnly.
 */

export const DATA_MODE: 'demo' | 'api' = import.meta.env.VITE_DATA_MODE === 'api' ? 'api' : 'demo';
export const IS_DEMO = DATA_MODE === 'demo';

export type Peran = 'pemilik' | 'admin' | 'kasir';
export interface PenggunaSesi { id_pengguna: string; nama: string; username: string; email: string; peran: Peran }

export class ApiError extends Error {
  constructor(message: string, public kode: string, public status: number) { super(message); }
}

interface Jawaban<T> { ok: boolean; data?: T; error?: string; kode?: string }

async function minta<T>(url: string, init?: RequestInit): Promise<T> {
  let r: Response;
  try {
    r = await fetch(url, { credentials: 'same-origin', ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) } });
  } catch {
    throw new ApiError('Tidak ada koneksi internet atau server tidak bisa dihubungi', 'NETWORK', 0);
  }
  let j: Jawaban<T>;
  try {
    j = (await r.json()) as Jawaban<T>;
  } catch {
    throw new ApiError(`Server membalas tidak terduga (HTTP ${r.status})`, 'FORMAT', r.status);
  }
  if (!r.ok || !j.ok) throw new ApiError(j.error ?? `Permintaan gagal (HTTP ${r.status})`, j.kode ?? 'ERROR', r.status);
  return j.data as T;
}

/** Kunci unik per permintaan tulis, untuk mencegah data ganda bila tombol tertekan dua kali. */
export const idPermintaan = () =>
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const api = {
  health: () => minta<KesehatanServer>('/api/health'),
  login: (login: string, pin: string) => minta<PenggunaSesi>('/api/auth/login', { method: 'POST', body: JSON.stringify({ login, pin }) }),
  logout: () => minta<void>('/api/auth/logout', { method: 'POST', body: '{}' }),
  me: () => minta<PenggunaSesi>('/api/auth/me'),
  rpc: <T,>(action: string, payload: unknown = {}) =>
    minta<T>('/api/rpc', { method: 'POST', body: JSON.stringify({ action, payload, requestId: idPermintaan() }) }),
};

export interface KesehatanServer {
  konfigurasi: Record<string, boolean>;
  latensi_ms: number;
  gas: { api_versi: string; skema_versi: string; waktu_server: string; spreadsheet: string; tab_hilang: string[]; pengguna_dengan_pin: number };
}

/* ---------- Bentuk data dari Sheets ---------- */
export interface ProdukSheet {
  id_produk: string; sku: string; nama: string; kategori: 'sapi' | 'ayam' | 'kambing' | 'kemasan' | 'lainnya';
  potongan: string; tipe: 'timbang' | 'kemasan'; satuan: 'kg' | 'pcs'; hpp: number; harga_jual: number;
  stok_minimum: number; aktif: boolean; keterangan: string; stok: number;
}
export interface PenggunaSheet extends PenggunaSesi { aktif: boolean; punya_pin: boolean; terkunci: boolean }
