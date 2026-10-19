import { useState, type FormEvent } from 'react';
import { Loader2, LockKeyhole } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/services/api';
import { USAHA } from '@/data/dummy';

export default function Login() {
  const { login, galat: galatAwal } = useAuth();
  const [akun, setAkun] = useState('');
  const [pin, setPin] = useState('');
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState<string | null>(galatAwal);

  const kirim = async (e: FormEvent) => {
    e.preventDefault();
    if (!akun.trim() || pin.length !== 6) { setGalat('Isi username dan PIN 6 digit.'); return; }
    setProses(true);
    setGalat(null);
    try {
      await login(akun.trim(), pin);
    } catch (err) {
      setGalat(err instanceof ApiError ? err.message : 'Login gagal. Coba lagi.');
      setPin('');
    } finally {
      setProses(false);
    }
  };

  return (
    <div className="flex min-h-full items-center justify-center bg-ink-900 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center text-white">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-700"><LockKeyhole className="h-7 w-7" /></span>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight">{USAHA.nama}</h1>
          <p className="mt-1 text-sm text-white/60">Masuk untuk melanjutkan</p>
        </div>
        <form onSubmit={kirim} className="rounded-2xl bg-white p-5 shadow-pop">
          <label className="label" htmlFor="akun">Username</label>
          <input id="akun" type="text" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} className="input" value={akun}
            onChange={(e) => setAkun(e.target.value)} placeholder="mis. ady (atau email)" />
          <label className="label mt-4" htmlFor="pin">PIN</label>
          <input id="pin" type="password" autoComplete="current-password" inputMode="numeric" maxLength={6}
            className="input num text-center text-2xl tracking-[0.5em]" value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="••••••" />
          {galat && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{galat}</p>}
          <button type="submit" disabled={proses} className="btn mt-5 h-12 w-full bg-brand-700 text-white hover:bg-brand-800">
            {proses ? <><Loader2 className="h-4 w-4 animate-spin" />Memeriksa…</> : 'Masuk'}
          </button>
          <p className="mt-4 text-center text-xs text-gray-500">Lupa PIN? Minta pemilik usaha mengatur ulang PIN Anda.</p>
        </form>
      </div>
    </div>
  );
}
