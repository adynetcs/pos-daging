const rupiahFmt = new Intl.NumberFormat('id-ID', {
  style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0,
});

/** Rp 1.250.000 — dibulatkan ke rupiah terdekat */
export const rupiah = (n: number) => rupiahFmt.format(Math.round(n)).replace(/\u00a0/g, ' ');

/** Rp 1,25 jt — untuk label grafik */
export function rupiahRingkas(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `Rp ${(n / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 2 })} jt`;
  if (abs >= 1_000) return `Rp ${(n / 1_000).toLocaleString('id-ID', { maximumFractionDigits: 0 })} rb`;
  return rupiah(n);
}

export const angka = (n: number, digit = 0) =>
  n.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: digit });

/** Format berat: < 1 kg ditampilkan dalam gram */
export function berat(kg: number, paksa?: 'kg' | 'g'): string {
  if (paksa === 'g' || (!paksa && Math.abs(kg) < 1 && kg !== 0)) return `${angka(kg * 1000, 0)} g`;
  return `${angka(kg, 2)} kg`;
}

export function qtySatuan(qty: number, satuan: 'kg' | 'pcs'): string {
  return satuan === 'kg' ? berat(qty) : `${angka(qty)} pcs`;
}

const bulan = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const bulanPendek = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
const hari = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];

const toDate = (d: string | Date) => (typeof d === 'string' ? new Date(d.length === 10 ? `${d}T00:00:00` : d) : d);

export const tanggal = (d: string | Date) => {
  const x = toDate(d);
  return `${x.getDate()} ${bulan[x.getMonth()]} ${x.getFullYear()}`;
};
export const tanggalPendek = (d: string | Date) => {
  const x = toDate(d);
  return `${x.getDate()} ${bulanPendek[x.getMonth()]} ${x.getFullYear()}`;
};
export const tanggalLabel = (d: string | Date) => {
  const x = toDate(d);
  return `${x.getDate()} ${bulanPendek[x.getMonth()]}`;
};
export const namaHari = (d: string | Date) => hari[toDate(d).getDay()];
export const tanggalHari = (d: string | Date) => `${namaHari(d)}, ${tanggal(d)}`;
export const jam = (d: string | Date) => {
  const x = toDate(d);
  return `${String(x.getHours()).padStart(2, '0')}.${String(x.getMinutes()).padStart(2, '0')}`;
};
export const tanggalJam = (d: string | Date) => `${tanggalPendek(d)}, ${jam(d)}`;

export const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const persen = (n: number, digit = 0) => `${angka(n * 100, digit)}%`;
