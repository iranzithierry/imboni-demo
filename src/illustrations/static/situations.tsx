import { useMemo, type JSX } from 'react';
import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { ART, iso, useArtPalette, type ArtPalette } from '../palette';

export type V2 = readonly [number, number];
export type V3 = readonly [number, number, number];
export type Tone = { readonly top: string; readonly left: string; readonly right: string };
type Axis = 'x' | 'y' | 'z';

const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;
/** Neighbouring faces whose normals differ by more than ~25° get an outline between them. */
const CREASE = 0.9;

export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const length = (a: V3) => Math.hypot(a[0], a[1], a[2]);
export const normalize = (a: V3): V3 => scale(a, 1 / (length(a) || 1));
const centroid = (ps: readonly V3[]): V3 => scale(ps.reduce(add, [0, 0, 0]), 1 / ps.length);
const lerp3 = (a: V3, b: V3, t: number): V3 => add(a, scale(sub(b, a), t));

/** Mixes two #rrggbb colours. */
export function mix(a: string, b: string, t: number): string {
  const [x, y] = [parseInt(a.slice(1), 16), parseInt(b.slice(1), 16)];
  const ch = (v: number, shift: number) => (v >> shift) & 255;
  const m = (shift: number) => Math.round(ch(x, shift) + (ch(y, shift) - ch(x, shift)) * t);
  return `#${((1 << 24) | (m(16) << 16) | (m(8) << 8) | m(0)).toString(16).slice(1)}`;
}

/** Dark-mode palettes have a dark ground; dark objects switch to a lighter body there to stay visible. */
export const isNight = (p: ArtPalette) => parseInt(p.ground.slice(1, 3), 16) < 0x80;

/** Paper-white solids (pages, receipts, cone stripes) stay light in dark mode, unlike `neutral`. */
export const paperTone = (p: ArtPalette): Tone => ({ top: p.paper, left: mix(p.paper, p.line, 0.07), right: mix(p.paper, p.line, 0.17) });

/** The projection looks along -(1, 1, 1), so a face is visible when its normal leans towards +(1, 1, 1). */
const facing = (n: V3) => n[0] + n[1] + n[2];
/** Light from the top-left: up-facing faces take `top`, faces turned left (+y) `left`, faces turned right (+x) `right`. */
const toneOf = (n: V3, t: Tone) => (n[2] >= n[0] && n[2] >= n[1] ? t.top : n[1] >= n[0] ? t.left : t.right);

function newell(ring: readonly V3[]): V3 {
  let x = 0;
  let y = 0;
  let z = 0;
  ring.forEach((c, i) => {
    const d = ring[(i + 1) % ring.length];
    x += (c[1] - d[1]) * (c[2] + d[2]);
    y += (c[2] - d[2]) * (c[0] + d[0]);
    z += (c[0] - d[0]) * (c[1] + d[1]);
  });
  return [x, y, z];
}

function hull(points: readonly V2[]): V2[] {
  const s = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const turn = (o: V2, a: V2, b: V2) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (list: V2[]) => {
    const h: V2[] = [];
    for (const q of list) {
      while (h.length >= 2 && turn(h[h.length - 2], h[h.length - 1], q) <= 0) h.pop();
      h.push(q);
    }
    return h.slice(0, -1);
  };
  return [...half(s), ...half([...s].reverse())];
}

/** Sutherland–Hodgman: `subject` clipped to the convex polygon `clip` (both in screen space). */
function clipConvex(subject: readonly V2[], clip: readonly V2[]): V2[] {
  const area = clip.reduce((sum, a, i) => {
    const b = clip[(i + 1) % clip.length];
    return sum + a[0] * b[1] - b[0] * a[1];
  }, 0);
  const sign = Math.sign(area);
  let out: V2[] = [...subject];
  clip.forEach((a, i) => {
    const b = clip[(i + 1) % clip.length];
    const inside = (q: V2) => sign * ((b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0])) >= 0;
    const cut = (q: V2, r: V2): V2 => {
      const dx = r[0] - q[0];
      const dy = r[1] - q[1];
      const t = ((a[0] - q[0]) * (b[1] - a[1]) - (a[1] - q[1]) * (b[0] - a[0])) / (dx * (b[1] - a[1]) - dy * (b[0] - a[0]));
      return [q[0] + dx * t, q[1] + dy * t];
    };
    const input = out;
    out = [];
    input.forEach((q, j) => {
      const prev = input[(j + input.length - 1) % input.length];
      if (inside(q)) {
        if (!inside(prev)) out.push(cut(prev, q));
        out.push(q);
      } else if (inside(prev)) out.push(cut(prev, q));
    });
  });
  return out;
}

/* 2D shapes, used both as extrusion profiles and as decals on a surface. */

export const arc = (cx: number, cy: number, r: number, from: number, to: number, n = 12, ry = r): V2[] =>
  Array.from({ length: n + 1 }, (_, k) => {
    const a = (from + ((to - from) * k) / n) * DEG;
    return [cx + r * Math.cos(a), cy + ry * Math.sin(a)] as const;
  });

export const circle = (cx: number, cy: number, r: number, n = 36, ry = r): V2[] => arc(cx, cy, r, 0, 360, n, ry).slice(0, -1);

const rect = (x: number, y: number, w: number, h: number): V2[] => [
  [x, y],
  [x + w, y],
  [x + w, y + h],
  [x, y + h],
];

/** Rounded rectangle; radii run (min,min), (max,min), (max,max), (min,max). */
export function rrect(x: number, y: number, w: number, h: number, r: number | readonly [number, number, number, number], seg = 5): V2[] {
  const [r0, r1, r2, r3] = typeof r === 'number' ? [r, r, r, r] : r;
  const corners: [number, number, number, number][] = [
    [x + r0, y + r0, 180, r0],
    [x + w - r1, y + r1, 270, r1],
    [x + w - r2, y + h - r2, 0, r2],
    [x + r3, y + h - r3, 90, r3],
  ];
  return corners.flatMap(([cx, cy, a, rr]) => (rr > 0 ? arc(cx, cy, rr, a, a + 90, seg) : [[cx, cy] as const]));
}

const rotate = (points: readonly V2[], degrees: number, cx = 0, cy = 0): V2[] => {
  const c = Math.cos(degrees * DEG);
  const s = Math.sin(degrees * DEG);
  return points.map(([x, y]) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c] as const);
};

const shift = (points: readonly V2[], dx: number, dy: number): V2[] => points.map(([x, y]) => [x + dx, y + dy] as const);

const lift = (axis: Axis, u: number, v: number, a: number): V3 => (axis === 'z' ? [u, v, a] : axis === 'y' ? [u, a, v] : [a, u, v]);

const fmt = (n: number) => String(Math.round(n * 10) / 10);
const list = (points: readonly V2[]) => points.map(([x, y]) => `${fmt(x)},${fmt(y)}`).join(' ');

/**
 * Draws isometric solids into an SVG string. Shapes paint in call order, so draw from back to front.
 * Lengths are grid units; `unit` is the size of one grid unit in viewBox units.
 */
