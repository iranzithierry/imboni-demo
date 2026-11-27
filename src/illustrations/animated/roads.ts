import type { ArtPalette } from '../palette';
import { circlePath, isNight, polyPath, rrectPts, svg, view, type Pen, type Plane, type Tone, type V2, type V3 } from './kit';
import type { Ease, Motion, SceneDef, Track } from './timeline';

const SCALE = 1.5;
const { pen, vec } = view([138, 152], SCALE);
const n2 = (n: number) => n.toFixed(2);

const TILE = { x0: -76, x1: 56, y0: -74, y1: 20, t: 5 };
const ROAD = 15;
const MAIN_Y = 0;
const BACK_Y = -52;
const A_X = -34;
const B_X = 28;
const BARRIER_X = -2;

// The detour: off the main road at A, along the back road, down B and back onto the main road.
const ROUTE: V2[] = [
  [-50, MAIN_Y],
  [A_X, MAIN_Y],
  [A_X, BACK_Y],
  [B_X, BACK_Y],
  [B_X, MAIN_Y],
  [46, MAIN_Y],
];

const ground = (p: ArtPalette): Tone => ({ top: p.ground, left: p.groundLine, right: p.neutral.right });

function flatRect(d: Pen, x0: number, y0: number, x1: number, y1: number, fill: string, z = 0.02) {
  return d.poly(
    [
      [x0, y0, z],
      [x1, y0, z],
      [x1, y1, z],
      [x0, y1, z],
    ],
    fill,
    { stroke: false },
  );
}

function box(d: Pen, x: number, y: number, w: number, dd: number, h: number, tone: Tone, z = 0) {
  return d.box([x, y, z], [w, dd, h], tone);
}

/** A low building with rows of windows on both visible walls. */
function building(d: Pen, x: number, y: number, w: number, dd: number, h: number, tone: Tone) {
  const { p } = d;
  const parts = [box(d, x, y, w, dd, h, tone)];
  for (let row = 0; row * 7 + 6 < h - 3; row++) {
    const z0 = h - 5 - row * 7;
    for (let c = 0; c * 7 + 6 <= w - 2; c++) {
      const a = x + 3 + c * 7;
      parts.push(d.poly([[a, y + dd, z0], [a + 3.6, y + dd, z0], [a + 3.6, y + dd, z0 - 3.4], [a, y + dd, z0 - 3.4]], p.window, { width: 0.8 }));
    }
    for (let c = 0; c * 7 + 6 <= dd - 2; c++) {
      const b = y + dd - 3 - c * 7;
      parts.push(d.poly([[x + w, b, z0], [x + w, b - 3.6, z0], [x + w, b - 3.6, z0 - 3.4], [x + w, b, z0 - 3.4]], p.window, { width: 0.8 }));
    }
  }
  return parts.join('');
}

function tree(d: Pen, x: number, y: number, r: number) {
  const { p } = d;
  const trunk = isNight(p) ? p.neutral : p.dark;
  const [cx, cy] = d.at([x, y, r * 1.5]);
  const R = r * SCALE;
  return (
    d.shadow(`roads-tree-${x}-${y}`, [x + 2, y + 1, 0], r * 1.3, r * 0.6, 1.6) +
    box(d, x - 0.9, y - 0.9, 1.8, 1.8, r * 0.9, trunk) +
    `<circle cx="${n2(cx)}" cy="${n2(cy)}" r="${n2(R)}" fill="${p.green.left}" stroke="${p.line}" stroke-width="1.25"/>` +
    `<path d="M${n2(cx + R * 0.05)} ${n2(cy + R)}A${n2(R)} ${n2(R)} 0 0 0 ${n2(cx + R)} ${n2(cy - R * 0.05)}A${n2(R * 1.25)} ${n2(R * 1.25)} 0 0 1 ${n2(cx + R * 0.05)} ${n2(cy + R)}Z" fill="${p.green.right}"/>` +
    `<circle cx="${n2(cx - R * 0.32)}" cy="${n2(cy - R * 0.34)}" r="${n2(R * 0.34)}" fill="${p.green.top}"/>` +
    `<circle cx="${n2(cx)}" cy="${n2(cy)}" r="${n2(R)}" fill="none" stroke="${p.line}" stroke-width="1.25"/>`
  );
}

