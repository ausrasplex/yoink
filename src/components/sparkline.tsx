/** Tiny smooth area chart, server-rendered SVG. */
export function Sparkline({ values, className }: { values: number[]; className?: string }) {
  const w = 160, h = 56, pad = 4;
  const max = Math.max(1, ...values);
  const pts = values.map((v, i) => [pad + (i * (w - pad * 2)) / (values.length - 1), h - pad - (v / max) * (h - pad * 2)] as const);
  const line = pts.map(([x, y], i) => {
    if (i === 0) return `M${x},${y}`;
    const [px, py] = pts[i - 1];
    const cx = (px + x) / 2;
    return `C${cx},${py} ${cx},${y} ${x},${y}`;
  }).join(" ");
  const area = `${line} L${pts.at(-1)![0]},${h} L${pts[0][0]},${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={className} role="img" aria-label="Bids per hour over the last 24 hours" preserveAspectRatio="none">
      <defs>
        <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b9a4fa" stopOpacity="0.55" />
          <stop offset="1" stopColor="#b9a4fa" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#spark)" />
      <path d={line} fill="none" stroke="#9a7ff2" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
