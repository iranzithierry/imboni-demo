import { ART, iso, type ArtPalette } from '../palette';

export type V2 = readonly [number, number];
export type V3 = readonly [number, number, number];
export type Tone = { readonly top: string; readonly left: string; readonly right: string };

/** Path segments in a plane's local 2D coordinates (u right, v down). */
export type Seg =
  | readonly ['M' | 'L', number, number]
  | readonly ['C', number, number, number, number, number, number]
  | readonly ['Z'];

/** A flat frame in world space: local (a, b) sits at o + a·u + b·v. */
export type Plane = { readonly o: V3; readonly u: V3; readonly v: V3 };

/** Dark-mode palettes have a dark ground; some objects need a lighter body to stay visible there. */
export const isNight = (p: ArtPalette) => parseInt(p.ground.slice(1, 3), 16) < 0x80;

export const W = 320;
export const H = 240;

export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a: V3): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

/** Upright plane facing the viewer's left (normal +y): u runs along +x, v runs down. */
export const faceLeft = (o: V3): Plane => ({ o, u: [1, 0, 0], v: [0, 0, -1] });

export const on = (pl: Plane, a: number, b: number): V3 => add(pl.o, add(mul(pl.u, a), mul(pl.v, b)));
const normalOf = (pl: Plane): V3 => unit(cross(pl.u, pl.v));
/** The same plane moved `d` along its normal, which points toward the viewer for planes built here. */
export const lift = (pl: Plane, d: number): Plane => ({ ...pl, o: add(pl.o, mul(normalOf(pl), d)) });

const K = 0.5523;

export function rrectPath(x: number, y: number, w: number, h: number, r: number): Seg[] {
  const q = Math.min(r, w / 2, h / 2);
  const k = q * K;
  return [
    ['M', x + q, y],
    ['L', x + w - q, y],
    ['C', x + w - q + k, y, x + w, y + q - k, x + w, y + q],
    ['L', x + w, y + h - q],
    ['C', x + w, y + h - q + k, x + w - q + k, y + h, x + w - q, y + h],
    ['L', x + q, y + h],
    ['C', x + q - k, y + h, x, y + h - q + k, x, y + h - q],
    ['L', x, y + q],
    ['C', x, y + q - k, x + q - k, y, x + q, y],
    ['Z'],
  ];
}

export function ellipsePath(cx: number, cy: number, rx: number, ry: number): Seg[] {
  const kx = rx * K;
  const ky = ry * K;
  return [
    ['M', cx + rx, cy],
    ['C', cx + rx, cy + ky, cx + kx, cy + ry, cx, cy + ry],
    ['C', cx - kx, cy + ry, cx - rx, cy + ky, cx - rx, cy],
    ['C', cx - rx, cy - ky, cx - kx, cy - ry, cx, cy - ry],
    ['C', cx + kx, cy - ry, cx + rx, cy - ky, cx + rx, cy],
    ['Z'],
  ];
}

export const circlePath = (cx: number, cy: number, r: number) => ellipsePath(cx, cy, r, r);

export function polyPath(pts: readonly V2[], close = true): Seg[] {
  const segs: Seg[] = pts.map(([a, b], i) => [i === 0 ? 'M' : 'L', a, b] as const);
  if (close) segs.push(['Z']);
  return segs;
}

/** Sampled outline of a rounded rectangle, for extrusions. */
export function rrectPts(x: number, y: number, w: number, h: number, r: number, steps = 6): V2[] {
  const q = Math.min(r, w / 2, h / 2);
  const corners: [number, number, number][] = [
    [x + w - q, y + q, -90],
    [x + w - q, y + h - q, 0],
    [x + q, y + h - q, 90],
    [x + q, y + q, 180],
  ];
  const out: V2[] = [];
  for (const [cx, cy, start] of corners) {
    if (q <= 0) {
      out.push([cx, cy]);
      continue;
    }
    for (let i = 0; i <= steps; i++) {
      const a = ((start + (90 * i) / steps) * Math.PI) / 180;
      out.push([cx + Math.cos(a) * q, cy + Math.sin(a) * q]);
    }
  }
  return out;
}