function city(p: ArtPalette) {
  const d = pen(p);
  const { x0, x1, y0, y1, t } = TILE;
  const road = p.dark.top;
  const h = ROAD / 2;
  const parts = [
    d.shadow('roads-tile', [-4, -24, -t], 136, 32, 1.4),
    d.box([x0, y0, -t], [x1 - x0, y1 - y0, t], ground(p)),
    flatRect(d, x0, MAIN_Y - h, x1, MAIN_Y + h, road),
    flatRect(d, x0, BACK_Y - h, x1, BACK_Y + h, road),
    flatRect(d, A_X - h, y0, A_X + h, y1, road),
    flatRect(d, B_X - h, y0, B_X + h, y1, road),
  ];
  const park: Tone = { top: p.green.top, left: p.green.left, right: p.green.right };
  parts.push(d.box([A_X + h + 3, BACK_Y + h + 3, 0], [B_X - A_X - ROAD - 6, MAIN_Y - BACK_Y - ROAD - 6, 1.6], park));
  parts.push(building(d, -70, -72, 20, 12, 17, { top: p.indigo.top, left: p.indigo.left, right: p.indigo.right }));
  parts.push(building(d, -16, -72, 24, 12, 23, p.neutral));
  parts.push(building(d, 38, -72, 16, 12, 28, { top: p.sky.top, left: p.sky.left, right: p.sky.right }));
  parts.push(tree(d, -62, -26, 5), tree(d, 44, -28, 5.5));
  parts.push(tree(d, -14, -22, 5.5), tree(d, 3, -32, 6.2), tree(d, 11, -18, 4.8));
  parts.push(tree(d, 44, 13, 4.8));
  return svg(parts.join(''));
}

/** Clips a convex polygon to the axis-aligned box [x0, x1] × [y0, y1]. */
function clip(poly: V2[], x0: number, y0: number, x1: number, y1: number): V2[] {
  const edges: [(q: V2) => boolean, (a: V2, b: V2) => V2][] = [
    [(q) => q[0] >= x0, (a, b) => [x0, a[1] + ((b[1] - a[1]) * (x0 - a[0])) / (b[0] - a[0])]],
    [(q) => q[0] <= x1, (a, b) => [x1, a[1] + ((b[1] - a[1]) * (x1 - a[0])) / (b[0] - a[0])]],
    [(q) => q[1] >= y0, (a, b) => [a[0] + ((b[0] - a[0]) * (y0 - a[1])) / (b[1] - a[1]), y0]],
    [(q) => q[1] <= y1, (a, b) => [a[0] + ((b[0] - a[0]) * (y1 - a[1])) / (b[1] - a[1]), y1]],
  ];
  let out = poly;
  for (const [inside, cut] of edges) {
    const input = out;
    out = [];
    for (let i = 0; i < input.length; i++) {
      const cur = input[i];
      const prev = input[(i + input.length - 1) % input.length];
      if (inside(cur)) {
        if (!inside(prev)) out.push(cut(prev, cur));
        out.push(cur);
      } else if (inside(prev)) out.push(cut(prev, cur));
    }
  }
  return out;
}

const BOARD = { y0: -11, y1: 11, z0: 8, z1: 13.5, t: 1.6 };

