import type { JSX } from 'react';

import type { ArtPalette } from '../palette';
import {
  add,
  arc,
  circle,
  cross,
  DEG,
  deskCalendar,
  dot,
  isNight,
  IsoArt,
  mix,
  normalize,
  paperTone,
  phone,
  rrect,
  scale,
  scene,
  sub,
  type ArtProps,
  type Pen,
  type Plane,
  type Tone,
  type V2,
  type V3,
} from './situations';

/** A plane whose local axes run screen-right and screen-down, for marks that should read upright. */
const facingUp = (d: Pen, c: V3) => d.on(c, [Math.SQRT1_2, -Math.SQRT1_2, 0], [Math.SQRT1_2, Math.SQRT1_2, 0]);

const tick = (c: V2, k: number): V2[] => [
  [c[0] - 0.45 * k, c[1] + 0.02 * k],
  [c[0] - 0.12 * k, c[1] + 0.34 * k],
  [c[0] + 0.48 * k, c[1] - 0.3 * k],
];

/* Inbox: a phone with three notification cards stacked on its screen and a check badge. */

const inbox = scene('inbox', 200, 150, 6, (d, p) => {
  const angle = -28;
  const [w, h] = [11, 21];
  const screen = phone(d, p, 6, 11, angle, p.window, w, h);
  const ch = 4.6;
  const stack = [
    { inset: 2.3, top: 10.4, z: 0.05 },
    { inset: 1.6, top: 9.3, z: 0.45 },
    { inset: 0.9, top: 8.0, z: 0.85 },
  ];
  const cards = stack.map((card) => {
    const c = screen.at([w / 2, card.top + ch / 2]);
    return d.slab(c[0], c[1], c[2] + card.z, w - card.inset * 2, ch, 0.35, angle, paperTone(p), { r: 1.0 });
  });
  const front = cards[cards.length - 1];
  front.poly(circle(1.9, ch / 2, 1.15, 24), p.sky.left);
  front.bar(3.7, 1.3, 4.4, 0.8, p.text);
  front.bar(3.7, 2.6, 3.4, 0.6, p.text, 0.7);
  front.bar(3.7, 3.5, 2.4, 0.5, p.text, 0.5);
  const badge = front.at([w - 2.2, 0.3]);
  const badgeTop: V3 = [badge[0], badge[1], badge[2] + 0.7];
  d.rod(badge, badgeTop, 2.0, p.green, { cap: p.green.left });
  facingUp(d, badgeTop).line(tick([0, 0], 2.1), p.paper, 1.4);
});

/* Tracking: a clipboard checklist with every row ticked, and a bell resting beside it. */

function bell(d: Pen, p: ArtPalette, x: number, y: number) {
  const profile: V2[] = [
    [3.3, 0],
    [3.3, 0.45],
    [3.0, 0.7],
    [2.55, 1.3],
    [2.3, 2.2],
    [2.15, 3.3],
    [2.08, 4.2],
    [1.95, 4.9],
    [1.65, 5.45],
    [1.2, 5.85],
    [0.6, 6.05],
    [0, 6.1],
  ];
  d.lathe(x, y, profile, p.amber, { creases: [1] });
  d.ball([x, y, 6.5], 0.55, p.amber);
}

const tracking = scene('tracking', 200, 150, 5, (d, p) => {
  const angle = -24;
  const [w, h] = [13, 17.5];
  const board = d.slab(0, 0, 0, w, h, 0.7, angle, isNight(p) ? p.neutral : p.dark, { r: 1.0 });
  const sc = board.at([w / 2, 9.6]);
  const sheet = d.slab(sc[0], sc[1], sc[2], 11, 14.4, 0.12, angle, paperTone(p), { r: 0.2 });
  for (let r = 0; r < 4; r++) {
    const t = 3.6 + r * 2.7;
    sheet.poly(rrect(1.0, t - 0.95, 1.9, 1.9, 0.45), p.green.left);
    sheet.line(tick([1.95, t], 1.5), p.paper, 1.1);
    sheet.bar(3.6, t - 0.35, r % 2 ? 5.0 : 6.4, 0.7, p.text, 0.8);
  }
  const cc = board.at([w / 2, 1.5]);
  const clip = d.slab(cc[0], cc[1], cc[2], 5.6, 2.4, 0.9, angle, paperTone(p), { r: 0.7 });
  clip.poly(circle(2.8, 1.2, 0.5, 14), paperTone(p).right);
  bell(d, p, 14.5, 9);
});

/* Saved: an open folder with a bookmark ribbon hanging out of it. */