export function createPen(p: ArtPalette, unit: number, name: string) {
  const out: string[] = [];
  let shadows = 0;
  const bounds = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  // Points touching the ground, which size the contact shadow.
  const footprint = { ...bounds };

  const grow = (b: typeof bounds, x: number, y: number) => {
    b.x0 = Math.min(b.x0, x);
    b.y0 = Math.min(b.y0, y);
    b.x1 = Math.max(b.x1, x);
    b.y1 = Math.max(b.y1, y);
  };
  const track = (x: number, y: number) => grow(bounds, x, y);
  const at = (v: V3): V2 => {
    const s = iso(v[0], v[1], v[2], unit, [0, 0]);
    track(s[0], s[1]);
    if (v[2] <= 0.1) grow(footprint, s[0], s[1]);
    return s;
  };
  const shape = (points: readonly V2[], attrs = '') => {
    if (points.length > 2) out.push(`<polygon points="${list(points)}"${attrs}/>`);
  };
  const fillOnly = (fill: string) => ` fill="${fill}" stroke="none"`;
  // A hairline in the fill's own colour closes anti-aliasing seams between neighbouring bands.
  const band = (fill: string) => ` fill="${fill}" stroke="${fill}" stroke-width="0.5"`;

  /** A flat polygon, outlined unless `outline` is false. */
  const poly = (vs: readonly V3[], fill: string, outline = true) => shape(vs.map(at), outline ? ` fill="${fill}"` : fillOnly(fill));

  /** An open line; defaults to the outline colour and weight. */
  const line = (vs: readonly V3[], color?: string, width?: number) =>
    out.push(`<polyline points="${list(vs.map(at))}"${color ? ` stroke="${color}"` : ''}${width ? ` stroke-width="${width}"` : ''}/>`);

  /** Fills the visible side quads between rings `a` and `b`, merging neighbours of the same tone, and outlines sharp creases. */
  const sides = (a: readonly V3[], b: readonly V3[], normals: readonly V3[], tone: Tone, smooth = false) => {
    const n = a.length;
    const visible = normals.map((m) => length(m) > 1e-9 && facing(m) > 1e-9);
    const start = Math.max(visible.indexOf(false), 0);
    const runs: { from: number; count: number; fill: string }[] = [];
    let run: (typeof runs)[number] | undefined;
    for (let i = 0; i < n; i++) {
      const k = (start + i) % n;
      if (!visible[k]) {
        run = undefined;
        continue;
      }
      const fill = toneOf(normals[k], tone);
      if (run && run.fill === fill) run.count++;
      else {
        run = { from: k, count: 1, fill };
        runs.push(run);
      }
    }
    for (const r of runs) {
      const ks = Array.from({ length: r.count + 1 }, (_, j) => (r.from + j) % n);
      shape([...ks.map((k) => at(a[k])), ...[...ks].reverse().map((k) => at(b[k]))], band(r.fill));
    }
    if (smooth) return;
    for (let k = 0; k < n; k++) {
      const prev = (k + n - 1) % n;
      if (visible[prev] && visible[k] && dot(normalize(normals[prev]), normalize(normals[k])) < CREASE) line([a[k], b[k]]);
    }
  };

  /**
   * A convex solid spanned by two rings of matching points (a prism, cylinder, frustum or, when `b`
   * collapses to one point, a cone). Fills visible faces by the light rule and outlines the silhouette.
   */
  const loft = (a: readonly V3[], b: readonly V3[], tone: Tone, caps: { a?: string; b?: string } = {}) => {
    const n = a.length;
    const mid = centroid([...a, ...b]);
    const normals = a.map((_, k) => {
      const q = [a[k], a[(k + 1) % n], b[(k + 1) % n], b[k]];
      const m = newell(q);
      return dot(m, sub(centroid(q), mid)) < 0 ? scale(m, -1) : m;
    });
    sides(a, b, normals, tone);
    for (const [ring, other, fill] of [
      [a, b, caps.a],
      [b, a, caps.b],
    ] as const) {
      const m = newell(ring);
      if (length(m) < 1e-6) continue;
      const out = dot(m, sub(centroid(ring), centroid(other))) < 0 ? scale(m, -1) : m;
      if (facing(out) > 1e-9) poly(ring, fill ?? toneOf(out, tone));
    }
    shape(hull([...a, ...b].map(at)));
  };

  /** Extrudes a convex 2D profile along an axis from `a0` to `a1`. */
  const prism = (profile: readonly V2[], axis: Axis, a0: number, a1: number, tone: Tone, cap?: string) =>
    loft(
      profile.map(([u, v]) => lift(axis, u, v, a0)),
      profile.map(([u, v]) => lift(axis, u, v, a1)),
      tone,
      { b: cap },
    );

  const box = (x: number, y: number, z: number, w: number, d: number, h: number, tone: Tone, cap?: string) => prism(rect(x, y, w, d), 'z', z, z + h, tone, cap);

  /** A round or polygonal rod between two points; `r1` tapers it (0 makes a cone). */
  const rod = (from: V3, to: V3, r: number, tone: Tone, opts: { r1?: number; sides?: number; phase?: number; cap?: string } = {}) => {
    const d = normalize(sub(to, from));
    const helper: V3 = Math.abs(d[2]) > 0.9 ? [1, 0, 0] : [0, 0, 1];
    const e1 = normalize(cross(d, helper));
    const e2 = cross(d, e1);
    const count = opts.sides ?? 28;
    const ringAt = (c: V3, rr: number) =>
      Array.from({ length: count }, (_, k) => {
        const t = (k / count) * TAU + (opts.phase ?? 0) * DEG;
        return add(c, add(scale(e1, rr * Math.cos(t)), scale(e2, rr * Math.sin(t))));
      });
    loft(ringAt(from, r), ringAt(to, opts.r1 ?? r), tone, { a: opts.cap, b: opts.cap });
  };

  const ring = (cx: number, cy: number, r: number, z: number, n: number): V3[] =>
    Array.from({ length: n }, (_, k) => [cx + r * Math.cos((k / n) * TAU), cy + r * Math.sin((k / n) * TAU), z] as const);

  /**
   * A solid of revolution around a vertical axis; `profile` lists [radius, height] from bottom to top.
   * The silhouette is drawn first as a double-width underlay that the fills then cover, which outlines
   * the union of all bands without drawing seams between them.
   */
  const lathe = (cx: number, cy: number, profile: readonly V2[], tone: Tone, opts: { creases?: readonly number[]; cap?: string } = {}) => {
    const n = 36;
    const rings = profile.map(([r, z]) => ring(cx, cy, r, z, n));
    for (let i = 0; i + 1 < rings.length; i++) shape(hull([...rings[i], ...rings[i + 1]].map(at)), ` fill="${p.line}" stroke-width="${ART.stroke * 2}"`);
    for (let i = 0; i + 1 < rings.length; i++) {
      const dz = profile[i + 1][1] - profile[i][1];
      const dr = profile[i + 1][0] - profile[i][0];
      const normals = rings[i].map((_, k): V3 => {
        const t = ((k + 0.5) / n) * TAU;
        return [Math.cos(t) * dz, Math.sin(t) * dz, -dr];
      });
      sides(rings[i], rings[i + 1], normals, tone, true);
    }
    for (const i of opts.creases ?? []) {
      const [r, z] = profile[i];
      line(arc(cx, cy, r, -45, 135, 18).map(([x, y]) => [x, y, z] as const));
    }
    const [rTop, zTop] = profile[profile.length - 1];
    if (rTop > 0) poly(ring(cx, cy, rTop, zTop, n), opts.cap ?? tone.top);
  };

  /** A sphere: projected, it is a circle shaded towards the lower right. */
  const ball = (c: V3, r: number, tone: Tone) => {
    const [sx, sy] = at(c);
    const R = r * unit * 1.2247;
    const outer = circle(sx, sy, R, 28);
    outer.forEach(([x, y]) => track(x, y));
    shape(outer, fillOnly(tone.right));
    shape(clipConvex(circle(sx - R * 0.22, sy - R * 0.26, R * 0.86, 28), outer), fillOnly(tone.left));
    shape(circle(sx - R * 0.36, sy - R * 0.4, R * 0.26, 16, R * 0.2), fillOnly(tone.top));
    shape(outer);
  };

  /** A soft ellipse that fades to nothing at its rim, in screen units. */
  const softEllipse = (cx: number, cy: number, w: number, h: number, strength: number) => {
    const [r, g, b, a] = (/rgba?\(([^)]+)\)/.exec(p.shadow)?.[1] ?? '0,0,0,0.15').split(',').map((v) => v.trim());
    const alpha = Math.min(1, Number(a ?? 0.15) * strength);
    const id = `${name}-s${shadows++}`;
    const stop = (offset: number, opacity: number) => `<stop offset="${offset}" stop-color="rgb(${r},${g},${b})" stop-opacity="${Math.round(opacity * 100) / 100}"/>`;
    return (
      `<defs><radialGradient id="${id}" cx="0.5" cy="0.5" r="0.5">${stop(0, alpha)}${stop(0.55, alpha * 0.6)}${stop(1, 0)}</radialGradient></defs>` +
      `<ellipse cx="${fmt(cx)}" cy="${fmt(cy)}" rx="${fmt(w)}" ry="${fmt(h)}" fill="url(#${id})" stroke="none"/>`
    );
  };

  /** A shadow cast on a raised surface at (x, y, z); `rx`, `ry` are screen radii in grid units. The ground shadow is automatic. */
  const shadow = (x: number, y: number, rx: number, ry: number, strength = 1.4, z = 0) => {
    const [cx, cy] = iso(x, y, z, unit, [0, 0]);
    out.push(softEllipse(cx, cy, rx * unit, ry * unit, strength));
  };

  /** A drawing plane through `o` spanned by `u` and `v`, for decals on a surface. */
  const on = (o: V3, u: V3, v: V3) => {
    const to3 = ([s, t]: V2): V3 => [o[0] + s * u[0] + t * v[0], o[1] + s * u[1] + t * v[1], o[2] + s * u[2] + t * v[2]];
    return {
      at: to3,
      poly: (pts: readonly V2[], fill: string, outline = true) => poly(pts.map(to3), fill, outline),
      line: (pts: readonly V2[], color?: string, width?: number) => line(pts.map(to3), color, width),
      /** A rounded bar with no outline: the stand-in for printed text. */
      bar: (x: number, y: number, w: number, h: number, fill = p.text, opacity?: number) =>
        shape(
          rrect(x, y, w, h, h / 2, 3).map((q) => at(to3(q))),
          fillOnly(fill) + (opacity === undefined ? '' : ` opacity="${opacity}"`),
        ),
      /** A polygon clipped to another polygon on the same plane (both convex). */
      clipped: (pts: readonly V2[], to: readonly V2[], fill: string, outline = true) =>
        shape(
          clipConvex(
            pts.map((q) => at(to3(q))),
            to.map((q) => at(to3(q))),
          ),
          outline ? ` fill="${fill}"` : fillOnly(fill),
        ),
    };
  };
  const top = (z: number) => on([0, 0, z], [1, 0, 0], [0, 1, 0]);
  const left = (y: number) => on([0, y, 0], [1, 0, 0], [0, 0, 1]);
  const right = (x: number) => on([x, 0, 0], [0, 1, 0], [0, 0, 1]);

  /**
   * A flat rounded slab lying at height `z`, turned by `angle` degrees about its centre. Returns the
   * plane of its top face with local (0, 0) at one corner and (w, h) at the opposite one.
   */
  const slab = (cx: number, cy: number, z: number, w: number, h: number, t: number, angle: number, tone: Tone, opts: { r?: number; cap?: string; outline?: readonly V2[] } = {}) => {
    const local = opts.outline ?? rrect(0, 0, w, h, opts.r ?? 0);
    prism(rotate(shift(local, cx - w / 2, cy - h / 2), angle, cx, cy), 'z', z, z + t, tone, opts.cap);
    const c = Math.cos(angle * DEG);
    const s = Math.sin(angle * DEG);
    return on([cx - (w / 2) * c + (h / 2) * s, cy - (w / 2) * s - (h / 2) * c, z + t], [c, s, 0], [-s, c, 0]);
  };

  /**
   * Finishes the drawing centred in a `width`×`height` viewBox, with a contact shadow under everything
   * that touches the ground. The shadow sits a little down and right of the footprint (light from the
   * top-left) and is kept inside the viewBox so its fade is never cut off.
   */
  const svg = (width: number, height: number) => {
    const dx = width / 2 - (bounds.x0 + bounds.x1) / 2;
    const dy = height / 2 - (bounds.y0 + bounds.y1) / 2;
    let ground = '';
    if (footprint.x0 < Infinity) {
      const [w, h] = [(footprint.x1 - footprint.x0) / 2, (footprint.y1 - footprint.y0) / 2];
      const cx = (footprint.x0 + footprint.x1) / 2 + w * 0.06;
      const cy = (footprint.y0 + footprint.y1) / 2 + h * 0.12;
      const rx = Math.min(w * 1.15 + 4, cx + dx, width - cx - dx);
      const ry = Math.min(h * 1.3 + 3, cy + dy, height - cy - dy);
      ground = softEllipse(cx, cy, rx, ry, 1.4);
    }
    return (
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">` +
      `<g transform="translate(${fmt(dx)},${fmt(dy)})" stroke="${p.line}" stroke-width="${ART.stroke}" stroke-linejoin="round" stroke-linecap="round" fill="none">` +
      ground +
      out.join('') +
      '</g></svg>'
    );
  };

  return { at, poly, line, loft, prism, box, rod, lathe, ball, shadow, on, top, left, right, slab, svg, p, unit };
}

