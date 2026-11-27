import type { ArtPalette } from '../palette';
import {
  add,
  circlePath,
  circlePts,
  faceLeft,
  isNight,
  lift,
  numeralSegs,
  numeralWidth,
  on,
  rrectPath,
  rrectPts,
  svg,
  view,
  type Plane,
  type V2,
  type V3,
} from './kit';
import type { SceneDef } from './timeline';

const SCALE = 1.3;
const { pen, at: screen, vec } = view([112, 158], SCALE);

// Tent calendar: ridge along x at the top, slopes down to the front (+y) and back (-y).
const CAL = { w: 70, half: 13, h: 64 };
const slopeLen = Math.hypot(CAL.half, CAL.h);
const down: V3 = [0, CAL.half / slopeLen, -CAL.h / slopeLen];
const outward: V3 = [0, CAL.h / slopeLen, CAL.half / slopeLen];
const slope: Plane = { o: [0, 0, CAL.h], u: [1, 0, 0], v: down };
const PAGE = { x: 3, y: 3.2, w: CAL.w - 6, h: slopeLen - 6.2 };
const pagePlane = (i: number): Plane => lift(slope, 0.5 + i * 0.45);

function stand(p: ArtPalette) {
  const d = pen(p);
  const tone = isNight(p) ? p.neutral : p.dark;
  const ridgeL: V3 = [0, 0, CAL.h];
  const ridgeR: V3 = [CAL.w, 0, CAL.h];
  return svg(
    d.poly([ridgeR, [CAL.w, CAL.half, 0], [CAL.w, -CAL.half, 0]], tone.right) +
      d.poly([ridgeL, ridgeR, [CAL.w, CAL.half, 0], [0, CAL.half, 0]], tone.left) +
      // Page block edges below the sheets.
      d.poly(
        [on(pagePlane(0), PAGE.x + PAGE.w, PAGE.y + PAGE.h), on(pagePlane(3), PAGE.x + PAGE.w, PAGE.y + PAGE.h), on(pagePlane(3), PAGE.x, PAGE.y + PAGE.h), on(pagePlane(0), PAGE.x, PAGE.y + PAGE.h)],
        p.neutral.right,
      ),
  );
}

function page(day: string, i: number) {
  return (p: ArtPalette) => {
    const d = pen(p);
    const pl = pagePlane(i);
    const { x, y, w, h } = PAGE;
    const nh = 27;
    const nw = numeralWidth(day, nh);
    return svg(
      d.shape(pl, rrectPath(x, y, w, h, 2.5), p.paper) +
        d.shape(
          pl,
          [
            ['M', x, y],
            ['L', x + w, y],
            ['L', x + w, y + 14],
            ['L', x, y + 14],
            ['Z'],
          ],
          p.brand.left,
        ) +
        d.bar(pl, x + w / 2 - 11, y + 7.6, 22, 2.8, p.paper, 0.85) +
        d.ink(pl, numeralSegs(day, x + (w - nw) / 2, y + 22, nh), p.line, 3.4) +
        [0, 1, 2, 3, 4, 5].map((c) => d.shape(pl, circlePath(x + 9 + c * 9.2, y + h - 6, 1.1), p.text, { stroke: false, opacity: 0.8 })).join(''),
    );
  };
}

function rings(p: ArtPalette) {
  const d = pen(p);
  const pl = pagePlane(4);
  const parts: string[] = [];
  for (let i = 0; i < 7; i++) {
    const a = PAGE.x + 6 + i * ((PAGE.w - 12) / 6);
    const top = on(faceLeft([0, 0, CAL.h]), a, -2.6);
    const front = on(pl, a, PAGE.y + 2.2);
    const wire = [add(top, [0, -2.2, -0.6]), top, add(top, [0, 2.4, -0.6]), front];
    parts.push(d.line(wire, p.line, 3));
    parts.push(d.line(wire, p.neutral.right, 1.1));
  }
  return svg(parts.join(''));
}

// Bell hanging from a small desk stand, behind and to the left of the calendar.
const STAND = { x: -88, y: -24, w: 36, h: 46, post: 3 };
const PIVOT: V3 = [STAND.x + (STAND.w + STAND.post) / 2, STAND.y + STAND.post / 2, STAND.h];

function shadows(p: ArtPalette) {
  const d = pen(p);
  return svg(
    d.shadow('remind-bell', [STAND.x + STAND.w / 2 + 4, STAND.y + 6, 0], 36, 10, 1.4) + d.shadow('remind-cal', [CAL.w / 2 + 8, 6, 0], 70, 16, 1.4),
  );
}