export function circlePts(cx: number, cy: number, r: number, n = 36): V2[] {
  const out: V2[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return out;
}

export type Style = {
  stroke?: string | false;
  width?: number;
  opacity?: number;
  dash?: string;
  evenodd?: boolean;
};

const n2 = (n: number) => String(Math.round(n * 100) / 100);

/** Convex hull, counter-clockwise. */
export function hull(points: readonly V2[]): V2[] {
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (pts.length < 3) return pts;
  const turnOf = (o: V2, a: V2, b: V2) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: V2[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && turnOf(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: V2[] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && turnOf(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

/** Faces are lit from the top-left: the viewer looks along -(1, 1, 1). */
function toneFor(n: V3, tone: Tone): string | null {
  if (n[0] + n[1] + n[2] <= 0.03) return null;
  if (n[2] >= n[0] && n[2] >= n[1]) return tone.top;
  return n[0] >= n[1] ? tone.right : tone.left;
}

/**
 * Draws world-space geometry as SVG markup in one isometric projection, shared line weight and
 * light direction. Every method returns a string so layers stay plain data.
 */
export class Pen {
  constructor(
    readonly p: ArtPalette,
    readonly origin: V2 = [W / 2, H / 2],
    readonly scale = 1,
  ) {}

  at(v: V3): V2 {
    return iso(v[0], v[1], v[2], this.scale, this.origin);
  }

  private list(vs: readonly V3[]) {
    return vs.map((v) => this.at(v).map(n2).join(',')).join(' ');
  }

  private d(pl: Plane, segs: readonly Seg[]) {
    const pt = (a: number, b: number) => this.at(on(pl, a, b)).map(n2).join(' ');
    return segs
      .map((s) => {
        if (s[0] === 'Z') return 'Z';
        if (s[0] === 'C') return `C${pt(s[1], s[2])} ${pt(s[3], s[4])} ${pt(s[5], s[6])}`;
        return `${s[0]}${pt(s[1], s[2])}`;
      })
      .join('');
  }

  private attrs(fill: string, o: Style) {
    const parts = [`fill="${fill}"`];
    if (o.stroke !== false) {
      parts.push(
        `stroke="${o.stroke ?? this.p.line}" stroke-width="${n2(o.width ?? ART.stroke)}" stroke-linejoin="round" stroke-linecap="round"`,
      );
      if (o.dash) parts.push(`stroke-dasharray="${o.dash}"`);
    }
    if (o.opacity !== undefined) parts.push(`opacity="${n2(o.opacity)}"`);
    if (o.evenodd) parts.push('fill-rule="evenodd"');
    return parts.join(' ');
  }

  poly(vs: readonly V3[], fill: string, o: Style = {}) {
    return `<polygon points="${this.list(vs)}" ${this.attrs(fill, o)}/>`;
  }

  line(vs: readonly V3[], color = this.p.line, width: number = ART.stroke, o: Omit<Style, 'stroke' | 'width'> = {}) {
    return `<polyline points="${this.list(vs)}" ${this.attrs('none', { ...o, stroke: color, width })}/>`;
  }

  /** A filled 2D shape drawn on a plane. */
  shape(pl: Plane, segs: readonly Seg[], fill: string, o: Style = {}) {
    return `<path d="${this.d(pl, segs)}" ${this.attrs(fill, o)}/>`;
  }

  /** An open stroke drawn on a plane, such as handwriting or a tick. */
  ink(pl: Plane, segs: readonly Seg[], color: string, width: number, o: Omit<Style, 'stroke' | 'width'> = {}) {
    return `<path d="${this.d(pl, segs)}" ${this.attrs('none', { ...o, stroke: color, width })}/>`;
  }

  /** A rounded bar with no outline, used for lines of text. */
  bar(pl: Plane, x: number, y: number, w: number, h: number, fill: string, opacity?: number) {
    return this.shape(pl, rrectPath(x, y, w, h, h / 2), fill, { stroke: false, opacity });
  }

  /**
   * A convex outline extruded by `depth` (which must point away from the viewer). Side bands take
   * the tone of the way they face; the cap takes `cap` or its own facing tone.
   */
  slab(cap: readonly V3[], depth: V3, tone: Tone, o: { cap?: string; capStyle?: Style } = {}) {
    const n = cap.length;
    const centre = mul(cap.reduce((s, v) => add(s, v), [0, 0, 0] as V3), 1 / n);
    const out: string[] = [];
    const normals: (V3 | null)[] = [];
    for (let i = 0; i < n; i++) {
      const a = cap[i];
      const b = cap[(i + 1) % n];
      const edge = sub(b, a);
      if (Math.abs(edge[0]) + Math.abs(edge[1]) + Math.abs(edge[2]) < 1e-6) {
        normals.push(null);
        continue;
      }
      let nn = unit(cross(edge, depth));
      if (dot(nn, sub(mul(add(a, b), 0.5), centre)) < 0) nn = mul(nn, -1);
      normals.push(nn);
      const fill = toneFor(nn, tone);
      if (!fill) continue;
      out.push(this.poly([a, b, add(b, depth), add(a, depth)], fill, { stroke: fill, width: 0.5 }));
    }
    for (let i = 0; i < n; i++) {
      const prev = normals[(i - 1 + n) % n];
      const next = normals[i];
      if (!prev || !next) continue;
      const shows = toneFor(prev, tone) || toneFor(next, tone);
      if (shows && dot(prev, next) < 0.9) out.push(this.line([cap[i], add(cap[i], depth)]));
    }
    const capTone = o.cap ?? toneFor(unit(mul(depth, -1)), tone) ?? tone.top;
    out.push(this.poly(cap, capTone, o.capStyle));
    const outline = hull([...cap, ...cap.map((v) => add(v, depth))].map((v) => this.at(v)));
    out.push(`<polygon points="${outline.map((q) => q.map(n2).join(',')).join(' ')}" ${this.attrs('none', {})}/>`);
    return out.join('');
  }

  /** Extrudes a sampled 2D outline from a plane toward the viewer by `t`; the cap sits on the lifted plane. */
  plate(pl: Plane, pts: readonly V2[], t: number, tone: Tone, o: { cap?: string; capStyle?: Style } = {}) {
    const top = lift(pl, t);
    const depth = mul(normalOf(pl), -t);
    return this.slab(
      pts.map(([a, b]) => on(top, a, b)),
      depth,
      tone,
      o,
    );
  }

  /** Axis-aligned box from its minimum corner. */
  box(min: V3, size: V3, tone: Tone, o: { cap?: string } = {}) {
    const [x, y, z] = min;
    const [w, d, h] = size;
    const top: V3[] = [
      [x, y, z + h],
      [x + w, y, z + h],
      [x + w, y + d, z + h],
      [x, y + d, z + h],
    ];
    return this.slab(top, [0, 0, -h], tone, o);
  }

  /** Soft contact shadow: an ellipse on the ground plane, `rx` along screen x. */
  shadow(id: string, c: V3, rx: number, ry: number, strength = 1) {
    const [cx, cy] = this.at(c);
    const m = /rgba?\(([^,]+),([^,]+),([^,]+),?([^)]*)\)/.exec(this.p.shadow);
    const rgb = m ? `rgb(${m[1].trim()},${m[2].trim()},${m[3].trim()})` : this.p.line;
    const a = Math.min(1, (m && m[4] ? parseFloat(m[4]) : 0.15) * strength);
    return (
      `<defs><radialGradient id="${id}" cx="0.5" cy="0.5" r="0.5">` +
      `<stop offset="0" stop-color="${rgb}" stop-opacity="${n2(a)}"/>` +
      `<stop offset="0.55" stop-color="${rgb}" stop-opacity="${n2(a * 0.6)}"/>` +
      `<stop offset="1" stop-color="${rgb}" stop-opacity="0"/>` +
      `</radialGradient></defs>` +
      `<ellipse cx="${n2(cx)}" cy="${n2(cy)}" rx="${n2(rx * this.scale)}" ry="${n2(ry * this.scale)}" fill="url(#${id})"/>`
    );
  }
}

/** One scene's projection: pens to draw with, and screen points and vectors to animate with. */
export function view(origin: V2, scale: number) {
  return {
    pen: (p: ArtPalette) => new Pen(p, origin, scale),
    at: (v: V3): V2 => iso(v[0], v[1], v[2], scale, origin),
    vec: (v: V3): V2 => iso(v[0], v[1], v[2], scale, [0, 0]),
  };
}

/** Wraps layer markup in a document with the shared viewBox. */
export const svg = (body: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">${body}</svg>`;

/**
 * Monoline numerals on a 10 × 16 box, stroked with round caps so they print the same on every
 * platform without depending on a font.
 */
const GLYPHS: Record<string, Seg[]> = {
  '0': ellipsePath(5, 8, 4.6, 7.6),
  '1': [
    ['M', 2.4, 3.6],
    ['L', 6.2, 0.4],
    ['L', 6.2, 15.6],
  ],
  '2': [
    ['M', 0.9, 4.4],
    ['C', 0.9, 1.9, 2.8, 0.4, 5, 0.4],
    ['C', 7.4, 0.4, 9.1, 2, 9.1, 4.3],
    ['C', 9.1, 6.9, 6.9, 8.6, 0.9, 15.6],
    ['L', 9.4, 15.6],
  ],
  '4': [
    ['M', 7, 15.6],
    ['L', 7, 0.4],
    ['L', 0.6, 10.8],
    ['L', 9.6, 10.8],
  ],
  '6': [
    ['M', 8.2, 1.2],
    ['C', 7.3, 0.6, 6.2, 0.4, 5.2, 0.4],
    ['C', 2.3, 0.4, 0.6, 3.6, 0.6, 9.4],
    ['C', 0.6, 13.2, 2.4, 15.6, 5, 15.6],
    ['C', 7.6, 15.6, 9.4, 13.6, 9.4, 10.6],
    ['C', 9.4, 7.7, 7.6, 5.9, 5.1, 5.9],
    ['C', 2.8, 5.9, 0.9, 7.6, 0.6, 9.6],
  ],
  '7': [
    ['M', 0.6, 0.4],
    ['L', 9.4, 0.4],
    ['L', 3.6, 15.6],
  ],
  '8': [
    ['M', 5, 7.4],
    ['C', 2.8, 7.4, 1.2, 6, 1.2, 4],
    ['C', 1.2, 1.9, 2.9, 0.4, 5, 0.4],
    ['C', 7.1, 0.4, 8.8, 1.9, 8.8, 4],
    ['C', 8.8, 6, 7.2, 7.4, 5, 7.4],
    ['C', 2.4, 7.4, 0.6, 9.1, 0.6, 11.4],
    ['C', 0.6, 13.8, 2.5, 15.6, 5, 15.6],
    ['C', 7.5, 15.6, 9.4, 13.8, 9.4, 11.4],
    ['C', 9.4, 9.1, 7.6, 7.4, 5, 7.4],
  ],
  '9': [
    ['M', 1.8, 14.8],
    ['C', 2.7, 15.4, 3.8, 15.6, 4.8, 15.6],
    ['C', 7.7, 15.6, 9.4, 12.4, 9.4, 6.6],
    ['C', 9.4, 2.8, 7.6, 0.4, 5, 0.4],
    ['C', 2.4, 0.4, 0.6, 2.4, 0.6, 5.4],
    ['C', 0.6, 8.3, 2.4, 10.1, 4.9, 10.1],
    ['C', 7.2, 10.1, 9.1, 8.4, 9.4, 6.4],
  ],
};

/** Numerals laid out on a plane: `h` is the cap height, `x, y` the top-left of the first digit. */
export function numeralSegs(text: string, x: number, y: number, h: number, gap = 0.18): Seg[] {
  const k = h / 16;
  const segs: Seg[] = [];
  let cx = x;
  for (const ch of text) {
    const g = GLYPHS[ch];
    if (!g) continue;
    const ox = cx;
    for (const s of g) {
      if (s[0] === 'Z') segs.push(s);
      else if (s[0] === 'C') segs.push(['C', ox + s[1] * k, y + s[2] * k, ox + s[3] * k, y + s[4] * k, ox + s[5] * k, y + s[6] * k]);
      else segs.push([s[0], ox + s[1] * k, y + s[2] * k]);
    }
    cx += 10 * k + gap * h;
  }
  return segs;
}

export const numeralWidth = (text: string, h: number, gap = 0.18) => text.length * (10 * (h / 16)) + (text.length - 1) * gap * h;
