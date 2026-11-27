import type { ArtPalette } from '../palette';
import { circlePath, faceLeft, isNight, lift, on, rrectPath, rrectPts, svg, view, type V2 } from './kit';
import { coin, dateChip, letter, pin, shield } from './objects';
import type { SceneDef } from './timeline';

const { pen, at, vec } = view([29, 170], 1.4);

const PHONE = { x: 0, z: 112, w: 54, h: 104, t: 5 };
const phoneBack = faceLeft([PHONE.x, -PHONE.t, PHONE.z]);
const phoneFace = lift(phoneBack, PHONE.t);
const PHOTO = { x: 5, y: 23, w: 44, h: 50 };
const SMALL = { x: 11.8, y: 29, w: 30.4, h: 38 };

const CARD = { x: 64, y: -46, z: 108, w: 80, h: 100, t: 4 };
const cardBack = faceLeft([CARD.x, CARD.y - CARD.t, CARD.z]);
const cardFace = lift(cardBack, CARD.t);

function phone(p: ArtPalette) {
  const d = pen(p);
  const f = phoneFace;
  const night = isNight(p);
  const parts = [
    d.shadow('kept-ph', [PHONE.w / 2 + 6, 6, 0], 44, 10, 1.4),
    d.plate(phoneBack, rrectPts(0, 0, PHONE.w, PHONE.h, 8, 6), PHONE.t, night ? p.neutral : p.dark),
    d.shape(f, rrectPath(2.6, 2.6, PHONE.w - 5.2, PHONE.h - 5.2, 5.8), night ? p.dark.top : p.neutral.top),
    d.shape(f, rrectPath(PHONE.w / 2 - 6, 5.2, 12, 3.2, 1.6), p.dark.right, { stroke: false }),
    // Post header: account avatar and name.
    d.shape(f, circlePath(9.5, 15.5, 3.6), p.sky.left, { stroke: false }),
    d.shape(f, circlePath(9.5, 15.5, 1.5), p.amber.top, { stroke: false }),
    d.bar(f, 15.5, 12.8, 20, 2.6, p.text),
    d.bar(f, 15.5, 16.6, 12, 2.2, p.text, 0.55),
    // Photo backdrop.
    d.shape(f, rrectPath(PHOTO.x, PHOTO.y, PHOTO.w, PHOTO.h, 2.5), p.window, { stroke: false }),
    // Reactions and caption.
    d.shape(
      f,
      [
        ['M', 8.4, 81.4],
        ['C', 6.2, 79.6, 5.6, 78.6, 5.6, 77.6],
        ['C', 5.6, 76.6, 6.4, 75.9, 7.2, 75.9],
        ['C', 7.7, 75.9, 8.1, 76.2, 8.4, 76.7],
        ['C', 8.7, 76.2, 9.1, 75.9, 9.6, 75.9],
        ['C', 10.4, 75.9, 11.2, 76.6, 11.2, 77.6],
        ['C', 11.2, 78.6, 10.6, 79.6, 8.4, 81.4],
        ['Z'],
      ],
      p.brand.left,
      { stroke: false },
    ),
    d.shape(f, circlePath(17, 78.4, 2.6), 'none', { stroke: p.text, width: 1 }),
    d.ink(f, [['M', 23.5, 80.8], ['L', 27.5, 76], ['L', 29.5, 80.8]], p.text, 1),
    d.bar(f, 5.6, 85.6, 36, 2.4, p.text, 0.7),
    d.bar(f, 5.6, 90, 24, 2.4, p.text, 0.5),
  ];
  return svg(parts.join(''));
}

function photoLetter(p: ArtPalette) {
  const d = pen(p);
  const pl = faceLeft(on(phoneFace, SMALL.x, SMALL.y));
  return svg(letter(d, pl, SMALL.w, SMALL.h, { flat: true, radius: (7 * SMALL.w) / CARD.w }));
}

