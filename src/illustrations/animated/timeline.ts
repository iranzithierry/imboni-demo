import type { ArtPalette } from '../palette';
import { H, W, type V2 } from './kit';

export type Ease = 'linear' | 'in' | 'out' | 'inOut';
/** [time in ms, value, easing of the segment that ends at this key]. Before the first key the first value holds. */
export type Key = readonly [number, number, Ease?];
export type Track = readonly Key[];

export type Motion = {
  /** Each entry adds `v · value` to the layer's position, in viewBox units. */
  moves?: readonly { v: V2; k: Track }[];
  scale?: { at: V2; k: Track };
  /**
   * A sheet turning about a hinge: `axis` is the hinge direction on screen, `rest` the sheet's
   * down direction at rest and `out` the direction its free edge first moves in. Degrees.
   */
  flip?: { at: V2; axis: V2; rest: V2; out: V2; k: Track };
  opacity?: Track;
};

export type Pose = { tx: number; ty: number; rot: number; skew: number; sx: number; sy: number; o: number };

export function ease(kind: Ease | undefined, x: number): number {
  'worklet';
  if (kind === 'in') return x * x * x;
  if (kind === 'out') return 1 - (1 - x) * (1 - x) * (1 - x);
  if (kind === 'inOut') return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  return x;
}

export function sample(track: Track | undefined, t: number, fallback: number): number {
  'worklet';
  if (!track || track.length === 0) return fallback;
  if (t <= track[0][0]) return track[0][1];
  for (let i = 1; i < track.length; i++) {
    const b = track[i];
    if (t <= b[0]) {
      const a = track[i - 1];
      const span = b[0] - a[0];
      const x = span <= 0 ? 1 : (t - a[0]) / span;
      return a[1] + (b[1] - a[1]) * ease(b[2], x);
    }
  }
  return track[track.length - 1][1];
}

/** [a, b, c, d, e, f] maps (x, y) to (a·x + c·y + e, b·x + d·y + f), as in SVG and CSS. */
type Affine = [number, number, number, number, number, number];

function compose(m: Affine, n: Affine): Affine {
  'worklet';
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ];
}

function about(at: V2, a: number, b: number, c: number, d: number): Affine {
  'worklet';
  return [a, b, c, d, at[0] - a * at[0] - c * at[1], at[1] - b * at[0] - d * at[1]];
}

/**
 * Where a layer is at time `t`, as the rotate/skew/scale/translate steps a React Native view
 * understands, applied about the view centre like RN and CSS do.
 */
export function pose(m: Motion, t: number): Pose {
  'worklet';
  let M: Affine = [1, 0, 0, 1, 0, 0];
  if (m.flip) {
    const f = m.flip;
    const th = (sample(f.k, t, 0) * Math.PI) / 180;
    const dx = f.rest[0] * Math.cos(th) + f.out[0] * Math.sin(th);
    const dy = f.rest[1] * Math.cos(th) + f.out[1] * Math.sin(th);
    // Map the rest basis (axis, rest) onto (axis, turned down vector).
    const det = f.axis[0] * f.rest[1] - f.axis[1] * f.rest[0];
    const i00 = f.rest[1] / det;
    const i01 = -f.rest[0] / det;
    const i10 = -f.axis[1] / det;
    const i11 = f.axis[0] / det;
    const a = f.axis[0] * i00 + dx * i10;
    const c = f.axis[0] * i01 + dx * i11;
    const b = f.axis[1] * i00 + dy * i10;
    const d = f.axis[1] * i01 + dy * i11;
    M = compose(about(f.at, a, b, c, d), M);
  }
  if (m.scale) {
    const s = sample(m.scale.k, t, 1);
    M = compose(about(m.scale.at, s, 0, 0, s), M);
  }
  if (m.moves) {
    let x = 0;
    let y = 0;
    for (let i = 0; i < m.moves.length; i++) {
      const v = sample(m.moves[i].k, t, 0);
      x += m.moves[i].v[0] * v;
      y += m.moves[i].v[1] * v;
    }
    M[4] += x;
    M[5] += y;
  }

  // Decompose the linear part as rotate · skewX · scale, then express the offset about the centre.
  const [a, b, c, d, e, f] = M;
  const sx = Math.sqrt(a * a + b * b);
  const o = sample(m.opacity, t, 1);
  if (sx < 1e-6) return { tx: 0, ty: 0, rot: 0, skew: 0, sx: 0, sy: 0, o: 0 };
  const rot = Math.atan2(b, a);
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  let sy = -c * sin + d * cos;
  if (Math.abs(sy) < 1e-4) sy = sy < 0 ? -1e-4 : 1e-4;
  const skew = Math.atan((c * cos + d * sin) / sy);
  const cx = W / 2;
  const cy = H / 2;
  return { tx: e + a * cx + c * cy - cx, ty: f + b * cx + d * cy - cy, rot, skew, sx, sy, o };
}

export type LayerDef = { id: string; draw: (p: ArtPalette) => string; motion?: Motion };
export type SceneDef = { duration: number; layers: readonly LayerDef[] };
