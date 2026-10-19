import { useEffect, useRef, useState } from 'react';

/** Lebar kontainer sebenarnya, agar teks grafik tetap terbaca di HP (tidak ikut mengecil). */
function useLebar(awal = 640) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(awal);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ukur = () => setW(Math.max(280, Math.round(el.clientWidth)));
    ukur();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(ukur);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, w };
}
import { rupiah, rupiahRingkas } from '@/utils/format';

/* Grafik ringan berbasis SVG — tanpa dependensi tambahan. */

const niceMax = (v: number) => {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
};

export function AreaChart({ data, tinggi = 220 }: { data: { label: string; nilai: number; sub?: string }[]; tinggi?: number }) {
  const [aktif, setAktif] = useState<number | null>(null);
  const { ref, w: W } = useLebar();
  const sempit = W < 480;
  const H = sempit ? Math.round(tinggi * 0.9) : tinggi, padL = sempit ? 40 : 56, padR = sempit ? 18 : 30, padT = 16, padB = 30;
  const tiapLabel = Math.max(1, Math.ceil(data.length / (W / 52)));
  const max = niceMax(Math.max(...data.map((d) => d.nilai)) * 1.1);
  const x = (i: number) => padL + (i * (W - padL - padR)) / Math.max(1, data.length - 1);
  const y = (v: number) => padT + (1 - v / max) * (H - padT - padB);
  const garis = data.map((d, i) => `${i ? 'L' : 'M'}${x(i)},${y(d.nilai)}`).join(' ');
  const area = `${garis} L${x(data.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  const a = aktif ?? data.length - 1;
  return (
    <div className="relative" ref={ref}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label="Grafik penjualan">
        <defs>
          <linearGradient id="gArea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#B23A45" stopOpacity=".18" />
            <stop offset="1" stopColor="#B23A45" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="#EEF0F2" />
            <text x={padL - 8} y={y(t) + 4} textAnchor="end" className="fill-gray-400 text-[11px]">{rupiahRingkas(t).replace('Rp ', '')}</text>
          </g>
        ))}
        <path d={area} fill="url(#gArea)" />
        <path d={garis} fill="none" stroke="#9A2632" strokeWidth="2.5" strokeLinejoin="round" />
        <line x1={x(a)} x2={x(a)} y1={padT} y2={y(0)} stroke="#9A2632" strokeDasharray="3 4" opacity=".35" />
        {data.map((d, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(d.nilai)} r={i === a ? 5.5 : 3.5} fill={i === a ? '#9A2632' : '#fff'} stroke="#9A2632" strokeWidth="2" />
            {(i === a || (i % tiapLabel === 0 && (tiapLabel === 1 || Math.abs(i - a) > 1))) && <text x={x(i)} y={H - 8} textAnchor="middle" className={`text-[11px] ${i === a ? 'fill-gray-900 font-semibold' : 'fill-gray-400'}`}>{d.label}</text>}
            <rect x={x(i) - (W - padL - padR) / data.length / 2} y={0} width={(W - padL - padR) / data.length} height={H}
              fill="transparent" onMouseEnter={() => setAktif(i)} onClick={() => setAktif(i)} />
          </g>
        ))}
      </svg>
      <div className="pointer-events-none absolute top-1 rounded-lg bg-ink-900 px-2.5 py-1.5 text-white shadow-pop"
        style={{ left: `clamp(0px, calc(${(x(a) / W) * 100}% - 60px), calc(100% - 130px))` }}>
        <p className="text-[11px] opacity-70">{data[a].sub ?? data[a].label}</p>
        <p className="num text-[13px] font-bold">{rupiah(data[a].nilai)}</p>
      </div>
    </div>
  );
}

export function DonutChart({ data, tengah, subTengah }: { data: { label: string; nilai: number; warna: string }[]; tengah: string; subTengah?: string }) {
  const total = data.reduce((s, d) => s + d.nilai, 0) || 1;
  const R = 52, r = 34, C = 60;
  let sudut = -Math.PI / 2;
  const busur = data.map((d) => {
    const a0 = sudut, a1 = sudut + (d.nilai / total) * Math.PI * 2;
    sudut = a1;
    const besar = a1 - a0 > Math.PI ? 1 : 0;
    const p = (rad: number, rr: number) => `${C + rr * Math.cos(rad)},${C + rr * Math.sin(rad)}`;
    return { ...d, path: `M${p(a0, R)} A${R},${R} 0 ${besar} 1 ${p(a1, R)} L${p(a1, r)} A${r},${r} 0 ${besar} 0 ${p(a0, r)} Z` };
  });
  return (
    <svg viewBox="0 0 120 120" className="h-full w-full" role="img" aria-label="Komposisi penjualan per kategori">
      {busur.map((b) => <path key={b.label} d={b.path} fill={b.warna} stroke="#fff" strokeWidth="1.5" />)}
      <text x="60" y={subTengah ? 58 : 64} textAnchor="middle" className="fill-gray-900 text-[17px] font-extrabold">{tengah}</text>
      {subTengah && <text x="60" y="73" textAnchor="middle" className="fill-gray-500 text-[8px]">{subTengah}</text>}
    </svg>
  );
}

export function BarChart({ data, seri, tinggi = 220 }: { data: { label: string; nilai: number[] }[]; seri: { nama: string; warna: string }[]; tinggi?: number }) {
  const { ref, w: W } = useLebar();
  const sempit = W < 480;
  const H = tinggi, padL = sempit ? 40 : 56, padR = 8, padT = 12, padB = 28;
  const tiapLabel = Math.max(1, Math.ceil(data.length / (W / 46)));
  const max = niceMax(Math.max(1, ...data.flatMap((d) => d.nilai)) * 1.05);
  const lebarGrup = (W - padL - padR) / data.length;
  const lebarBar = Math.min(22, (lebarGrup * 0.7) / seri.length);
  const y = (v: number) => padT + (1 - v / max) * (H - padT - padB);
  return (
    <div ref={ref}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label="Grafik batang">
        {[0, 0.5, 1].map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={y(t * max)} y2={y(t * max)} stroke="#EEF0F2" />
            <text x={padL - 8} y={y(t * max) + 4} textAnchor="end" className="fill-gray-400 text-[11px]">{rupiahRingkas(t * max).replace('Rp ', '')}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const x0 = padL + i * lebarGrup + (lebarGrup - lebarBar * seri.length - 2 * (seri.length - 1)) / 2;
          return (
            <g key={d.label}>
              {d.nilai.map((v, j) => (
                <rect key={j} x={x0 + j * (lebarBar + 2)} y={y(v)} width={lebarBar} height={Math.max(0, y(0) - y(v))} rx="3" fill={seri[j].warna}>
                  <title>{`${seri[j].nama} ${d.label}: ${rupiah(v)}`}</title>
                </rect>
              ))}
              {i % tiapLabel === 0 && <text x={padL + i * lebarGrup + lebarGrup / 2} y={H - 8} textAnchor="middle" className="fill-gray-400 text-[11px]">{d.label}</text>}
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap gap-4 px-1">
        {seri.map((s) => <span key={s.nama} className="flex items-center gap-1.5 text-xs text-gray-600"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.warna }} />{s.nama}</span>)}
      </div>
    </div>
  );
}

export function ProgressBar({ nilai, warna = 'bg-brand-600' }: { nilai: number; warna?: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
      <div className={`h-full rounded-full ${warna}`} style={{ width: `${Math.min(100, Math.max(0, nilai * 100))}%` }} />
    </div>
  );
}