function flyingLetter(p: ArtPalette) {
  const d = pen(p);
  return svg(letter(d, cardBack, CARD.w, CARD.h, { thick: CARD.t, radius: 7 }));
}

const ROW_Y = [31, 54, 77];
const ROW_H = 19;

function card(p: ArtPalette) {
  const d = pen(p);
  const f = cardFace;
  const parts = [
    d.plate(cardBack, rrectPts(0, 0, CARD.w, CARD.h, 7, 6), CARD.t, p.neutral),
    d.bar(f, 8, 9, 42, 4.6, p.text),
    d.bar(f, 8, 16.8, 28, 3, p.text, 0.6),
    ...ROW_Y.map((y) => d.shape(f, rrectPath(5.5, y, CARD.w - 11, ROW_H, 4.5), p.neutral.right, { stroke: false, opacity: 0.5 })),
  ];
  return svg(parts.join(''));
}

function cardShadow(p: ArtPalette) {
  const d = pen(p);
  return svg(d.shadow('kept-cs', [CARD.x + CARD.w / 2 + 8, CARD.y + 4, 0], 66, 13, 1.4));
}

function row(i: number) {
  return (p: ArtPalette) => {
    const d = pen(p);
    const f = cardFace;
    const y = ROW_Y[i];
    const icon =
      i === 0 ? dateChip(d, f, 9.5, y + 2, 15, '12') : i === 1 ? pin(d, f, 17, y + 7.4, 5.2) : coin(d, f, 17, y + 9.5, 6.6);
    const bars = [d.bar(f, 31, y + 5, 36 - i * 6, 3.6, p.text), d.bar(f, 31, y + 11.4, 22 + i * 4, 2.6, p.text, 0.55)];
    return svg(icon + bars.join(''));
  };
}

function badge(p: ArtPalette) {
  const d = pen(p);
  return svg(shield(d, lift(cardFace, 4), CARD.w - 6, 4, 22, 26));
}

// The flying letter is drawn at card size; it starts scaled down over the photo in the phone.
const P0 = at(on(phoneFace, SMALL.x, SMALL.y));
const P1 = at(cardFace.o);
const FROM: V2 = [P0[0] - P1[0], P0[1] - P1[1]];
const S0 = SMALL.w / CARD.w;
const OUT = vec([0, 14, 10]);
const ux = vec([1, 0, 0]);

const kept: SceneDef = {
  duration: 2850,
  layers: [
    { id: 'phone', draw: phone },
    { id: 'photo-letter', draw: photoLetter, motion: { opacity: [[300, 1], [550, 0.3]] } },
    { id: 'card-shadow', draw: cardShadow, motion: { opacity: [[1100, 0], [1500, 1]] } },
    { id: 'card', draw: card, motion: { opacity: [[1340, 0], [1420, 1]] } },
    ...[0, 1, 2].map((i) => ({
      id: `row-${i}`,
      draw: row(i),
      motion: {
        opacity: [[1650 + i * 250, 0], [1830 + i * 250, 1]] as const,
        moves: [{ v: ux, k: [[1650 + i * 250, -8], [1900 + i * 250, 0, 'out']] as const }],
      },
    })),
    {
      id: 'letter',
      draw: flyingLetter,
      motion: {
        opacity: [[300, 0], [420, 1], [1380, 1], [1580, 0]],
        scale: { at: P1, k: [[520, S0], [1340, 1, 'inOut']] },
        moves: [
          { v: FROM, k: [[520, 1], [1340, 0, 'inOut']] },
          { v: OUT, k: [[300, 0], [680, 1, 'out'], [1340, 0, 'inOut']] },
        ],
      },
    },
    {
      id: 'badge',
      draw: badge,
      motion: {
        opacity: [[2450, 0], [2580, 1]],
        scale: { at: at(on(cardFace, CARD.w - 6, 4)), k: [[2450, 0.4], [2800, 1, 'out']] },
      },
    },
  ],
};

export default kept;