function bellStand(p: ArtPalette) {
  const d = pen(p);
  const tone = isNight(p) ? p.neutral : p.dark;
  const { x, y, w, h, post } = STAND;
  return svg(
    d.box([x - 3, y - 4, 0], [w + post + 6, post + 8, 3], tone) +
      d.box([x, y, 3], [post, post, h - 3], tone) +
      d.box([x, y, h], [w + post, post, post], tone),
  );
}

/** The right-hand post sits in front of the bell when it swings away, so it is drawn above it. */
function bellPost(p: ArtPalette) {
  const d = pen(p);
  const tone = isNight(p) ? p.neutral : p.dark;
  const { x, y, w, h, post } = STAND;
  const x0 = x + w;
  const x1 = x0 + post;
  const y1 = y + post;
  return svg(
    d.poly([[x0, y1, h], [x1, y1, h], [x1, y1, 3], [x0, y1, 3]], tone.left) + d.poly([[x1, y1, h], [x1, y, h], [x1, y, 3], [x1, y1, 3]], tone.right),
  );
}

/** Cubic Bézier segments through the points (Catmull-Rom), so curves pass through every point. */
function through(pts: V2[]): [V2, V2, V2, V2][] {
  const segs: [V2, V2, V2, V2][] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[i];
    const c = pts[i + 1];
    const e = pts[Math.min(pts.length - 1, i + 2)];
    segs.push([b, [b[0] + (c[0] - a[0]) / 6, b[1] + (c[1] - a[1]) / 6], [c[0] - (e[0] - b[0]) / 6, c[1] - (e[1] - b[1]) / 6], c]);
  }
  return segs;
}

const f2 = (q: V2) => `${q[0].toFixed(2)} ${q[1].toFixed(2)}`;
const curve = (segs: [V2, V2, V2, V2][]) => segs.map((s) => `C${f2(s[1])} ${f2(s[2])} ${f2(s[3])}`).join('');

/**
 * A bell is a body of revolution, so it looks the same from every side and is drawn straight in
 * screen space: its rim is the isometric ellipse of a circle (1.2247 r by 0.7071 r).
 */
function bell(p: ArtPalette) {
  const S = SCALE;
  const [px, py] = screen(PIVOT);
  const R = 10.5;
  const drop = 6;
  const len = 22;
  const rimY = py + (drop + len) * S;
  const ex = 1.2247 * S;
  const ey = 0.7071 * S;
  const prof: [number, number][] = [
    [0, 1],
    [2.4, 0.9],
    [7, 0.72],
    [13, 0.62],
    [18, 0.55],
    [21, 0.36],
    [22, 0],
  ];
  const leftSide = prof.map(([h, r]) => [px - ex * R * r, rimY - h * S] as V2);
  const rightSide = prof
    .slice(0, -1)
    .map(([h, r]) => [px + ex * R * r, rimY - h * S] as V2)
    .reverse();
  const chain = through([...leftSide, ...rightSide]);
  const half = prof.length - 1;
  const rx = ex * R;
  const ry = ey * R;
  const apex = leftSide[leftSide.length - 1];
  const body = `M${f2(leftSide[0])}${curve(chain)}A${rx.toFixed(2)} ${ry.toFixed(2)} 0 0 1 ${f2(leftSide[0])}Z`;
  const shade = `M${f2(apex)}${curve(chain.slice(half))}A${rx.toFixed(2)} ${ry.toFixed(2)} 0 0 1 ${f2([px, rimY + ry])}Z`;
  const line = `stroke="${p.line}" stroke-width="1.25" stroke-linejoin="round" stroke-linecap="round"`;
  const metal = isNight(p) ? p.neutral : p.dark;
  const lipR = 0.9;
  return svg(
    `<path d="M${f2([px, py])}L${f2([px, py + (drop + 1) * S])}" stroke="${p.line}" stroke-width="2.4" stroke-linecap="round"/>` +
      `<circle cx="${px.toFixed(2)}" cy="${(rimY + ry + 1.6 * S).toFixed(2)}" r="${(2.6 * S).toFixed(2)}" fill="${metal.left}" ${line}/>` +
      `<path d="${body}" fill="${p.amber.left}"/>` +
      `<path d="${shade}" fill="${p.amber.right}"/>` +
      `<path d="M${f2([px - ex * R * lipR, rimY - 2.4 * S])}A${(ex * R * lipR).toFixed(2)} ${(ey * R * lipR).toFixed(2)} 0 0 0 ${f2([px + ex * R * lipR, rimY - 2.4 * S])}" fill="none" ${line}/>` +
      `<path d="M${f2([px - ex * R * 0.46, rimY - 16 * S])}C${f2([px - ex * R * 0.52, rimY - 11 * S])} ${f2([px - ex * R * 0.6, rimY - 7.5 * S])} ${f2([px - ex * R * 0.66, rimY - 5.6 * S])}" fill="none" stroke="${p.amber.top}" stroke-width="2.4" stroke-linecap="round"/>` +
      `<path d="${body}" fill="none" ${line}/>` +
      `<ellipse cx="${px.toFixed(2)}" cy="${(apex[1] + 0.2 * S).toFixed(2)}" rx="${(2.4 * S).toFixed(2)}" ry="${(1.5 * S).toFixed(2)}" fill="${p.amber.top}" ${line}/>`,
  );
}