const saved = scene('saved', 200, 150, 4.5, (d, p) => {
  const L = 17;
  const tone = p.sky;
  const t = 0.45;
  const [backY, backZ] = [-3.0, 13];
  const [frontY, frontZ] = [6.0, 10.2];
  d.prism(
    [
      [0, 0],
      [t, 0],
      [backY + t, backZ],
      [backY, backZ],
    ],
    'x',
    0,
    L,
    tone,
  );
  const back = d.on([0, t, 0], [1, 0, 0], normalize([0, backY, backZ]));
  const tabAt = Math.hypot(backY, backZ);
  back.poly(
    [
      [1.4, tabAt - 0.05],
      [6.6, tabAt - 0.05],
      [6.0, tabAt + 1.6],
      [2.0, tabAt + 1.6],
    ],
    tone.left,
  );
  d.prism(
    [
      [0.5, 0],
      [0.5 + t, 0],
      [frontY, frontZ],
      [frontY - t, frontZ],
    ],
    'x',
    0,
    L,
    tone,
  );
  const ribbon = p.brand;
  const [r0, r1] = [11.0, 13.2];
  d.poly(
    [
      [r0, frontY - t - 0.05, frontZ + 0.05],
      [r1, frontY - t - 0.05, frontZ + 0.05],
      [r1, frontY + 0.05, frontZ + 0.05],
      [r0, frontY + 0.05, frontZ + 0.05],
    ],
    ribbon.top,
  );
  const front = d.on([0, frontY, frontZ], [1, 0, 0], normalize([0, 0.5 + t - frontY, -frontZ]));
  front.poly(
    [
      [r0, 0],
      [r1, 0],
      [r1, 6.4],
      [(r0 + r1) / 2, 5.3],
      [r0, 6.4],
    ],
    ribbon.left,
  );
});

/* Reports: a document with a small flag pinned to it, and a magnifying glass. */

type Lens = { centre: V3; normal: V3; r: number; handle: V3; rim: Tone; grip: Tone };

/** A magnifying glass with its lens facing `normal`; the handle leaves the rim along `handle`. */
function magnifier(d: Pen, p: ArtPalette, { centre, normal, r, handle, rim, grip }: Lens) {
  const n = normalize(normal);
  const h = normalize(sub(handle, scale(n, dot(handle, n))));
  const e2 = cross(n, h);
  const rimHalf = 0.4;
  // A handle pointing away from the viewer sits behind the rim, so it is painted first.
  const handleFirst = h[0] + h[1] + h[2] < 0;
  const drawHandle = () => {
    d.rod(add(centre, scale(h, r - 0.2)), add(centre, scale(h, r + 1.1)), 0.55, paperTone(p));
    d.rod(add(centre, scale(h, r + 1.1)), add(centre, scale(h, r + 6.2)), 0.62, grip, { r1: 0.72 });
  };
  if (handleFirst) drawHandle();
  d.rod(sub(centre, scale(n, rimHalf)), add(centre, scale(n, rimHalf)), r, rim, { cap: rim.top });
  const lens = d.on(add(centre, scale(n, rimHalf)), h, e2);
  lens.poly(circle(0, 0, r - 0.65, 32), p.window);
  lens.line(arc(0, 0, r - 1.25, 150, 215, 8), p.paper, 1.1);
  if (!handleFirst) drawHandle();
}

const reports = scene('reports', 200, 150, 4.1, (d, p) => {
  const angle = -16;
  const [w, h] = [12, 15.5];
  const fold = 2.8;
  const doc = d.slab(0, 0, 0, w, h, 0.3, angle, paperTone(p), {
    outline: [
      [0, 0],
      [w - fold, 0],
      [w, fold],
      [w, h],
      [0, h],
    ],
  });
  doc.poly(
    [
      [w - fold, 0],
      [w - fold, fold],
      [w, fold],
    ],
    paperTone(p).right,
  );
  doc.bar(1.4, 1.6, 5.6, 0.9, p.text);
  [7.8, 9.2, 8.4, 9.2, 6.0].forEach((len, k) => doc.bar(1.4, 4.4 + k * 1.6, len, 0.6, p.text, 0.75));
  doc.bar(1.4, 12.8, 3.6, 0.6, p.text, 0.5);
  const pin = doc.at([3.2, 5.0]);
  const top = pin[2] + 6.4;
  d.ball(pin, 0.45, p.red);
  d.rod(pin, [pin[0], pin[1], top], 0.17, isNight(p) ? p.neutral : p.dark);
  const flag = d.left(pin[1]);
  flag.poly(
    [
      [pin[0] + 0.15, top - 0.1],
      [pin[0] + 3.6, top - 0.1],
      [pin[0] + 2.8, top - 1.35],
      [pin[0] + 3.6, top - 2.6],
      [pin[0] + 0.15, top - 2.6],
    ],
    p.red.left,
  );
  const dark = isNight(p) ? p.neutral : p.dark;
  magnifier(d, p, { centre: [14.5, 6.5, 0.45], normal: [0, 0, 1], r: 3.1, handle: [1, 0.55, 0], rim: dark, grip: dark });
});

/* Search: a magnifying glass over a small stack of stamped letters. */

