import type { ArtPalette } from '../palette';
import { faceLeft, lift, on, rrectPath, rrectPts, svg, view, type V2 } from './kit';
import { calendarIcon, coin, pin, tickBadge, updatedBadge, valueTag } from './objects';
import type { SceneDef } from './timeline';

const { pen, at: screen, vec } = view([97, 164], 1.22);

const CARD = { w: 116, h: 104, t: 5, z: 114 };
const back = faceLeft([0, -CARD.t, CARD.z]);
const face = lift(back, CARD.t);
const ROWS = [30, 54, 78];
const ROW_H = 21;
const TAG = { x: 55, y: ROWS[0] + 2.5, w: 38, h: 16 };
const MARK_X = 104;
const strikeFace = lift(face, TAG.h * 0.22 + 0.2);

function card(p: ArtPalette) {
  const d = pen(p);
  return svg(
    d.shadow('changed-card', [CARD.w / 2 + 10, 8, 0], 80, 17, 1.4) +
      d.plate(back, rrectPts(0, 0, CARD.w, CARD.h, 8, 6), CARD.t, p.neutral) +
      d.bar(face, 10, 9.5, 54, 5.2, p.text) +
      d.bar(face, 10, 18.6, 34, 3.2, p.text, 0.6) +
      ROWS.map((y) => d.shape(face, rrectPath(5.5, y, CARD.w - 11, ROW_H, 5.5), p.neutral.right, { stroke: false, opacity: 0.5 })).join(''),
  );
}

function fields(p: ArtPalette) {
  const d = pen(p);
  return svg(
    calendarIcon(d, face, 10.5, ROWS[0] + 2.5, 16) +
      d.bar(face, 33, ROWS[0] + 8.7, 16, 3.6, p.text) +
      pin(d, face, 18.5, ROWS[1] + 7.8, 5.2) +
      d.bar(face, 33, ROWS[1] + 5.6, 50, 3.8, p.text) +
      d.bar(face, 33, ROWS[1] + 12.2, 30, 2.8, p.text, 0.55) +
      coin(d, face, 18.5, ROWS[2] + 10.5, 6.6) +
      d.bar(face, 33, ROWS[2] + 5.6, 44, 3.8, p.text) +
      d.bar(face, 33, ROWS[2] + 12.2, 34, 2.8, p.text, 0.55),
  );
}

function changedRow(p: ArtPalette) {
  return svg(pen(p).shape(face, rrectPath(5.5, ROWS[0], CARD.w - 11, ROW_H, 5.5), p.brand.top, { stroke: false, opacity: 0.45 }));
}

function oldTag(p: ArtPalette) {
  return svg(valueTag(pen(p), face, TAG.x, TAG.y, TAG.w, TAG.h, '14', 'plain'));
}

function newTag(p: ArtPalette) {
  return svg(valueTag(pen(p), face, TAG.x, TAG.y, TAG.w, TAG.h, '28', 'brand'));
}

const STRIKE: [V2, V2] = [
  [TAG.x + 7, TAG.y + TAG.h / 2],
  [TAG.x + TAG.w - 7, TAG.y + TAG.h / 2],
];

function strike(p: ArtPalette) {
  const d = pen(p);
  return svg(d.ink(strikeFace, [['M', ...STRIKE[0]], ['L', ...STRIKE[1]]], p.red.left, 2));
}

function updated(p: ArtPalette) {
  return svg(updatedBadge(pen(p), lift(face, 1), MARK_X, ROWS[0] + ROW_H / 2, 7.6));
}

function tickAt(i: number) {
  return (p: ArtPalette) => svg(tickBadge(pen(p), lift(face, 1), MARK_X, ROWS[i] + ROW_H / 2, 6.8));
}

const along = vec([1, 0, 0]);
const markAt = (i: number) => screen(on(lift(face, 4), MARK_X, ROWS[i] + ROW_H / 2));
const pop = (start: number, i: number) => ({
  opacity: [
    [start, 0],
    [start + 120, 1],
  ] as const,
  scale: {
    at: markAt(i),
    k: [
      [start, 0.4],
      [start + 320, 1, 'out'],
    ] as const,
  },
});
const OUT_MOVE = { v: along, k: [[780, 0], [1080, -16, 'in']] } as const;
const OUT_FADE = [
  [830, 1],
  [1060, 0],
] as const;

const changed: SceneDef = {
  duration: 2450,
  layers: [
    { id: 'card', draw: card },
    { id: 'changed-row', draw: changedRow, motion: { opacity: [[1250, 0], [1550, 1]] } },
    { id: 'fields', draw: fields },
    { id: 'old-tag', draw: oldTag, motion: { moves: [OUT_MOVE], opacity: OUT_FADE } },
    {
      id: 'strike',
      draw: strike,
      motion: {
        // Grows from its left end, as if drawn across the old date.
        scale: { at: screen(on(strikeFace, ...STRIKE[0])), k: [[350, 0], [640, 1, 'inOut']] },
        moves: [OUT_MOVE],
        opacity: OUT_FADE,
      },
    },
    {
      id: 'new-tag',
      draw: newTag,
      motion: {
        moves: [{ v: along, k: [[1020, 16], [1380, 0, 'out']] }],
        opacity: [[1020, 0], [1220, 1]],
      },
    },
    { id: 'updated', draw: updated, motion: pop(1450, 0) },
    { id: 'tick-1', draw: tickAt(1), motion: pop(1850, 1) },
    { id: 'tick-2', draw: tickAt(2), motion: pop(2080, 2) },
  ],
};

export default changed;