export type Pen = ReturnType<typeof createPen>;
export type Plane = ReturnType<Pen['on']>;
export type Scene = (p: ArtPalette) => string;
export type ArtProps = { width?: number };

/** `name` keeps gradient ids unique when several scenes share one web page. */
export const scene =
  (name: string, width: number, height: number, unit: number, draw: (d: Pen, p: ArtPalette) => void): Scene =>
  (p) => {
    const d = createPen(p, unit, name);
    draw(d, p);
    return d.svg(width, height);
  };

/** Renders a scene at `width`, keeping 4:3. Decorative: the text beside it carries the meaning. */
export function IsoArt({ scene: draw, width }: { scene: Scene; width: number }) {
  const p = useArtPalette();
  const xml = useMemo(() => draw(p), [draw, p]);
  const height = (width * 3) / 4;
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width, height }}>
      <SvgXml xml={xml} width={width} height={height} />
    </View>
  );
}

/* Driver: a car on a short stretch of road, a cone and a warning sign. */

/** Bilinear point on a quad [a, b, c, d]: `s` runs a→b, `t` runs a→d. */
const quadAt = (q: readonly V3[], s: number, t: number): V3 => lerp3(lerp3(q[0], q[1], s), lerp3(q[3], q[2], s), t);

function car(d: Pen, p: ArtPalette, x: number, y: number) {
  const L = 12;
  const W = 5.2;
  const body = p.amber;
  const cabin: V2[] = [
    [x + 0.7, 3.45],
    [x + 8.8, 3.45],
    [x + 6.5, 5.95],
    [x + 1.6, 5.95],
  ];
  const wheels = [x + 2.6, x + 9.3];
  for (const cx of wheels) d.rod([cx, y - 0.2, 1.15], [cx, y + 1, 1.15], 1.15, p.dark);
  d.prism(rrect(x, 0.75, L, 2.7, [0.6, 0.6, 1.1, 0.9]), 'y', y, y + W, body);
  d.prism(cabin, 'y', y + 0.3, y + W - 0.3, body);

  const side = d.left(y + W - 0.3);
  side.poly(
    [
      [x + 1.35, 3.85],
      [x + 4.55, 3.85],
      [x + 4.55, 5.5],
      [x + 1.95, 5.5],
    ],
    p.window,
  );
  side.poly(
    [
      [x + 5.15, 3.85],
      [x + 8.0, 3.85],
      [x + 6.3, 5.5],
      [x + 5.15, 5.5],
    ],
    p.window,
  );
  const glass: V3[] = [
    [x + 8.8, y + 0.3, 3.45],
    [x + 8.8, y + W - 0.3, 3.45],
    [x + 6.5, y + W - 0.3, 5.95],
    [x + 6.5, y + 0.3, 5.95],
  ];
  d.poly([quadAt(glass, 0.08, 0.14), quadAt(glass, 0.92, 0.14), quadAt(glass, 0.92, 0.86), quadAt(glass, 0.08, 0.86)], p.window);

  const flank = d.left(y + W);
  flank.line([
    [x + 4.85, 1.05],
    [x + 4.85, 3.45],
  ]);
  flank.bar(x + 5.5, 2.75, 0.9, 0.38, body.right);
  flank.bar(x + 1.9, 2.75, 0.9, 0.38, body.right);
  for (const cx of wheels) flank.poly(arc(cx, 1.15, 1.6, 0, 180, 12), p.dark.right);

  const nose = d.right(x + L);
  nose.poly(rrect(y + 0.45, 1.6, 1.2, 0.65, 0.25), p.paper);
  nose.poly(rrect(y + W - 1.65, 1.6, 1.2, 0.65, 0.25), p.paper);
  nose.poly(rrect(y + 1.95, 1.5, W - 3.9, 0.5, 0.2), p.dark.left);

  d.box(x + 8.1, y + W - 0.05, 3.35, 0.7, 0.55, 0.5, body);
  for (const cx of wheels) {
    d.rod([cx, y + W - 0.9, 1.15], [cx, y + W + 0.25, 1.15], 1.15, p.dark);
    d.left(y + W + 0.25).poly(circle(cx, 1.15, 0.55, 20), p.neutral.right);
  }
}

