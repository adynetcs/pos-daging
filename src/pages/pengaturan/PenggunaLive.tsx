import { useCallback, useEffect, useState } from 'react';
import { KeyRound, Pencil, Plus, RefreshCw } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { Input, Select, Toggle } from '@/components/ui/FormInput';
import { EmptyState, LoadingState } from '@/components/ui/States';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { api, type PenggunaSheet, type Peran } from '@/services/api';

type Form = { id_pengguna?: string; nama: string; email: string; peran: Peran; aktif: boolean };
const KOSONG: Form = { nama: '', email: '', peran: 'kasir', aktif: true };

/** Kelola pengguna & PIN langsung di Google Sheets (khusus pemilik). */
export function PenggunaLive() {
  const toast = useToast();
  const { pengguna: saya } = useAuth();
  const [daftar, setDaftar] = useState<PenggunaSheet[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState<string | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [pinUntuk, setPinUntuk] = useState<PenggunaSheet | null>(null);
  const [pin, setPin] = useState('');
  const [proses, setProses] = useState(false);

  const muat = useCallback(async () => {
    setMemuat(true); setGalat(null);
    try { setDaftar(await api.rpc<PenggunaSheet[]>('pengguna.list')); } catch (e) { setGalat((e as Error).message); } finally { setMemuat(false); }
  }, []);
  useEffect(() => { void muat(); }, [muat]);

  const simpan = async () => {
    if (!form) return;
    setProses(true);
    try {
      await api.rpc('pengguna.simpan', form);
      toast({ jenis: 'sukses', judul: form.id_pengguna ? 'Pengguna diperbarui' : 'Pengguna ditambahkan', pesan: form.id_pengguna ? form.nama : `${form.nama}. Atur PIN agar bisa login.` });
      setForm(null);
      await muat();
    } catch (e) { toast({ jenis: 'gagal', judul: 'Gagal menyimpan', pesan: (e as Error).message }); } finally { setProses(false); }
  };

  const simpanPin = async () => {
    if (!pinUntuk) return;
    setProses(true);
    try {
      await api.rpc('pengguna.aturPin', { id_pengguna: pinUntuk.id_pengguna, pin });
      toast({ jenis: 'sukses', judul: 'PIN disimpan', pesan: `Berikan PIN ini langsung ke ${pinUntuk.nama}, jangan lewat grup chat.` });
      setPinUntuk(null); setPin('');
      await muat();
    } catch (e) { toast({ jenis: 'gagal', judul: 'PIN tidak tersimpan', pesan: (e as Error).message }); } finally { setProses(false); }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader judul="Pengguna" sub="Tersimpan di Google Sheets, tab Pengguna"
        aksi={<div className="flex gap-2">
          <Button ukur="sm" varian="garis" ikon={<RefreshCw className="h-4 w-4" />} onClick={() => void muat()} aria-label="Muat ulang" />
          <Button ukur="sm" ikon={<Plus className="h-4 w-4" />} onClick={() => setForm({ ...KOSONG })}>Tambah</Button>
        </div>} />
      {memuat ? <LoadingState baris={3} /> : galat ? <EmptyState judul="Gagal memuat pengguna" pesan={galat} aksi={<Button varian="garis" onClick={() => void muat()}>Coba lagi</Button>} /> : (
        <ul className="divide-y divide-gray-100 border-t border-gray-100">
          {daftar.map((u) => (
            <li key={u.id_pengguna} className="flex flex-wrap items-center gap-3 px-5 py-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-50 text-sm font-bold text-brand-800">{u.nama.charAt(0).toUpperCase()}</span>
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{u.nama}{u.id_pengguna === saya?.id_pengguna && <span className="font-normal text-gray-400"> (Anda)</span>}</p><p className="truncate text-xs text-gray-500">{u.email}</p></div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge nada={u.peran === 'pemilik' ? 'brand' : u.peran === 'admin' ? 'biru' : 'abu'} titik={false}>{u.peran}</Badge>
                {!u.aktif && <Badge nada="abu">Nonaktif</Badge>}
                {!u.punya_pin && <Badge nada="kuning">Belum ada PIN</Badge>}
                {u.terkunci && <Badge nada="merah">Terkunci 15 menit</Badge>}
              </div>
              <div className="flex gap-1">
                <button onClick={() => { setPinUntuk(u); setPin(''); }} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100" title="Atur PIN" aria-label={`Atur PIN ${u.nama}`}><KeyRound className="h-4 w-4" /></button>
                <button onClick={() => setForm({ id_pengguna: u.id_pengguna, nama: u.nama, email: u.email, peran: u.peran, aktif: u.aktif })} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100" title="Ubah" aria-label={`Ubah ${u.nama}`}><Pencil className="h-4 w-4" /></button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal buka={!!form} onTutup={() => setForm(null)} judul={form?.id_pengguna ? 'Ubah pengguna' : 'Tambah pengguna'} lebar="sm"
        footer={<><Button varian="garis" onClick={() => setForm(null)}>Batal</Button><Button disabled={proses} onClick={() => void simpan()}>{proses ? 'Menyimpan…' : 'Simpan'}</Button></>}>
        {form && (
          <div className="space-y-4">
            <Input label="Nama" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} />
            <Input label="Email (untuk login)" type="email" inputMode="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Select label="Peran" value={form.peran} onChange={(e) => setForm({ ...form, peran: e.target.value as Peran })}
              opsi={[{ nilai: 'kasir', label: 'Kasir: kasir, pesanan, produk (lihat), stok, pelanggan' }, { nilai: 'admin', label: 'Admin: semua kecuali keuangan, laporan, pengaturan' }, { nilai: 'pemilik', label: 'Pemilik: semua menu' }]} />
            <Toggle label="Aktif" keterangan="Nonaktif = tidak bisa login, riwayat tetap tersimpan" checked={form.aktif} onChange={(v) => setForm({ ...form, aktif: v })} />
          </div>
        )}
      </Modal>

      <Modal buka={!!pinUntuk} onTutup={() => setPinUntuk(null)} judul="Atur PIN" sub={pinUntuk ? `${pinUntuk.nama}, ${pinUntuk.email}` : ''} lebar="sm"
        footer={<><Button varian="garis" onClick={() => setPinUntuk(null)}>Batal</Button><Button disabled={proses || pin.length !== 6} onClick={() => void simpanPin()}>{proses ? 'Menyimpan…' : 'Simpan PIN'}</Button></>}>
        <label className="label" htmlFor="pinbaru">PIN baru (6 digit)</label>
        <input id="pinbaru" inputMode="numeric" autoComplete="new-password" maxLength={6} className="input num text-center text-2xl tracking-[0.5em]"
          value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} />
        <p className="mt-2 text-xs text-gray-500">Hindari 123456 atau angka kembar. PIN disimpan sebagai hash, pemilik pun tidak bisa melihatnya lagi.</p>
      </Modal>
    </Card>
  );
}
