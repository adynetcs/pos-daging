import type { Produk } from '@/types';

/**
 * Ilustrasi produk berbasis SVG (tanpa gambar eksternal). Saat foto asli tersedia
 * (mis. URL Cloudinary di field foto), komponen ini cukup diganti dengan <img>.
 */
const palet = {
  sapi: { bg: '#FBEDEE', daging: '#B3313D', gelap: '#8A1F2A', lemak: '#F6D7D2' },
  ayam: { bg: '#FDF3EC', daging: '#F2B9A5', gelap: '#DE8F78', lemak: '#FCE6DA' },
  kambing: { bg: '#F8EEEA', daging: '#A4443A', gelap: '#7C2F27', lemak: '#F1D9CF' },
  kemasan: { bg: '#EEF2F6', daging: '#C2554A', gelap: '#8E3A32', lemak: '#F4E2DC' },
};

function Bentuk({ p }: { p: Produk }) {
  const c = palet[p.kategori];
  if (p.kategori === 'kemasan') {
    const sosis = p.nama.toLowerCase().includes('sosis');
    return (
      <g>
        <rect x="18" y="22" width="64" height="56" rx="8" fill="#fff" stroke="#CBD5E1" strokeWidth="2" />
        <rect x="18" y="22" width="64" height="12" rx="6" fill="#841D28" />
        {sosis
          ? [0, 1, 2].map((i) => <rect key={i} x="28" y={42 + i * 11} width="44" height="8" rx="4" fill={c.daging} />)
          : [0, 1, 2, 3, 4, 5].map((i) => <circle key={i} cx={34 + (i % 3) * 16} cy={48 + Math.floor(i / 3) * 16} r="6.5" fill={c.daging} />)}
      </g>
    );
  }
  const n = p.nama.toLowerCase();
  if (n.includes('giling'))
    return (
      <g>
        <ellipse cx="50" cy="56" rx="32" ry="22" fill={c.daging} />
        {Array.from({ length: 22 }).map((_, i) => (
          <circle key={i} cx={26 + ((i * 37) % 48)} cy={42 + ((i * 23) % 28)} r="2.6" fill={i % 3 ? c.gelap : c.lemak} opacity=".85" />
        ))}
      </g>
    );
  if (n.includes('iga'))
    return (
      <g>
        <path d="M18 40c10-10 54-10 64 0v26c-10 10-54 10-64 0z" fill={c.daging} />
        {[30, 46, 62].map((x) => <rect key={x} x={x} y="30" width="7" height="46" rx="3.5" fill="#F7F1E8" stroke="#E5DCCD" />)}
      </g>
    );
  if (p.kategori === 'ayam' && n.includes('utuh'))
    return (
      <g>
        <ellipse cx="48" cy="56" rx="28" ry="22" fill={c.daging} />
        <ellipse cx="44" cy="50" rx="14" ry="9" fill={c.lemak} opacity=".7" />
        <path d="M70 50l12-6M70 62l13 4" stroke="#F7F1E8" strokeWidth="6" strokeLinecap="round" />
      </g>
    );
  // potongan steak umum + marbling
  return (
    <g>
      <path d="M20 54c0-16 14-26 32-26 18 0 30 9 30 22 0 16-14 24-34 24-17 0-28-7-28-20z" fill={c.daging} />
      <path d="M22 56c4 10 16 15 30 15 16 0 27-6 29-16" fill="none" stroke={c.lemak} strokeWidth="4" strokeLinecap="round" />
      <path d="M34 46c6-3 12 2 18-1M44 56c6 2 11-3 17 0M30 58c3 1 5-1 8 0" stroke={c.lemak} strokeWidth="1.6" fill="none" strokeLinecap="round" opacity=".9" />
      {p.kategori === 'ayam' && <path d="M24 50c8-14 44-16 54 0" stroke={c.gelap} strokeWidth="1.5" fill="none" opacity=".4" />}
    </g>
  );
}

export function ProductThumb({ produk, ukuran = 'md' }: { produk: Produk; ukuran?: 'sm' | 'md' | 'lg' | 'penuh' }) {
  const k = { sm: 'h-9 w-9 rounded-lg', md: 'h-12 w-12 rounded-xl', lg: 'h-20 w-20 rounded-2xl', penuh: 'aspect-[4/3] w-full rounded-xl' }[ukuran];
  return (
    <span className={`block shrink-0 overflow-hidden ${k}`} style={{ background: palet[produk.kategori].bg }} aria-hidden="true">
      <svg viewBox="0 0 100 100" className="h-full w-full" preserveAspectRatio="xMidYMid meet"><Bentuk p={produk} /></svg>
    </span>
  );
}

export const LABEL_KATEGORI: Record<Produk['kategori'], string> = {
  sapi: 'Daging Sapi', ayam: 'Daging Ayam', kambing: 'Daging Kambing', kemasan: 'Produk Kemasan',
};
export const WARNA_KATEGORI: Record<string, string> = {
  sapi: '#841D28', ayam: '#E3876F', kambing: '#B8564B', kemasan: '#94A3B8',
};