function cone(d: Pen, p: ArtPalette, x: number, y: number) {
  d.box(x - 1.4, y - 1.4, 0, 2.8, 2.8, 0.4, p.dark);
  const bands: [number, number, boolean][] = [
    [0.4, 1.7, true],
    [1.7, 2.5, false],
    [2.5, 3.4, true],
    [3.4, 4.0, false],
    [4.0, 4.7, true],
  ];
  const r = (z: number) => 1.2 - ((z - 0.4) / 4.3) * 0.9;
  for (const [z0, z1, colour] of bands) d.rod([x, y, z0], [x, y, z1], r(z0), colour ? p.amber : paperTone(p), { r1: r(z1) });
}

function warningSign(d: Pen, p: ArtPalette, x: number, y: number) {
  d.rod([x, y, 0.7], [x, y, 9.2], 0.28, p.neutral);
  const plate: V2[] = [
    [y - 2.9, 7.6],
    [y + 2.9, 7.6],
    [y, 12.6],
  ];
  d.prism(plate, 'x', x + 0.3, x + 0.7, p.neutral, p.red.left);
  const face = d.right(x + 0.7);
  face.poly(
    [
      [y - 1.75, 8.25],
      [y + 1.75, 8.25],
      [y, 11.25],
    ],
    p.paper,
  );
  face.bar(y - 0.21, 9.4, 0.42, 1.25, p.line);
  face.poly(circle(y, 8.85, 0.22, 10), p.line, false);
}

const driver = scene('driver', 160, 120, 3, (d, p) => {
  d.box(0, -4.5, -1.4, 26, 4.5, 2.1, p.neutral);
  warningSign(d, p, 3.5, -2.3);
  d.box(0, 0, -1.4, 26, 13, 1.4, p.dark);
  const road = d.top(0);
  for (let x = 1.5; x < 24; x += 5) road.poly(rect(x, 6.25, 3, 0.5), p.paper, false);
  road.poly(rect(0.4, 12.1, 25.2, 0.35), p.paper, false);
  car(d, p, 7.5, 7.1);
  cone(d, p, 22.6, 9.6);
});

/* Just curious: a phone showing a notice next to a folded newspaper. */

function megaphone(pl: Plane, cx: number, cy: number, k: number, fill: string) {
  const at = (pts: readonly V2[]) => pts.map(([a, b]) => [cx + a * k, cy + b * k] as const);
  pl.poly(
    at([
      [-0.42, -0.3],
      [0.5, -0.78],
      ...arc(0.5, 0, 0.22, -90, 90, 8, 0.78),
      [0.5, 0.78],
      [-0.42, 0.3],
    ]),
    fill,
    false,
  );
  pl.poly(at(rrect(-0.82, -0.27, 0.46, 0.54, 0.12)), fill, false);
  pl.poly(
    at([
      [-0.2, 0.25],
      [0.1, 0.25],
      [0.02, 0.86],
      [-0.28, 0.86],
    ]),
    fill,
    false,
  );
}

