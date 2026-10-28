const PALETTES = [
  { a: '#d8ff5f', b: '#4dffc3', c: '#07120f', d: '#11231c' },
  { a: '#ff8158', b: '#ffd36e', c: '#150b08', d: '#24120c' },
  { a: '#8bd3ff', b: '#b49bff', c: '#07101c', d: '#101b2d' },
  { a: '#ff9bea', b: '#8b5cff', c: '#120818', d: '#1f1029' },
  { a: '#f4d9a4', b: '#ff8f5e', c: '#171108', d: '#27190d' },
  { a: '#b6ff8c', b: '#6ee7ff', c: '#0a1410', d: '#10221d' },
];

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function pick<T>(items: T[], n: number): T {
  return items[n % items.length];
}

/**
 * Generates a self-contained abstract artwork as an SVG data URI.
 * No remote assets, no third-party imagery, no copied frames.
 */
export function makeArtwork(seed: string, variant = 0): string {
  const h = hash(`${seed}:${variant}`);
  const p = pick(PALETTES, h);
  const angle = h % 360;
  const cx = 34 + (h % 34);
  const cy = 28 + ((h >> 3) % 40);
  const r = 18 + ((h >> 5) % 22);
  const ring = 24 + ((h >> 7) % 30);
  const skew = (h % 18) - 9;
  const shape = h % 3;

  const object =
    shape === 0
      ? `<circle cx="${cx}%" cy="${cy}%" r="${r}%" fill="url(#core)" opacity=".96"/>
         <circle cx="${cx}%" cy="${cy}%" r="${ring}%" fill="none" stroke="${p.a}" stroke-width="1.4" opacity=".7"/>`
      : shape === 1
        ? `<rect x="${cx - 18}%" y="${cy - 22}%" width="38%" height="52%" rx="20" fill="url(#core)" opacity=".95" transform="rotate(${skew} ${cx} ${cy})"/>
           <rect x="${cx - 12}%" y="${cy - 15}%" width="22%" height="30%" rx="12" fill="none" stroke="${p.a}" stroke-width="1.3" opacity=".8" transform="rotate(${skew} ${cx} ${cy})"/>`
        : `<path d="M ${cx - 24} ${cy + 18} Q ${cx - 6} ${cy - 32}, ${cx + 18} ${cy - 8} T ${cx + 38} ${cy + 22}" fill="none" stroke="url(#core)" stroke-width="${r / 2}" stroke-linecap="round" opacity=".95"/>
           <path d="M ${cx - 26} ${cy + 26} Q ${cx - 2} ${cy - 18}, ${cx + 22} ${cy + 4}" fill="none" stroke="${p.a}" stroke-width="1.2" opacity=".75"/>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="900" viewBox="0 0 900 900">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1" gradientTransform="rotate(${angle} .5 .5)">
      <stop offset="0" stop-color="${p.c}"/>
      <stop offset="1" stop-color="${p.d}"/>
    </linearGradient>
    <radialGradient id="core" cx="35%" cy="30%" r="80%">
      <stop offset="0" stop-color="${p.a}"/>
      <stop offset=".55" stop-color="${p.b}"/>
      <stop offset="1" stop-color="${p.c}" stop-opacity=".15"/>
    </radialGradient>
    <filter id="blur"><feGaussianBlur stdDeviation="38"/></filter>
    <filter id="grain">
      <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer><feFuncA type="linear" slope=".14"/></feComponentTransfer>
      <feBlend in="SourceGraphic" mode="overlay"/>
    </filter>
    <pattern id="grid" width="54" height="54" patternUnits="userSpaceOnUse">
      <path d="M 54 0 L 0 0 0 54" fill="none" stroke="#ffffff" stroke-opacity=".055" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="900" height="900" fill="url(#bg)"/>
  <rect width="900" height="900" fill="url(#grid)"/>
  <g filter="url(#blur)" opacity=".9">
    <ellipse cx="${cx}%" cy="${cy}%" rx="${r * 3.6}%" ry="${r * 2.2}%" fill="${p.b}" opacity=".55"/>
    <ellipse cx="${100 - cx}%" cy="${100 - cy}%" rx="${r * 2.8}%" ry="${r * 2.8}%" fill="${p.a}" opacity=".28"/>
  </g>
  <g filter="url(#grain)">
    ${object}
    <path d="M 0 ${760 + (h % 40)} Q 240 ${700 + (h % 90)}, 460 ${760 + (h % 30)} T 900 ${720 + (h % 70)}" fill="none" stroke="${p.a}" stroke-opacity=".28" stroke-width="1"/>
    <circle cx="${840 - (h % 90)}" cy="${90 + (h % 80)}" r="${6 + (h % 8)}" fill="${p.a}" opacity=".85"/>
  </g>
  <rect x="18" y="18" width="864" height="864" fill="none" stroke="#ffffff" stroke-opacity=".12" stroke-width="1"/>
  <text x="48" y="852" fill="#ffffff" fill-opacity=".5" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="18" letter-spacing="4">FRAME / ${String(h % 9999).padStart(4, '0')}</text>
</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
