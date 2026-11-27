import type { ArtPalette } from '../palette';
import {
  circlePath,
  circlePts,
  faceLeft,
  isNight,
  lift,
  polyPath,
  rrectPath,
  rrectPts,
  svg,
  view,
  type Plane,
  type Seg,
  type V2,
  type V3,
} from './kit';
import { letter } from './objects';
import type { SceneDef } from './timeline';

const { pen, at: screen, vec } = view([60, 150], 1.45);

const BUBBLE = { x: 0, y: 0, z: 76, w: 78, h: 50, t: 4 };
const bubbleBack = faceLeft([BUBBLE.x, BUBBLE.y - BUBBLE.t, BUBBLE.z]);
const bubbleFace = lift(bubbleBack, BUBBLE.t);
const LINES = [
  { y: 21, w: 58 },
  { y: 29.5, w: 50 },
  { y: 38, w: 34 },
];
const CLAIM = 1;

const DOC = { x: 72, y: -56, z: 86, w: 58, h: 74, t: 3 };
const docBack = faceLeft([DOC.x, DOC.y - DOC.t, DOC.z]);

function bubble(p: ArtPalette) {
  const d = pen(p);
  const { w, h, t } = BUBBLE;
  const tail: V2[] = [
    [7, h - 8],
    [-3, h + 9],
    [24, h - 3],
  ];
  const tone = { top: p.sky.top, left: p.sky.left, right: p.sky.right };
  return svg(
    d.shadow('truth-bubble', [w / 2 + 6, BUBBLE.y + 6, 0], 50, 11, 1.4) +
      d.plate(bubbleBack, tail, t, tone) +
      d.plate(bubbleBack, rrectPts(0, 0, w, h, 11, 6), t, tone) +
      // Hides the bubble's outline where the tail joins it.
      d.shape(bubbleFace, polyPath([[8.4, h - 9], [1.2, h + 3.6], [21, h - 4.2]]), p.sky.left, { stroke: false }) +
      // Forwarded mark: a curved arrow and a short label bar.
      d.ink(
        bubbleFace,
        [
          ['M', 8, 13],
          ['C', 8, 9.4, 10.2, 7.6, 13.6, 7.6],
          ['L', 17.4, 7.6],
        ],
        p.paper,
        1.7,
      ) +
      d.shape(bubbleFace, polyPath([[16.6, 4.6], [20.6, 7.6], [16.6, 10.6]]), p.paper, { stroke: p.paper, width: 1 }) +
      d.bar(bubbleFace, 24, 6.4, 22, 2.6, p.paper, 0.7) +
      LINES.map((l) => d.bar(bubbleFace, 8, l.y, l.w, 3.6, p.paper, 0.95)).join(''),
  );
}

function claimMark(p: ArtPalette) {
  const d = pen(p);
  const l = LINES[CLAIM];
  return svg(d.shape(bubbleFace, rrectPath(5.6, l.y - 2.4, l.w + 4.8, 8.4, 3), p.amber.top, { stroke: p.amber.left, width: 1 }) + d.bar(bubbleFace, 8, l.y, l.w, 3.6, p.amber.right));
}

// The lens floats in front of the bubble; these place its centre over the claim line on screen.
const LENS_Y = 18;
const CLAIM_Z = BUBBLE.z - LINES[CLAIM].y - 1.8;
const LENS = { r: 15, rim: 3.4, t: 4, y: LENS_Y, z: CLAIM_Z + LENS_Y };
const LENS_FROM = LENS_Y - 16;
const LENS_HOLD = LENS_Y + 36;
const LENS_TO = LENS_Y + 70;

/** A magnifying glass held upright and facing the viewer's left, its lens centred at LENS_FROM. */
function magnifier(p: ArtPalette) {
  const d = pen(p);
  const metal = isNight(p) ? p.neutral : p.dark;
  const pl: Plane = faceLeft([LENS_FROM, LENS.y, LENS.z]);
  const front = lift(pl, LENS.t);
  const { r, rim } = LENS;
  // Handle runs down and to the right in the lens plane.
  const a = Math.PI / 4;
  const hx = Math.cos(a);
  const hy = Math.sin(a);
  const handle = (from: number, to: number, half: number): V2[] => [
    [hx * from - hy * half, hy * from + hx * half],
    [hx * to - hy * half, hy * to + hx * half],
    [hx * to + hy * half, hy * to - hx * half],
    [hx * from + hy * half, hy * from - hx * half],
  ];
  const ringPath: Seg[] = [...circlePath(0, 0, r), ...circlePath(0, 0, r - rim)];
  return svg(
    d.plate(pl, handle(r - 1, r + 7, 2.2), LENS.t - 1, metal) +
      d.plate(pl, rrectPts(-3.6, r + 6, 7.2, 20, 3.6, 4).map(([u, v]) => [hx * v - hy * u, hy * v + hx * u] as V2), LENS.t, p.brand) +
      d.shape(pl, circlePath(0, 0, r - rim), p.window, { stroke: false, opacity: 0.38 }) +
      d.plate(pl, circlePts(0, 0, r, 44), LENS.t, metal, { cap: 'none', capStyle: { stroke: false } }) +
      d.shape(front, ringPath, metal.left, { evenodd: true }) +
      d.shape(pl, circlePath(0, 0, r - rim), 'none') +
      d.ink(
        front,
        [
          ['M', -(r - rim) * 0.62, -(r - rim) * 0.2],
          ['C', -(r - rim) * 0.6, -(r - rim) * 0.5, -(r - rim) * 0.42, -(r - rim) * 0.62, -(r - rim) * 0.16, -(r - rim) * 0.66],
        ],
        p.paper,
        2,
        { opacity: 0.8 },
      ),
  );
}