function newspaper(d: Pen, p: ArtPalette, x: number, y: number) {
  const W = 15;
  const D = 20;
  const T = 1.1;
  d.prism(rrect(x, 0, W, T, [0, T / 2, T / 2, 0]), 'y', y, y + D, paperTone(p));
  const edge = d.left(y + D);
  edge.line([[x + 0.2, 0.37], [x + W - 0.5, 0.37]], p.neutral.right, 0.6);
  edge.line([[x + 0.2, 0.73], [x + W - 0.5, 0.73]], p.neutral.right, 0.6);

  const page = d.top(T);
  page.bar(x + 1.6, y + 1.5, 11.8, 2.0, p.dark.left);
  page.bar(x + 1.6, y + 4.3, 11.8, 0.3, p.text);
  page.bar(x + 1.6, y + 5.4, 11.2, 1.1, p.text);
  page.bar(x + 1.6, y + 7.0, 7.6, 1.1, p.text);
  const photo = rrect(x + 1.6, y + 8.7, 5.8, 5.4, 0.3);
  page.poly(photo, p.violet.top);
  page.clipped(
    [
      [x + 1.6, y + 14.1],
      [x + 3.7, y + 11.0],
      [x + 5.0, y + 12.6],
      [x + 5.9, y + 11.6],
      [x + 7.4, y + 14.1],
    ],
    photo,
    p.violet.left,
    false,
  );
  page.poly(circle(x + 5.7, y + 10.2, 0.65, 14), p.paper, false);
  for (let k = 0; k < 4; k++) page.bar(x + 8.4, y + 9.0 + k * 1.4, k === 3 ? 3.4 : 5, 0.55, p.text, 0.8);
  for (let k = 0; k < 3; k++) {
    page.bar(x + 1.6, y + 15.4 + k * 1.4, 5.8, 0.55, p.text, 0.8);
    page.bar(x + 8.4, y + 15.4 + k * 1.4, k === 2 ? 3 : 5, 0.55, p.text, 0.8);
  }
}

/** A phone lying face up; returns its screen plane (local 0..w across, 0..h from the top). */
export function phone(d: Pen, p: ArtPalette, cx: number, cy: number, angle: number, glass: string, w = 9, h = 17.5) {
  const screen = d.slab(cx, cy, 0, w, h, 1.0, angle, isNight(p) ? p.neutral : p.dark, { r: 1.7 });
  screen.poly(rrect(0.6, 0.6, w - 1.2, h - 1.2, 1.2), glass);
  screen.poly(rrect(w / 2 - 1.2, 1.25, 2.4, 0.75, 0.37), p.dark.right, false);
  screen.bar(w / 2 - 1.6, h - 1.4, 3.2, 0.35, p.dark.left);
  return screen;
}

function phoneWithNotice(d: Pen, p: ArtPalette, cx: number, cy: number, angle: number) {
  const w = 9;
  const h = 17.5;
  const screen = phone(d, p, cx, cy, angle, p.violet.top, w, h);
  screen.poly(rrect(1.0, 3.4, w - 2.0, 6.4, 1.0), p.paper);
  screen.poly(circle(3.05, 6.6, 1.75, 28), p.violet.left);
  megaphone(screen, 3.15, 6.6, 1.3, p.paper);
  screen.bar(5.4, 5.0, 2.2, 0.85, p.text);
  screen.bar(5.4, 6.5, 1.9, 0.6, p.text, 0.7);
  screen.bar(5.4, 7.7, 2.1, 0.6, p.text, 0.7);
  screen.poly(rrect(1.0, 10.6, w - 2.0, 3.0, 1.0), p.paper);
  screen.bar(2.0, 11.7, 4.8, 0.6, p.text, 0.7);
  screen.bar(2.0, 12.6, 3.0, 0.5, p.text, 0.5);
}

const curious = scene('curious', 160, 120, 3.55, (d, p) => {
  newspaper(d, p, 0, 0);
  phoneWithNotice(d, p, 24, 10.5, -28);
});

/* Student: a stack of books under a graduation cap, and a marked exam paper. */

function book(d: Pen, p: ArtPalette, x: number, y: number, z: number, w: number, dp: number, h: number, cover: Tone, spine: 'left' | 'right') {
  const t = 0.42;
  const pages = paperTone(p);
  const sp = 0.55;
  if (spine === 'left') {
    d.box(x, y, z, w, dp - sp, t, cover);
    d.box(x, y + 0.3, z + t, w - 0.5, dp - sp - 0.3, h - 2 * t, pages);
    const edge = d.right(x + w - 0.5);
    for (let k = 1; k < 4; k++) edge.line([[y + 0.5, z + t + ((h - 2 * t) * k) / 4], [y + dp - sp, z + t + ((h - 2 * t) * k) / 4]], pages.right, 0.6);
    d.box(x, y, z + h - t, w, dp - sp, t, cover);
    d.prism(rrect(y + dp - sp, z, sp, h, [0, sp / 2, sp / 2, 0]), 'x', x, x + w, cover);
    const face = d.left(y + dp);
    face.bar(x + 1.2, z + 0.45, 0.45, h - 0.9, cover.top);
    face.bar(x + w - 1.65, z + 0.45, 0.45, h - 0.9, cover.top);
    face.poly(rect(x + w / 2 - 2.4, z + 0.55, 4.8, h - 1.1), pages.top);
  } else {
    d.box(x, y, z, w - sp, dp, t, cover);
    d.box(x + 0.3, y, z + t, w - sp - 0.3, dp - 0.5, h - 2 * t, pages);
    const edge = d.left(y + dp - 0.5);
    for (let k = 1; k < 4; k++) edge.line([[x + 0.5, z + t + ((h - 2 * t) * k) / 4], [x + w - sp, z + t + ((h - 2 * t) * k) / 4]], pages.right, 0.6);
    d.box(x, y, z + h - t, w - sp, dp, t, cover);
    d.prism(rrect(x + w - sp, z, sp, h, [0, sp / 2, sp / 2, 0]), 'y', y, y + dp, cover);
    const face = d.right(x + w);
    face.bar(y + 1.0, z + 0.45, 0.45, h - 0.9, cover.top);
    face.bar(y + dp - 1.45, z + 0.45, 0.45, h - 0.9, cover.top);
  }
}

function gradCap(d: Pen, p: ArtPalette, cx: number, cy: number, z: number, angle: number) {
  const cap = isNight(p) ? p.neutral : p.dark;
  d.rod([cx, cy, z], [cx, cy, z + 1.5], 2.9, cap);
  const board = rotate(rect(cx - 5.2, cy - 5.2, 10.4, 10.4), angle, cx, cy);
  d.prism(board, 'z', z + 1.5, z + 2.0, cap);
  d.rod([cx, cy, z + 2.0], [cx, cy, z + 2.35], 0.5, cap);
  const corner = board[1];
  const top = z + 2.0;
  d.line([[cx, cy, top + 0.3], [corner[0], corner[1], top]], p.amber.left, 1.1);
  d.line([[corner[0], corner[1], top], [corner[0], corner[1], top - 2.0]], p.amber.left, 1.1);
  d.rod([corner[0], corner[1], top - 1.9], [corner[0], corner[1], top - 3.9], 0.42, p.amber, { r1: 0.62 });
}

