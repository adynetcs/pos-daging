/** Tanggal & jam sekarang menurut zona Asia/Jakarta (WIB), apa pun zona perangkat. */
const fmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
});

function bagian(d = new Date()) {
  const o: Record<string, string> = {};
  for (const p of fmt.formatToParts(d)) o[p.type] = p.value;
  return { tgl: `${o.year}-${o.month}-${o.day}`, jam: `${o.hour === '24' ? '00' : o.hour}:${o.minute}:${o.second}` };
}

/** 'YYYY-MM-DD' hari ini (WIB) */
export const hariIni = () => bagian().tgl;
/** 'YYYY-MM-DDTHH:mm:ss' sekarang (WIB) */
export const sekarang = () => { const b = bagian(); return `${b.tgl}T${b.jam}`; };
/** Tanggal pertama bulan berjalan */
export const awalBulan = () => `${hariIni().slice(0, 8)}01`;
/** Tambah n hari ke tanggal 'YYYY-MM-DD' */
export function tambahHari(tgl: string, n: number) {
  const d = new Date(`${tgl}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
/** Selisih hari (b - a) */
export const selisihHari = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