function doc(p: ArtPalette) {
  return svg(letter(pen(p), docBack, DOC.w, DOC.h, { thick: DOC.t, radius: 4 }));
}

function docShadow(p: ArtPalette) {
  return svg(pen(p).shadow('truth-doc', [DOC.x + DOC.w / 2 + 6, DOC.y + 5, 0], 40, 10, 1.4));
}

const LINK_A: V3 = [BUBBLE.x + BUBBLE.w + 1, BUBBLE.y, BUBBLE.z - 24];
const LINK_B: V3 = [DOC.x - 1, DOC.y, DOC.z - 36];
const MID: V3 = [(LINK_A[0] + LINK_B[0]) / 2, (LINK_A[1] + LINK_B[1]) / 2, (LINK_A[2] + LINK_B[2]) / 2];

function link(p: ArtPalette) {
  const d = pen(p);
  const dot = (v: V3) => {
    const [x, y] = screen(v);
    return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="2.6" fill="${p.amber.left}"/>`;
  };
  return svg(d.line([LINK_A, LINK_B], p.amber.left, 2.4, { dash: '3.6 3.2' }) + dot(LINK_A) + dot(LINK_B));
}

const WARN = 18;
function warning(p: ArtPalette) {
  const d = pen(p);
  const pl = faceLeft([MID[0], MID[1] + 3, MID[2]]);
  const s = WARN;
  const tri: V2[] = [];
  const corners: V2[] = [
    [0, -s * 0.62],
    [s * 0.72, s * 0.58],
    [-s * 0.72, s * 0.58],
  ];
  // Rounded triangle: sample small arcs at each corner.
  corners.forEach((c, i) => {
    const prev = corners[(i + 2) % 3];
    const next = corners[(i + 1) % 3];
    const k = 0.16;
    const a: V2 = [c[0] + (prev[0] - c[0]) * k, c[1] + (prev[1] - c[1]) * k];
    const b: V2 = [c[0] + (next[0] - c[0]) * k, c[1] + (next[1] - c[1]) * k];
    for (let j = 0; j <= 4; j++) {
      const t = j / 4;
      const u = 1 - t;
      tri.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]);
    }
  });
  const face = lift(pl, 3);
  return svg(
    d.plate(pl, tri, 3, p.amber) +
      d.ink(face, [['M', 0, -s * 0.2], ['L', 0, s * 0.15]], p.line, 2.6) +
      d.shape(face, circlePath(0, s * 0.35, 1.5), p.line, { stroke: false }),
  );
}

const truth: SceneDef = {
  duration: 2550,
  layers: [
    { id: 'doc-shadow', draw: docShadow, motion: { opacity: [[1500, 0], [1950, 1]] } },
    { id: 'doc', draw: doc, motion: { opacity: [[1500, 0], [1750, 1]], moves: [{ v: vec([0, 0, -1]), k: [[1500, 18], [1950, 0, 'out']] }] } },
    { id: 'bubble', draw: bubble },
    { id: 'claim', draw: claimMark, motion: { opacity: [[820, 0], [1000, 1]] } },
    { id: 'link', draw: link, motion: { opacity: [[1950, 0], [2150, 1]] } },
    {
      id: 'warning',
      draw: warning,
      motion: {
        opacity: [[2150, 0], [2270, 1]],
        scale: { at: screen([MID[0], MID[1] + 6, MID[2]]), k: [[2150, 0.4], [2500, 1, 'out']] },
      },
    },
    {
      id: 'magnifier',
      draw: magnifier,
      motion: {
        opacity: [[200, 0], [360, 1], [1380, 1], [1560, 0]],
        moves: [
          {
            v: vec([1, 0, 0]),
            k: [
              [220, 0],
              [820, LENS_HOLD - LENS_FROM, 'inOut'],
              [1060, LENS_HOLD - LENS_FROM],
              [1500, LENS_TO - LENS_FROM, 'inOut'],
            ],
          },
        ],
      },
    },
  ],
};

export default truth;
