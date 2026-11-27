import { circlePath, circlePts, hull, lift, numeralSegs, numeralWidth, rrectPath, rrectPts, type Pen, type Plane, type Seg, type V2 } from './kit';

/** Teardrop map pin outline centred on its round head. */
export function pinPts(cx: number, cy: number, r: number): V2[] {
  return hull([...circlePts(cx, cy, r, 40), [cx, cy + r * 1.75]]);
}

/** Shield outline: flat top with soft corners, sides that curve into a point. */
export function shieldPts(cx: number, cy: number, w: number, h: number): V2[] {
  const out: V2[] = [];
  const top = cy - h / 2;
  const r = w * 0.16;
  out.push(...rrectPts(cx - w / 2, top, w, r * 2.2, r, 5).filter((p) => p[1] <= top + r));
  const n = 14;
  for (let i = 0; i <= n; i++) {
    const s = i / n;
    // Right side: straight down to mid-height, then an easing curve into the point.
    const y = top + r + s * (h - r);
    const k = Math.max(0, (y - (top + h * 0.42)) / (h * 0.58));
    out.push([cx + (w / 2) * (1 - k * k), y]);
  }
  for (let i = n; i >= 0; i--) {
    const s = i / n;
    const y = top + r + s * (h - r);
    const k = Math.max(0, (y - (top + h * 0.42)) / (h * 0.58));
    out.push([cx - (w / 2) * (1 - k * k), y]);
  }
  return hull(out);
}

export function tick(cx: number, cy: number, s: number): Seg[] {
  return [
    ['M', cx - 0.42 * s, cy + 0.02 * s],
    ['L', cx - 0.12 * s, cy + 0.3 * s],
    ['L', cx + 0.42 * s, cy - 0.28 * s],
  ];
}

/** A signed, stamped official letter lying in `pl` (top-left at local 0, 0). */
export function letter(pen: Pen, pl: Plane, w: number, h: number, o: { flat?: boolean; thick?: number; radius?: number } = {}) {
  const { p } = pen;
  const k = w / 30;
  const parts: string[] = [];
  const face = o.flat ? pl : lift(pl, o.thick ?? 1.4);
  const r = o.radius ?? 1.4 * k;
  if (o.flat) parts.push(pen.shape(pl, rrectPath(0, 0, w, h, r), p.paper, { stroke: false }));
  else parts.push(pen.plate(pl, rrectPts(0, 0, w, h, r, 4), o.thick ?? 1.4, p.neutral, { cap: p.paper }));
  // Crest and heading.
  parts.push(pen.shape(face, circlePath(w / 2, 5 * k, 2.6 * k), p.sky.left, { stroke: false }));
  parts.push(pen.shape(face, circlePath(w / 2, 5 * k, 1.1 * k), p.amber.top, { stroke: false }));
  parts.push(pen.bar(face, w / 2 - 7 * k, 9.4 * k, 14 * k, 1.5 * k, p.text));
  // Body text.
  const rows = [22, 20, 22, 14];
  rows.forEach((len, i) => parts.push(pen.bar(face, 4 * k, (14.5 + i * 3.6) * k, len * k, 1.3 * k, p.text, 0.75)));
  // Signature.
  parts.push(
    pen.ink(
      face,
      [
        ['M', 4.6 * k, 34.6 * k],
        ['C', 6 * k, 30.6 * k, 7.6 * k, 30.8 * k, 7.4 * k, 34 * k],
        ['C', 7.3 * k, 36 * k, 9 * k, 32 * k, 10.6 * k, 32.6 * k],
        ['C', 12 * k, 33.2 * k, 11.6 * k, 35.2 * k, 14.4 * k, 33.2 * k],
      ],
      p.indigo.right,
      Math.max(0.9, 0.9 * k),
    ),
  );
  // Round stamp.
  const sc: V2 = [w - 8.6 * k, 32.4 * k];
  parts.push(pen.ink(face, circlePath(sc[0], sc[1], 4.6 * k), p.brand.left, Math.max(0.8, 0.85 * k), { opacity: 0.9 }));
  parts.push(pen.ink(face, circlePath(sc[0], sc[1], 3 * k), p.brand.left, Math.max(0.6, 0.55 * k), { opacity: 0.9 }));
  parts.push(pen.shape(face, circlePath(sc[0], sc[1], 1.3 * k), p.brand.left, { stroke: false, opacity: 0.9 }));
  return parts.join('');
}

/** A small paper calendar block with a brand-coloured header; returns its markup and front face. */
function chip(pen: Pen, pl: Plane, x: number, y: number, s: number) {
  const { p } = pen;
  const t = s * 0.18;
  const header: Seg[] = [
    ['M', x, y + s * 0.2],
    ['C', x, y + s * 0.09, x + s * 0.09, y, x + s * 0.2, y],
    ['L', x + s * 0.8, y],
    ['C', x + s * 0.91, y, x + s, y + s * 0.09, x + s, y + s * 0.2],
    ['L', x + s, y + s * 0.32],
    ['L', x, y + s * 0.32],
    ['Z'],
  ];
  const face = lift(pl, t);
  return {
    face,
    markup: pen.plate(pl, rrectPts(x, y, s, s, s * 0.2, 4), t, p.neutral, { cap: p.paper }) + pen.shape(face, header, p.brand.left, { stroke: false }),
  };
}