function examPaper(d: Pen, p: ArtPalette, cx: number, cy: number, angle: number) {
  const w = 11.5;
  const h = 15;
  const sheet = d.slab(cx, cy, 0, w, h, 0.25, angle, paperTone(p));
  sheet.bar(1.2, 1.3, 5.4, 0.9, p.text);
  sheet.bar(1.2, 2.8, 3.4, 0.6, p.text, 0.7);
  sheet.line(arc(w - 2.2, 2.2, 1.35, 0, 360, 20), p.red.left, 1.0);
  sheet.line([[w - 2.85, 2.25], [w - 2.3, 2.8], [w - 1.5, 1.6]], p.red.left, 1.0);
  for (let k = 0; k < 4; k++) {
    const t = 5.3 + k * 2.4;
    sheet.line([[1.1, t + 0.1], [1.6, t + 0.6], [2.5, t - 0.5]], p.green.left, 1.2);
    sheet.bar(3.3, t - 0.35, k % 2 ? 5.2 : 6.6, 0.6, p.text, 0.8);
  }
}

const student = scene('student', 160, 120, 3.4, (d, p) => {
  examPaper(d, p, 5.2, 15.2, -12);
  book(d, p, 8, -2, 0, 15, 10.5, 2.6, p.indigo, 'left');
  book(d, p, 8.6, -1.4, 2.6, 13.8, 9.6, 2.2, p.neutral, 'right');
  book(d, p, 8.2, -1.8, 4.8, 14.4, 10.2, 2.4, p.indigo, 'left');
  gradCap(d, p, 15.4, 3.1, 7.2, 0);
});

/* Parent: a school backpack, a desk calendar and the school behind them. */

export function deskCalendar(d: Pen, p: ArtPalette, x: number, y: number, w: number, accent: Tone, page: (pl: Plane, w: number, h: number) => void) {
  const depth = 5;
  const h = 7.4;
  const lean = 1.2;
  d.prism(
    [
      [y, 0],
      [y + depth, 0],
      [y + depth - lean, h],
      [y + lean, h],
    ],
    'x',
    x,
    x + w,
    p.neutral,
  );
  const o: V3 = [x, y + depth - lean, h];
  const slope = normalize([0, lean, -h]);
  const len = Math.hypot(lean, h);
  const pl = d.on(o, [1, 0, 0], slope);
  pl.poly(rect(0.35, 0.45, w - 0.7, len - 0.75), p.paper);
  pl.poly(rect(0.35, 0.45, w - 0.7, 1.7), accent.left);
  page(pl, w, len);
  for (let s = 1.1; s < w - 0.6; s += 1.05) pl.line([[s, -0.15], [s, 0.95]], p.line, 0.9);
}

function monthPage(p: ArtPalette, accent: Tone) {
  return (pl: Plane, w: number, len: number) => {
    const cols = 6;
    const rows = 4;
    const gx = (w - 1.6) / cols;
    const gy = (len - 3.4) / rows;
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const [sx, sy] = [0.95 + c * gx, 2.75 + r * gy];
        if (r === 2 && c === 3) pl.poly(circle(sx + gx * 0.35, sy + gy * 0.35, 0.62, 16), accent.left, false);
        else pl.bar(sx + gx * 0.12, sy + gy * 0.2, gx * 0.48, gy * 0.32, p.text, 0.75);
      }
  };
}

function backpack(d: Pen, p: ArtPalette, x: number, y: number) {
  const tone = p.pink;
  const W = 9;
  const H = 11.5;
  const D = 5;
  const strap = [...arc(y + 0.3, H / 2 + 0.3, 1.8, 90, 270, 14, 5.0), ...arc(y + 0.3, H / 2 + 0.3, 0.9, 270, 90, 14, 4.1)];
  d.right(x + W - 1.6).poly(strap, tone.right);
  d.prism(rrect(x, 0, W, H, [1.0, 1.0, 4.0, 4.0]), 'y', y, y + D, tone);
  d.left(y + D / 2).poly([...arc(x + W / 2, H - 0.6, 1.75, 180, 0, 12), ...arc(x + W / 2, H - 0.6, 1.05, 0, 180, 12)], tone.left);
  const front = d.left(y + D);
  front.line(arc(x + W / 2, H - 4.0, 3.15, 180, 0, 16), tone.right, 1.0);
  front.poly(rrect(x + W / 2 + 3.15 - 0.4, H - 4.6, 0.8, 1.7, 0.35), p.paper);
  d.prism(rrect(y + 0.9, 0.8, D - 1.8, 4.2, [0.6, 0.6, 0.6, 0.6]), 'x', x + W, x + W + 1.1, tone);
  d.rod([x + W + 0.55, y + D / 2, 3.6], [x + W + 0.55, y + D / 2, 7.2], 0.85, p.sky);
  d.rod([x + W + 0.55, y + D / 2, 7.2], [x + W + 0.55, y + D / 2, 7.9], 0.55, paperTone(p));
  d.prism(rrect(x + 1.2, 0.8, W - 2.4, 5.4, [1.2, 1.2, 2.0, 2.0]), 'y', y + D, y + D + 1.8, tone);
  const pocket = d.left(y + D + 1.8);
  pocket.line(
    [
      [x + 2.1, 4.9],
      [x + W - 2.1, 4.9],
    ],
    tone.right,
    1.0,
  );
  pocket.poly(rrect(x + W - 3.3, 3.3, 0.8, 1.7, 0.35), p.paper);
  pocket.poly(rrect(x + 2.3, 1.7, W - 4.6, 0.9, 0.45), p.paper);
}

function school(d: Pen, p: ArtPalette, x: number, y: number) {
  const L = 20;
  const D = 6;
  const H = 5.4;
  const roof = (from: number, to: number) => {
    const slabAt = (sign: 1 | -1): V2[] => {
      const ridge: V2 = [y + D / 2, H + 3.1];
      const eave: V2 = [y + D / 2 + sign * (D / 2 + 1.0), H - 0.35];
      return [ridge, eave, [eave[0], eave[1] - 0.45], [ridge[0], ridge[1] - 0.45]];
    };
    d.prism(slabAt(-1), 'x', from, to, p.pink);
    return () => d.prism(slabAt(1), 'x', from, to, p.pink);
  };
  d.box(x, y, 0, L, D, H, p.neutral);
  d.prism(
    [
      [y, H],
      [y + D, H],
      [y + D / 2, H + 2.7],
    ],
    'x',
    x,
    x + L,
    p.neutral,
  );
  const frontSlab = roof(x - 0.6, x + L + 0.6);
  const tx = x + L / 2 - 1.7;
  const ty = y + D / 2 - 1.7;
  d.box(tx, ty, H + 1, 3.4, 3.4, 5.6, p.neutral);
  frontSlab();
  d.rod([tx + 1.7, ty + 1.7, H + 6.6], [tx + 1.7, ty + 1.7, H + 9.4], 2.75, p.pink, { r1: 0, sides: 4, phase: 45 });
  const tower = d.left(ty + 3.4);
  tower.poly(circle(tx + 1.7, H + 4.9, 1.05, 20), p.paper);
  tower.line([[tx + 1.7, H + 4.9], [tx + 1.7, H + 5.55]], p.line, 0.8);
  tower.line([[tx + 1.7, H + 4.9], [tx + 2.2, H + 4.9]], p.line, 0.8);
  const facade = d.left(y + D);
  for (const wx of [0.9, 3.6, 6.3, 12.0, 14.7, 17.4]) {
    facade.poly(rect(x + wx, 2.0, 1.8, 2.2), p.window);
    facade.line([[x + wx + 0.9, 2.0], [x + wx + 0.9, 4.2]]);
  }
  facade.poly(rect(x + 8.8, 0, 2.4, 3.9), p.pink.right);
  facade.line([[x + 10, 0], [x + 10, 3.9]]);
  const end = d.right(x + L);
  end.poly(rect(y + 1.2, 2.0, 1.4, 2.2), p.window);
  end.poly(rect(y + 3.4, 2.0, 1.4, 2.2), p.window);
}