// Reminder card rising beside the calendar.
const CARD = { x: 54, y: -42, z: 86, w: 68, h: 36, t: 4 };
const cardBack = faceLeft([CARD.x, CARD.y - CARD.t, CARD.z]);
const cardFace = lift(cardBack, CARD.t);

function reminder(p: ArtPalette) {
  const d = pen(p);
  const f = cardFace;
  const c: V2 = [17, CARD.h / 2];
  const r = 10.5;
  const clockFace = lift(f, 3);
  return svg(
    d.plate(cardBack, rrectPts(0, 0, CARD.w, CARD.h, 7, 6), CARD.t, p.neutral) +
      d.plate(f, circlePts(c[0], c[1], r, 40), 3, p.brand) +
      d.shape(clockFace, circlePath(c[0], c[1], r - 2.6), p.paper) +
      d.ink(clockFace, [['M', c[0], c[1] - 5.2], ['L', c[0], c[1]], ['L', c[0] + 3.8, c[1] + 2]], p.line, 1.8) +
      d.bar(f, 33, 11, 30, 4, p.text) +
      d.bar(f, 33, 19, 20, 3, p.text, 0.6),
  );
}

function reminderShadow(p: ArtPalette) {
  return svg(pen(p).shadow('remind-card', [CARD.x + CARD.w / 2 + 6, CARD.y + 6, 0], 40, 9, 0.9));
}

const hinge = screen(on(pagePlane(3), PAGE.x, PAGE.y));
const flip = (start: number) => ({
  at: hinge,
  axis: vec([1, 0, 0]),
  rest: vec(down),
  out: vec(outward),
  k: [
    [start, 0],
    [start + 190, 48, 'in'],
    [start + 320, 118],
  ] as const,
});
const fade = (start: number) =>
  [
    [start + 265, 1],
    [start + 320, 0],
  ] as const;

const rise = vec([0, 0, -26]);

const remind: SceneDef = {
  duration: 2250,
  layers: [
    { id: 'shadows', draw: shadows },
    { id: 'bell-stand', draw: bellStand },
    {
      id: 'bell',
      draw: bell,
      motion: {
        // Swings on its axle: toward the viewer, back, then still.
        flip: {
          at: screen(PIVOT),
          axis: vec([1, 0, 0]),
          rest: vec([0, 0, -1]),
          out: vec([0, 1, 0]),
          k: [
            [940, 0],
            [1180, 24, 'out'],
            [1500, -9, 'inOut'],
            [1800, 0, 'inOut'],
          ],
        },
      },
    },
    { id: 'bell-post', draw: bellPost },
    { id: 'card-shadow', draw: reminderShadow, motion: { opacity: [[1350, 0], [2000, 1]] } },
    {
      id: 'card',
      draw: reminder,
      motion: {
        opacity: [[1350, 0], [1650, 1]],
        moves: [{ v: rise, k: [[1350, 1], [2200, 0, 'out']] }],
      },
    },
    { id: 'stand', draw: stand },
    { id: 'page-6', draw: page('6', 0) },
    { id: 'page-7', draw: page('7', 1), motion: { flip: flip(840), opacity: fade(840) } },
    { id: 'page-8', draw: page('8', 2), motion: { flip: flip(580), opacity: fade(580) } },
    { id: 'page-9', draw: page('9', 3), motion: { flip: flip(320), opacity: fade(320) } },
    { id: 'rings', draw: rings },
  ],
};

export default remind;