function barrier(p: ArtPalette) {
  const d = pen(p);
  const post = isNight(p) ? p.neutral : p.dark;
  const x = BARRIER_X;
  const { y0, y1, z0, z1, t } = BOARD;
  const parts = [d.shadow('roads-barrier', [x + 3, 0, 0], 22, 8, 1.4)];
  for (const yy of [y0 + 2, y1 - 4]) {
    parts.push(box(d, x - 3.5, yy - 0.5, 7, 3, 1.4, post));
    parts.push(box(d, x - 0.6, yy + 0.4, 1.4, 1.4, z1 - 1.4, p.neutral, 1.4));
  }
  parts.push(box(d, x - t / 2, y0, t, y1 - y0, z1 - z0, p.neutral, z0));
  // Red bands across the visible face of the board.
  const face: Plane = { o: [x + t / 2, y1, z1], u: [0, -1, 0], v: [0, 0, -1] };
  const span = y1 - y0;
  const tall = z1 - z0;
  for (let i = -1; i < 6; i++) {
    const a = i * 6.2;
    const band = clip(
      [
        [a, 0],
        [a + 3.4, 0],
        [a + 3.4 - tall * 0.8, tall],
        [a - tall * 0.8, tall],
      ],
      0,
      0,
      span,
      tall,
    );
    if (band.length > 2) parts.push(d.shape(face, polyPath(band), p.red.left, { stroke: false }));
  }
  parts.push(d.poly([[x + t / 2, y1, z1], [x + t / 2, y0, z1], [x + t / 2, y0, z0], [x + t / 2, y1, z0]], 'none'));
  // Lamp on top.
  parts.push(box(d, x - 1.2, -1.2, 2.4, 2.4, 2.6, p.amber, z1));
  return svg(parts.join(''));
}

function cone(p: ArtPalette, x: number, y: number) {
  const d = pen(p);
  const [bx, by] = d.at([x, y, 1.2]);
  const S = SCALE;
  const ex = 1.2247 * S;
  const ey = 0.7071 * S;
  const r0 = 2.6;
  const r1 = 0.6;
  const h = 9;
  const line = `stroke="${p.line}" stroke-width="1.25" stroke-linejoin="round"`;
  const at = (hh: number) => r0 + (r1 - r0) * (hh / h);
  const band = (h0: number, h1: number) =>
    `M${n2(bx - ex * at(h0))} ${n2(by - h0 * S)}A${n2(ex * at(h0))} ${n2(ey * at(h0))} 0 0 0 ${n2(bx + ex * at(h0))} ${n2(by - h0 * S)}L${n2(bx + ex * at(h1))} ${n2(by - h1 * S)}A${n2(ex * at(h1))} ${n2(ey * at(h1))} 0 0 1 ${n2(bx - ex * at(h1))} ${n2(by - h1 * S)}Z`;
  const body = `M${n2(bx - ex * r0)} ${n2(by)}A${n2(ex * r0)} ${n2(ey * r0)} 0 0 0 ${n2(bx + ex * r0)} ${n2(by)}L${n2(bx + ex * r1)} ${n2(by - h * S)}A${n2(ex * r1)} ${n2(ey * r1)} 0 0 0 ${n2(bx - ex * r1)} ${n2(by - h * S)}Z`;
  const shade = `M${n2(bx)} ${n2(by + ey * r0)}A${n2(ex * r0)} ${n2(ey * r0)} 0 0 0 ${n2(bx + ex * r0)} ${n2(by)}L${n2(bx + ex * r1)} ${n2(by - h * S)}L${n2(bx)} ${n2(by - h * S)}Z`;
  return svg(
    d.shadow(`roads-cone-${x}-${y}`, [x + 2, y + 1, 0], 6, 3, 1.6) +
      d.box([x - 3.4, y - 3.4, 0], [6.8, 6.8, 1.2], p.brand) +
      `<path d="${body}" fill="${p.brand.left}"/>` +
      `<path d="${shade}" fill="${p.brand.right}"/>` +
      `<path d="${band(3, 5.2)}" fill="${p.paper}"/>` +
      `<path d="${body}" fill="none" ${line}/>`,
  );
}

const legs = ROUTE.slice(1).map((b, i) => {
  const a = ROUTE[i];
  return { a, b, len: Math.hypot(b[0] - a[0], b[1] - a[1]) };
});
const ROUTE_LEN = legs.reduce((s, l) => s + l.len, 0);
/** Distance along the route of each turn. */
const TURNS = legs.slice(0, -1).map((_, i) => legs.slice(0, i + 1).reduce((s, l) => s + l.len, 0));

/** The point at distance `s` along the route. */
function along(s: number): V2 {
  let rest = s;
  for (const l of legs) {
    if (rest <= l.len) {
      const k = rest / l.len;
      return [l.a[0] + (l.b[0] - l.a[0]) * k, l.a[1] + (l.b[1] - l.a[1]) * k];
    }
    rest -= l.len;
  }
  return ROUTE[ROUTE.length - 1];
}