function flag(d: Pen, p: ArtPalette, x: number, y: number, h: number, tone: Tone) {
  d.rod([x, y, 0], [x, y, h], 0.2, p.neutral);
  const wave = (t: number) => Math.sin(t * Math.PI) * 0.35;
  const cloth = d.left(y);
  const pts: V2[] = [];
  for (let k = 0; k <= 6; k++) pts.push([x + 0.2 + k * 0.6, h - 0.3 - wave(k / 6)]);
  for (let k = 6; k >= 0; k--) pts.push([x + 0.2 + k * 0.6, h - 2.5 - wave(k / 6)]);
  cloth.poly(pts, tone.left);
}

const parent = scene('parent', 160, 120, 3.2, (d, p) => {
  school(d, p, 1, -12);
  flag(d, p, 24.5, -7.5, 11, p.pink);
  deskCalendar(d, p, 13, 4, 9.5, p.pink, monthPage(p, p.pink));
  backpack(d, p, 2, 7);
});

/* Business owner: a market kiosk with a striped awning and an electronic billing machine. */

function kiosk(d: Pen, p: ArtPalette, x: number, y: number) {
  const L = 17;
  d.box(x, y - 6, 0, L, 0.7, 11.2, p.neutral);
  d.box(x + 0.5, y - 5.3, 6.6, L - 1, 1.5, 0.35, p.neutral);
  [p.green, p.amber, p.sky, p.brand, p.green].forEach((tone, k) => d.box(x + 1.3 + k * 3.0, y - 5.0, 6.95, 1.7, 1.0, 1.9, tone));
  d.box(x, y, 0, L, 4.6, 5.2, p.neutral);
  const front = d.left(y + 4.6);
  front.poly(rect(x, 3.6, L, 1.0), p.brand.left);
  d.box(x + 0.8, y + 1.2, 5.2, 4.6, 3.0, 1.0, p.amber);
  const fruit: V3[] = [
    [1.7, 1.9, 0],
    [2.9, 1.9, 0],
    [4.1, 1.9, 0],
    [1.7, 3.2, 0],
    [2.9, 3.2, 0],
    [4.1, 3.2, 0],
    [2.3, 2.5, 0.95],
    [3.5, 2.5, 0.95],
  ];
  for (const [fx, fy, fz] of fruit) d.ball([x + fx, y + fy, 6.6 + fz], 0.62, p.brand);
  d.box(x + 7.0, y + 1.4, 5.2, 3.2, 2.6, 1.6, p.neutral);
  d.box(x + 7.4, y + 1.7, 6.8, 2.4, 2.0, 1.2, p.neutral);
  for (const bx of [12.0, 13.4, 14.8]) {
    d.rod([x + bx, y + 2.8, 5.2], [x + bx, y + 2.8, 7.0], 0.55, p.green);
    d.rod([x + bx, y + 2.8, 7.0], [x + bx, y + 2.8, 7.9], 0.55, p.green, { r1: 0.25 });
  }
  const stripes = 7;
  const sw = (L + 1.0) / stripes;
  const awning: V2[] = [
    [y - 5.3, 11.0],
    [y + 1.6, 9.4],
    [y + 1.6, 9.0],
    [y - 5.3, 10.6],
  ];
  const white = paperTone(p);
  for (let k = 0; k < stripes; k++) d.prism(awning, 'x', x - 0.5 + k * sw, x - 0.5 + (k + 1) * sw, k % 2 ? white : p.brand);
  const valance = d.left(y + 1.6);
  for (let k = 0; k < stripes; k++) {
    const x0 = x - 0.5 + k * sw;
    valance.poly([[x0, 9.0], [x0 + sw, 9.0], ...arc(x0 + sw / 2, 8.4, sw / 2, 0, -180, 8)], (k % 2 ? white : p.brand).left);
  }
}

function billingMachine(d: Pen, p: ArtPalette, x: number, y: number) {
  const body = isNight(p) ? p.neutral : p.dark;
  const W = 7;
  const D = 10.5;
  d.prism(
    [
      [y, 0],
      [y + D, 0],
      [y + D, 1.6],
      [y + 1.8, 2.6],
      [y, 2.6],
    ],
    'x',
    x,
    x + W,
    body,
  );
  d.rod([x + 0.3, y + 1.3, 2.6], [x + W - 0.3, y + 1.3, 2.6], 1.25, body);
  const top = d.on([x, y + 1.8, 2.6], [1, 0, 0], normalize([0, D - 1.8, -1.0]));
  top.poly(rrect(0.8, 0.6, W - 1.6, 2.6, 0.3), p.window);
  top.bar(1.4, 1.2, 3.0, 0.5, p.paper, 0.85);
  top.bar(1.4, 2.1, 2.0, 0.5, p.paper, 0.6);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) top.poly(rrect(0.9 + c * 1.85, 3.9 + r * 1.3, 1.45, 0.95, 0.25), p.paper);
  [p.red.left, p.amber.left, p.green.left].forEach((fill, c) => top.poly(rrect(0.9 + c * 1.85, 3.9 + 3 * 1.3, 1.45, 0.95, 0.25), fill));

  // The receipt leaves the printer roll and curls back; it is drawn as strips along that curve.
  const steps = 8;
  const slip = Array.from({ length: steps + 1 }, (_, k): V2 => {
    const a = (k / steps) * 120 * DEG;
    return [y + 1.3 - Math.sin(a) * 1.6 - (k / steps) * 0.8, 3.7 + (1 - Math.cos(a)) * 1.6 + (k / steps) * 3.2];
  });
  const [sx0, sx1] = [x + 1.4, x + W - 1.4];
  const at = ([sy, sz]: V2, sx: number): V3 => [sx, sy, sz];
  for (let k = 0; k < steps; k++) d.poly([at(slip[k], sx0), at(slip[k], sx1), at(slip[k + 1], sx1), at(slip[k + 1], sx0)], p.paper, false);
  for (let k = 3; k < steps; k++) {
    const mid: V2 = [(slip[k][0] + slip[k + 1][0]) / 2, (slip[k][1] + slip[k + 1][1]) / 2];
    d.line([at(mid, sx0 + 0.6), at(mid, k % 2 ? sx1 - 1.6 : sx1 - 0.6)], p.text, 0.9);
  }
  const tip = slip[steps];
  const prev = slip[steps - 1];
  const along = Math.hypot(tip[0] - prev[0], tip[1] - prev[1]);
  const teeth = Array.from({ length: 7 }, (_, i): V3 => {
    const out = i % 2 ? 0.35 / along : 0;
    return at([tip[0] + (tip[0] - prev[0]) * out, tip[1] + (tip[1] - prev[1]) * out], sx0 + ((sx1 - sx0) * i) / 6);
  });
  d.poly([...teeth, at(tip, sx1), at(tip, sx0)], p.paper, false);
  d.line(slip.map((q) => at(q, sx0)));
  d.line(slip.map((q) => at(q, sx1)));
  d.line(teeth);
}