function letterFace(pl: Plane, p: ArtPalette, w: number, h: number) {
  pl.poly(circle(w / 2, 2.1, 1.05, 20), p.sky.left, false);
  pl.poly(circle(w / 2, 2.1, 0.42, 12), p.amber.top, false);
  pl.bar(w / 2 - 2.5, 3.7, 5, 0.6, p.text);
  [8.2, 7.0, 8.2, 5.2].forEach((len, k) => pl.bar(1.4, 5.3 + k * 1.3, len, 0.5, p.text, 0.75));
  pl.line(
    [
      [1.5, 12.4],
      [2.1, 11.3],
      [2.6, 12.1],
      [3.2, 11.5],
      [3.6, 12.2],
      [4.6, 11.6],
    ],
    p.indigo.right,
    0.8,
  );
  const s: V2 = [w - 2.7, 11.6];
  pl.line(arc(s[0], s[1], 1.45, 0, 360, 24), p.brand.left, 0.7);
  pl.line(arc(s[0], s[1], 0.95, 0, 360, 18), p.brand.left, 0.45);
  pl.poly(circle(s[0], s[1], 0.4, 12), p.brand.left, false);
}

const search = scene('search', 200, 150, 5.2, (d, p) => {
  const [w, h] = [11, 14.5];
  const paper = paperTone(p);
  d.slab(1.0, 0.8, 0, w, h, 0.22, -6, paper);
  d.slab(-0.6, 0.3, 0.22, w, h, 0.22, 7, paper);
  const top = d.slab(0, 0, 0.44, w, h, 0.22, -15, paper);
  letterFace(top, p, w, h);
  // The dark palette's shadow is tuned for a dark ground; on white paper it needs to be much fainter.
  d.shadow(5.5, -1, 6, 3, isNight(p) ? 0.35 : 1.2, 0.66);
  const dark = isNight(p) ? p.neutral : p.dark;
  magnifier(d, p, { centre: [4.5, -2.5, 7.5], normal: [0.3, 0.55, 1], r: 3.6, handle: [1, -0.2, -0.55], rim: dark, grip: dark });
});

/* Calendar: a desk calendar showing a sun, and a cup beside it. */

const coffee = (p: ArtPalette) => mix(p.amber.right, p.line, 0.55);

function sunPage(p: ArtPalette) {
  return (pl: Plane, w: number, len: number) => {
    const c: V2 = [w / 2, 2.25 + (len - 2.25) / 2];
    for (let k = 0; k < 8; k++) {
      const a = (k * 45 + 22.5) * DEG;
      const ray = (r: number, side: number): V2 => [c[0] + Math.cos(a) * r - Math.sin(a) * side, c[1] + Math.sin(a) * r + Math.cos(a) * side];
      pl.poly([ray(2.15, -0.42), ray(3.05, 0), ray(2.15, 0.42)], p.amber.left, false);
    }
    pl.poly(circle(c[0], c[1], 1.65, 28), p.amber.left);
  };
}

function cup(d: Pen, p: ArtPalette, x: number, y: number, tone: Tone) {
  const H = 4.2;
  const R = 2.15;
  d.lathe(
    x,
    y,
    [
      [1.85, 0],
      [1.95, 0.2],
      [R, H],
    ],
    tone,
  );
  const rim = d.top(H);
  const inner = circle(x, y, R - 0.35, 32);
  rim.poly(inner, tone.right);
  d.top(H - 0.7).clipped(circle(x + 0.25, y + 0.25, R - 0.35, 32), inner, coffee(p), false);
  const side = d.left(y);
  side.poly([...arc(x + R - 0.1, 2.3, 1.55, -75, 75, 10), ...arc(x + R - 0.1, 2.3, 0.85, 75, -75, 10)], tone.left);
}

const calendar = scene('calendar', 200, 150, 5.6, (d, p) => {
  deskCalendar(d, p, 0, 0, 10.5, p.amber, sunPage(p));
  cup(d, p, 15, 5, p.teal);
});

export function EmptyInbox({ width = 200 }: ArtProps) {
  return <IsoArt scene={inbox} width={width} />;
}

export function EmptyTracking({ width = 200 }: ArtProps) {
  return <IsoArt scene={tracking} width={width} />;
}

export function EmptySaved({ width = 200 }: ArtProps) {
  return <IsoArt scene={saved} width={width} />;
}

export function EmptyReports({ width = 200 }: ArtProps) {
  return <IsoArt scene={reports} width={width} />;
}

export function EmptySearch({ width = 200 }: ArtProps) {
  return <IsoArt scene={search} width={width} />;
}

export function EmptyCalendar({ width = 200 }: ArtProps) {
  return <IsoArt scene={calendar} width={width} />;
}

export const EMPTY_ART: Record<'inbox' | 'tracking' | 'saved' | 'reports' | 'search' | 'calendar', (props: ArtProps) => JSX.Element> = {
  inbox: EmptyInbox,
  tracking: EmptyTracking,
  saved: EmptySaved,
  reports: EmptyReports,
  search: EmptySearch,
  calendar: EmptyCalendar,
};
