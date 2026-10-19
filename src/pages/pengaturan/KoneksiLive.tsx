import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, RefreshCw, XCircle } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/States';
import { api, type KesehatanServer } from '@/services/api';
import { angka } from '@/utils/format';

/** Satu baris status. Didefinisikan di luar komponen agar identitasnya stabil antar-render. */
function Baris({ ok, label, nilai }: { ok: boolean; label: string; nilai?: string }) {
  return (
    <li className="flex items-start gap-2.5 py-2 text-sm">
      {ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />}
      <span className="flex-1">{label}</span>
      {nilai && <span className="num text-gray-500">{nilai}</span>}
    </li>
  );
}

/** Status koneksi Vercel → Apps Script → Google Sheets, diuji langsung. */
export function KoneksiLive() {
  const [h, setH] = useState<KesehatanServer | null>(null);
  const [tab, setTab] = useState<{ tab: string; baris: number | null }[]>([]);
  const [galat, setGalat] = useState<string | null>(null);
  const [memuat, setMemuat] = useState(true);

  const uji = useCallback(async () => {
    setMemuat(true); setGalat(null);
    try {
      const [kes, ring] = await Promise.all([api.health(), api.rpc<{ tab: string; baris: number | null }[]>('data.ringkasan')]);
      setH(kes); setTab(ring);
    } catch (e) { setGalat((e as Error).message); setH(null); } finally { setMemuat(false); }
  }, []);
  useEffect(() => { void uji(); }, [uji]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader judul="Koneksi data" sub="Browser → Vercel → Apps Script → Google Sheets"
          aksi={<Button ukur="sm" varian="garis" ikon={<RefreshCw className="h-4 w-4" />} onClick={() => void uji()} disabled={memuat}>Uji ulang</Button>} />
        <div className="px-5 pb-5">
          {memuat ? <LoadingState baris={3} /> : galat ? (
            <div className="rounded-xl bg-red-50 p-4 text-sm text-red-800"><p className="font-bold">Koneksi gagal</p><p className="mt-1">{galat}</p></div>
          ) : h && (
            <ul className="divide-y divide-gray-100">
              {Object.entries(h.konfigurasi).map(([k, v]) => <Baris key={k} ok={v} label={`Environment variable ${k}`} nilai={v ? 'terisi' : 'kosong'} />)}
              <Baris ok label="Apps Script merespons" nilai={`${angka(h.latensi_ms)} ms`} />
              <Baris ok label={`Spreadsheet: ${h.gas.spreadsheet}`} nilai={`skema ${h.gas.skema_versi}`} />
              <Baris ok={h.gas.tab_hilang.length === 0} label={h.gas.tab_hilang.length ? `Tab hilang: ${h.gas.tab_hilang.join(', ')}` : 'Semua tab database lengkap'} />
              <Baris ok={h.gas.pengguna_dengan_pin > 0} label="Pengguna dengan PIN" nilai={String(h.gas.pengguna_dengan_pin)} />
              <Baris ok label="Waktu server" nilai={`${h.gas.waktu_server} WIB`} />
            </ul>
          )}
        </div>
      </Card>
      {!memuat && !galat && tab.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader judul="Isi database" sub="Jumlah baris data per tab" />
          <ul className="grid grid-cols-2 gap-px border-t border-gray-100 bg-gray-100 sm:grid-cols-3">
            {tab.map((t) => (
              <li key={t.tab} className="flex items-center justify-between bg-white px-4 py-2.5 text-sm">
                <span className="truncate text-gray-600">{t.tab}</span><span className="num font-semibold">{t.baris ?? '—'}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