const business = scene('business', 160, 120, 3.0, (d, p) => {
  kiosk(d, p, 0, 0);
  billingMachine(d, p, 19.5, -1);
});

/* Living abroad: a suitcase with a passport on top, and a plane overhead. */

function suitcase(d: Pen, p: ArtPalette, x: number, y: number) {
  const W = 11;
  const D = 6.5;
  const tone = p.sky;
  const handle = isNight(p) ? p.neutral : p.dark;
  for (const [wx, wy] of [
    [x + 1.2, y + 1.2],
    [x + W - 1.2, y + 1.2],
  ])
    d.rod([wx, wy - 0.5, 0.55], [wx, wy + 0.5, 0.55], 0.55, handle);
  d.rod([x + 3, y + 1.4, 15], [x + 3, y + 1.4, 20.5], 0.32, p.neutral);
  d.rod([x + 8, y + 1.4, 15], [x + 8, y + 1.4, 20.5], 0.32, p.neutral);
  d.prism(rrect(y + 0.8, 20.3, 1.2, 1.3, 0.5), 'x', x + 2.3, x + 8.7, handle);
  d.prism(rrect(x, 1.0, W, 14.5, 1.6), 'y', y, y + D, tone);
  const front = d.left(y + D);
  for (const gx of [2.75, 5.5, 8.25]) front.line([[x + gx, 2.8], [x + gx, 13.7]], tone.right, 1.4);
  const top = d.top(15.5);
  top.poly(rrect(x + 1.8, y + 0.6, 7.4, 1.6, 0.6), handle.right);
  for (const [wx, wy] of [
    [x + 1.2, y + D - 1.2],
    [x + W - 1.2, y + D - 1.2],
  ])
    d.rod([wx, wy - 0.5, 0.55], [wx, wy + 0.5, 0.55], 0.55, handle);
  const cover: Tone = { top: p.indigo.right, left: mix(p.indigo.right, p.line, 0.3), right: mix(p.indigo.right, p.line, 0.5) };
  const passport = d.slab(x + 6.8, y + 4.3, 15.5, 4.2, 5.6, 0.5, -16, { ...paperTone(p), top: cover.top }, { r: 0.4 });
  passport.line(arc(2.1, 2.6, 0.95, 0, 360, 20), p.amber.top, 0.9);
  passport.bar(1.0, 0.9, 2.2, 0.4, p.amber.top);
  passport.bar(1.2, 4.3, 1.8, 0.4, p.amber.top);
}

function airplane(d: Pen, p: ArtPalette, o: V3, pitch: number, size: number) {
  const c = Math.cos(pitch * DEG);
  const s = Math.sin(pitch * DEG);
  // Local frame: +y is the tail, -y the nose; pitch tilts the nose up.
  const T = (v: V3): V3 => [o[0] + v[0] * size, o[1] + (v[1] * c + v[2] * s) * size, o[2] + (v[2] * c - v[1] * s) * size];
  const white = paperTone(p);
  const r = 1.25 * size;
  const wing = (side: 1 | -1): V3[] => [
    [side * 0.6, -1.4, 0],
    [side * 0.6, 1.4, 0],
    [side * 7.2, 4.0, 0],
    [side * 7.2, 2.9, 0],
  ];
  const plate = (pts: V3[], t: number, tone: Tone) =>
    d.loft(
      pts.map((q) => T([q[0], q[1], q[2] - t / 2])),
      pts.map((q) => T([q[0], q[1], q[2] + t / 2])),
      tone,
    );
  plate(wing(-1), 0.3, white);
  plate(
    [
      [-0.4, 6.2, 0.4],
      [-0.4, 7.4, 0.5],
      [-3.0, 8.4, 0.5],
      [-3.0, 7.7, 0.5],
    ],
    0.2,
    white,
  );
  d.rod(T([0, -6.0, 0]), T([0, -8.0, 0.1]), r, white, { r1: 0.35 * size });
  d.rod(T([0, -6.0, 0]), T([0, 5.0, 0]), r, white);
  d.rod(T([0, 5.0, 0]), T([0, 8.4, 0.75]), r, white, { r1: 0.35 * size });
  d.loft(
    [
      T([-0.15, 5.6, 0.8]),
      T([-0.15, 8.4, 1.0]),
      T([-0.15, 9.0, 4.2]),
      T([-0.15, 7.6, 4.2]),
    ],
    [
      T([0.15, 5.6, 0.8]),
      T([0.15, 8.4, 1.0]),
      T([0.15, 9.0, 4.2]),
      T([0.15, 7.6, 4.2]),
    ],
    p.sky,
  );
  d.rod(T([3.3, 0.4, -0.75]), T([3.3, 2.5, -0.75]), 0.55 * size, white);
  plate(wing(1), 0.3, white);
  plate(
    [
      [0.4, 6.2, 0.4],
      [0.4, 7.4, 0.5],
      [3.0, 8.4, 0.5],
      [3.0, 7.7, 0.5],
    ],
    0.2,
    white,
  );
  for (let k = 0; k < 6; k++) {
    const along = -4.4 + k * 1.5;
    d.poly(circle(0, 0, 0.28, 10).map(([a, b]) => T([1.1, along + a, 0.45 + b])), p.window, false);
  }
}

const abroad = scene('abroad', 160, 120, 3.15, (d, p) => {
  suitcase(d, p, 0, 0);
  airplane(d, p, [15, -7, 23], 10, 0.8);
});

export function SituationCurious({ width = 160 }: ArtProps) {
  return <IsoArt scene={curious} width={width} />;
}

export function SituationDriver({ width = 160 }: ArtProps) {
  return <IsoArt scene={driver} width={width} />;
}

export function SituationStudent({ width = 160 }: ArtProps) {
  return <IsoArt scene={student} width={width} />;
}

export function SituationParent({ width = 160 }: ArtProps) {
  return <IsoArt scene={parent} width={width} />;
}

export function SituationBusiness({ width = 160 }: ArtProps) {
  return <IsoArt scene={business} width={width} />;
}

export function SituationAbroad({ width = 160 }: ArtProps) {
  return <IsoArt scene={abroad} width={width} />;
}

export const SITUATION_ART: Record<'general' | 'driver' | 'student' | 'parent' | 'business' | 'abroad', (props: ArtProps) => JSX.Element> = {
  general: SituationCurious,
  driver: SituationDriver,
  student: SituationStudent,
  parent: SituationParent,
  business: SituationBusiness,
  abroad: SituationAbroad,
};