const DASH = 5;
const GAP = 3.6;
const GROUPS = 8;

function routePart(g: number) {
  return (p: ArtPalette) => {
    const d = pen(p);
    const from = (ROUTE_LEN * g) / GROUPS;
    const to = (ROUTE_LEN * (g + 1)) / GROUPS;
    const parts: string[] = [];
    for (let s = 0; s < ROUTE_LEN - DASH; s += DASH + GAP) {
      if (s < from || s >= to) continue;
      const e = s + DASH;
      // A dash that spans a turn bends with the road.
      const bends = ROUTE.slice(1, -1).filter((_, i) => TURNS[i] > s && TURNS[i] < e);
      parts.push(d.line([along(s), ...bends, along(e)].map((q) => [q[0], q[1], 0.1] as V3), p.brand.left, 2.8));
    }
    if (g === GROUPS - 1) {
      const [ex, ey] = ROUTE[ROUTE.length - 1];
      parts.push(
        d.poly(
          [
            [ex + 7, ey, 0.1],
            [ex - 1, ey - 5, 0.1],
            [ex - 1, ey + 5, 0.1],
          ],
          p.brand.left,
          { stroke: p.brand.left, width: 1.6 },
        ),
      );
    }
    return svg(parts.join(''));
  };
}

/** A small hatchback, drawn for a heading in degrees (0 drives along +x, -90 along -y). */
function car(p: ArtPalette, cx: number, cy: number, heading: number) {
  const d = pen(p);
  const r = (heading * Math.PI) / 180;
  const fx = Math.cos(r);
  const fy = Math.sin(r);
  // Local frame: f forward, s to the car's left-hand side seen from above, z up.
  const w = (f: number, s: number, z: number): V3 => [cx + f * fx - s * fy, cy + f * fy + s * fx, z];
  const L = 11;
  const B = 5.6;
  const body = rrectPts(-L, -B, 2 * L, 2 * B, 2.6, 4).map(([f, s]) => w(f, s, 6.2));
  const tone: Tone = { top: p.sky.top, left: p.sky.left, right: p.sky.right };
  const parts: string[] = [d.shadow(`roads-car-${heading}-${cx}-${cy}`, [cx + 2, cy + 1, 0], 15, 8, 1.8)];

  // Wheels on whichever long side faces the viewer.
  const side = -fy + fx > 0 ? 1 : -1;
  const wheels = (sgn: number) =>
    [-6.6, 6.6]
      .map((f) => {
        const pl: Plane = { o: w(f, sgn * (B + 0.3), 2.7), u: [fx, fy, 0], v: [0, 0, -1] };
        return d.shape(pl, circlePath(0, 0, 2.7), isNight(p) ? p.neutral.left : p.dark.left) + d.shape(pl, circlePath(0, 0, 1.1), p.neutral.right, { stroke: false });
      })
      .join('');
  parts.push(d.slab(body, [0, 0, -4.4], tone));
  parts.push(wheels(side));

  // Cabin with sloped screens front and back.
  const prof: V2[] = [
    [-7.4, 6.2],
    [6, 6.2],
    [2.8, 10.6],
    [-6, 10.6],
  ];
  const cabSide = prof.map(([f, z]) => w(f, (B - 1) * side, z));
  const across: V3 = [fy * 2 * (B - 1) * side, -fx * 2 * (B - 1) * side, 0];
  parts.push(d.slab(cabSide, across, { top: p.neutral.top, left: p.neutral.left, right: p.neutral.right }));
  const glass = (f0: number, f1: number) => {
    const z0 = 7;
    const z1 = 9.9;
    const fr = (z: number) => 6 + (2.8 - 6) * ((z - 6.2) / 4.4);
    const bk = (z: number) => -7.4 + (-6 + 7.4) * ((z - 6.2) / 4.4);
    const a0 = Math.max(f0, bk(z0));
    const a1 = Math.min(f1, fr(z0));
    const b0 = Math.max(f0, bk(z1));
    const b1 = Math.min(f1, fr(z1));
    return d.poly([w(a0, (B - 0.9) * side, z0), w(a1, (B - 0.9) * side, z0), w(b1, (B - 0.9) * side, z1), w(b0, (B - 0.9) * side, z1)], p.window, { width: 0.9 });
  };
  parts.push(glass(-6.6, -0.6), glass(0.2, 5.4));
  // Windscreen or rear window, whichever end faces the viewer.
  const front = fx + fy > 0;
  const e = front ? 1 : -1;
  const [g0, g1] = front ? [6, 2.8] : [-7.4, -6];
  const sl = (k: number, z: number): V3 => w(g0 + (g1 - g0) * ((z - 6.2) / 4.4), k, z);
  parts.push(d.poly([sl(-(B - 1.8), 6.8), sl(B - 1.8, 6.8), sl(B - 2.2, 10.1), sl(-(B - 2.2), 10.1)], p.window, { width: 0.9 }));
  // Lamps on the visible end.
  for (const k of [-(B - 1.6), B - 1.6]) {
    const pl: Plane = { o: w(e * (L + 0.05), k, 4.6), u: [-fy, fx, 0], v: [0, 0, -1] };
    parts.push(d.shape(pl, circlePath(0, 0, 1.1), front ? p.amber.top : p.red.left, { width: 0.8 }));
  }
  return svg(parts.join(''));
}