/** Calendar chip showing a day number. */
export function dateChip(pen: Pen, pl: Plane, x: number, y: number, s: number, day: string) {
  const { face, markup } = chip(pen, pl, x, y, s);
  const nh = s * 0.4;
  const nw = numeralWidth(day, nh);
  return markup + pen.ink(face, numeralSegs(day, x + (s - nw) / 2, y + s * 0.44, nh), pen.p.line, Math.max(0.9, s * 0.075));
}

/** Calendar chip with a grid of days, one of them marked. */
export function calendarIcon(pen: Pen, pl: Plane, x: number, y: number, s: number) {
  const { p } = pen;
  const { face, markup } = chip(pen, pl, x, y, s);
  const days: string[] = [];
  for (let r = 0; r < 2; r++)
    for (let c = 0; c < 3; c++)
      days.push(pen.shape(face, rrectPath(x + s * (0.17 + c * 0.24), y + s * (0.46 + r * 0.24), s * 0.18, s * 0.15, s * 0.04), c === 2 && r === 1 ? p.brand.left : p.text, { stroke: false }));
  return markup + days.join('');
}

export function pin(pen: Pen, pl: Plane, cx: number, cy: number, r: number) {
  const { p } = pen;
  const t = r * 0.45;
  return pen.plate(pl, pinPts(cx, cy, r), t, p.brand) + pen.shape(lift(pl, t), circlePath(cx, cy, r * 0.42), p.paper);
}

export function coin(pen: Pen, pl: Plane, cx: number, cy: number, r: number) {
  const { p } = pen;
  const t = r * 0.38;
  const face = lift(pl, t);
  return (
    pen.plate(pl, circlePts(cx, cy, r, 40), t, p.amber) +
    pen.ink(face, circlePath(cx, cy, r * 0.66), p.amber.right, Math.max(0.8, r * 0.12)) +
    pen.ink(face, [['M', cx, cy - r * 0.32], ['L', cx, cy + r * 0.32]], p.amber.right, Math.max(0.8, r * 0.14))
  );
}

export function shield(pen: Pen, pl: Plane, cx: number, cy: number, w: number, h: number) {
  const { p } = pen;
  const t = w * 0.2;
  const face = lift(pl, t);
  return pen.plate(pl, shieldPts(cx, cy, w, h), t, p.green) + pen.ink(face, tick(cx, cy - h * 0.04, w * 0.62), p.paper, Math.max(1.2, w * 0.11));
}

/** Round badge with a white tick. */
export function tickBadge(pen: Pen, pl: Plane, cx: number, cy: number, r: number) {
  const { p } = pen;
  const t = r * 0.4;
  return pen.plate(pl, circlePts(cx, cy, r, 36), t, p.green) + pen.ink(lift(pl, t), tick(cx, cy + r * 0.02, r * 1.05), p.paper, Math.max(1.3, r * 0.26));
}

/** Round badge with a white circular arrow: the record was updated. */
export function updatedBadge(pen: Pen, pl: Plane, cx: number, cy: number, r: number) {
  const { p } = pen;
  const t = r * 0.4;
  const face = lift(pl, t);
  const ar = r * 0.52;
  const arc: Seg[] = [];
  const from = -50;
  const to = 230;
  for (let i = 0; i <= 14; i++) {
    const a = ((from + ((to - from) * i) / 14) * Math.PI) / 180;
    arc.push([i === 0 ? 'M' : 'L', cx + Math.cos(a) * ar, cy + Math.sin(a) * ar]);
  }
  const end = (from * Math.PI) / 180;
  const ex = cx + Math.cos(end) * ar;
  const ey = cy + Math.sin(end) * ar;
  const hs = r * 0.34;
  const head: Seg[] = [
    ['M', ex + hs * 0.95, ey - hs * 0.15],
    ['L', ex - hs * 0.35, ey - hs * 0.95],
    ['L', ex - hs * 0.15, ey + hs * 0.55],
    ['Z'],
  ];
  return (
    pen.plate(pl, circlePts(cx, cy, r, 36), t, p.brand) +
    pen.ink(face, arc, p.paper, Math.max(1.3, r * 0.22)) +
    pen.shape(face, head, p.paper, { stroke: p.paper, width: 0.8 })
  );
}

/** A pill-shaped value tag with numerals. */
export function valueTag(pen: Pen, pl: Plane, x: number, y: number, w: number, h: number, value: string, tone: 'plain' | 'brand') {
  const { p } = pen;
  const t = h * 0.22;
  const face = lift(pl, t);
  const nh = h * 0.52;
  const nw = numeralWidth(value, nh);
  const plain = tone === 'plain';
  return (
    pen.plate(pl, rrectPts(x, y, w, h, h / 2, 8), t, plain ? p.neutral : p.brand, { cap: plain ? p.paper : p.brand.left }) +
    pen.ink(face, numeralSegs(value, x + (w - nw) / 2, y + (h - nh) / 2, nh), plain ? p.line : p.paper, Math.max(1.1, h * 0.1))
  );
}