const START: V2 = [-64, MAIN_Y];
const STOP: V2 = [-50, MAIN_Y];
const END: V2 = [A_X, -28];

/** Moves a car drawn at `anchor` through world positions on the ground. */
const carMotion = (anchor: V2, keys: [number, V2, Ease?][], opacity: Track): Motion => {
  const dx = vec([1, 0, 0]);
  const dy = vec([0, 1, 0]);
  return {
    moves: [
      { v: dx, k: keys.map(([tt, q, e]) => [tt, q[0] - anchor[0], e] as const) },
      { v: dy, k: keys.map(([tt, q, e]) => [tt, q[1] - anchor[1], e] as const) },
    ],
    opacity,
  };
};

const roads: SceneDef = {
  duration: 3200,
  layers: [
    { id: 'city', draw: city },
    ...Array.from({ length: GROUPS }, (_, g) => ({
      id: `route-${g}`,
      draw: routePart(g),
      motion: { opacity: [[1250 + g * 110, 0], [1370 + g * 110, 1]] as Track },
    })),
    {
      id: 'car-east',
      draw: (p: ArtPalette) => car(p, STOP[0], STOP[1], 0),
      motion: carMotion(STOP, [[0, START], [1150, STOP, 'out'], [2150, STOP], [2500, [A_X - 5, MAIN_Y], 'in']], [[2420, 1], [2520, 0]]),
    },
    {
      id: 'car-turning',
      draw: (p: ArtPalette) => car(p, A_X - 1.5, -2.5, -45),
      motion: carMotion([A_X - 1.5, -2.5], [[2450, [A_X - 2.8, -1.2]], [2600, [A_X - 0.6, -4.4]]], [[2440, 0], [2500, 1], [2570, 1], [2630, 0]]),
    },
    {
      id: 'car-north',
      draw: (p: ArtPalette) => car(p, END[0], END[1], -90),
      motion: carMotion(END, [[2560, [A_X, -6]], [3150, END, 'out']], [[2560, 0], [2620, 1]]),
    },
    {
      id: 'barrier',
      draw: barrier,
      motion: { moves: [{ v: vec([0, 0, 1]), k: [[450, 46], [820, 0, 'in']] }], opacity: [[450, 0], [560, 1]] },
    },
    ...[
      [BARRIER_X - 8, -4.5],
      [BARRIER_X - 8, 4.5],
    ].map(([x, y], i) => ({
      id: `cone-${i}`,
      draw: (p: ArtPalette) => cone(p, x, y),
      motion: {
        moves: [{ v: vec([0, 0, 1]), k: [[820 + i * 120, 34], [1100 + i * 120, 0, 'in']] as Track }],
        opacity: [[820 + i * 120, 0], [900 + i * 120, 1]] as Track,
      },
    })),
  ],
};

export default roads;
