import type { TextStyle } from 'react-native';

export const colors = {
  bg: '#F2F2F7',
  card: '#FFFFFF',
  fill: 'rgba(118,118,128,0.12)',
  fill2: 'rgba(118,118,128,0.08)',
  sep: 'rgba(60,60,67,0.29)',
  pressed: '#E5E5EA',
  track: '#E5E5EA',
  l1: '#000000',
  l2: 'rgba(60,60,67,0.6)',
  l3: 'rgba(60,60,67,0.3)',
  tint: '#0A52E9',
  tintPressed: '#0844C2',
  green: '#34C759',
  red: '#FF3B30',
  orange: '#FF9500',
  yellow: '#FFCC00',
  teal: '#30B0C7',
  indigo: '#5856D6',
  purple: '#AF52DE',
  pink: '#FF2D55',
  gray: '#8E8E93',
  mint: '#00C7BE',
  brown: '#A2845E',
  black: '#1C1C1E',
  white: '#FFFFFF',
  greenText: '#248A3D',
  orangeText: '#C93400',
  redText: '#D70015',
  highlight: 'rgba(255,204,0,0.55)',
  highlightDim: 'rgba(255,204,0,0.14)',
  dark: {
    bg: '#000000',
    card: '#1C1C1E',
    sep: '#2C2C2E',
    sepStrong: '#38383A',
    l2: 'rgba(235,235,245,0.6)',
    l3: 'rgba(235,235,245,0.45)',
    tint: '#6D9BFF',
    green: '#30D158',
    red: '#FF453A',
    neutral: '#636366',
    orange: '#FF9F0A',
  },
} as const;

/** Accent swatches used for tiles, initials and markers. */
export const swatch = {
  tint: colors.tint,
  green: colors.green,
  red: colors.red,
  orange: colors.orange,
  yellow: colors.yellow,
  teal: colors.teal,
  indigo: colors.indigo,
  purple: colors.purple,
  pink: colors.pink,
  gray: colors.gray,
  mint: colors.mint,
  brown: colors.brown,
  black: colors.black,
} as const;
export type Swatch = keyof typeof swatch;

export const tones = {
  red: { bg: 'rgba(255,59,48,0.14)', fg: colors.redText },
  orange: { bg: 'rgba(255,149,0,0.16)', fg: colors.orangeText },
  green: { bg: 'rgba(52,199,89,0.16)', fg: colors.greenText },
  blue: { bg: 'rgba(10,82,233,0.12)', fg: colors.tint },
  gray: { bg: colors.fill, fg: colors.l2 },
} as const;
export type Tone = keyof typeof tones;

/** Brand gradients from the design, used as two-stop fills. */
export const gradients = {
  banknote: ['#8A5A1F', '#D69E2E'],
  brand: ['#1E3A8A', '#0A52E9'],
  law: ['#3A38B8', '#7D7BE8'],
  institution: ['#2F6BFF', '#0A3FB8'],
  embassy: ['#7A78F0', '#5856D6'],
  calendar: ['#FF5E57', '#FF2D55'],
  roads: ['#FFB340', '#FF9500'],
  rates: ['#3ED37A', '#1FA855'],
  directory: ['#4A86FF', '#0A52E9'],
  truth: ['#48C9D8', '#30A0B7'],
  rain: ['#3F6BFF', '#1A0F2E'],
  note500: ['#1F7A5A', '#34C759'],
  note1000: ['#5856D6', '#AF52DE'],
  note2000: ['#0A52E9', '#30B0C7'],
} as const;
export type GradientName = keyof typeof gradients;

const em = (size: number, value: number) => size * value;

export const type = {
  lt: { fontSize: 34, lineHeight: 41, fontWeight: '700', letterSpacing: em(34, 0.01) },
  t1: { fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: em(28, 0.01) },
  t2: { fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: em(22, 0.01) },
  t3: { fontSize: 20, lineHeight: 25, fontWeight: '600', letterSpacing: em(20, 0.01) },
  hl: { fontSize: 17, lineHeight: 22, fontWeight: '600', letterSpacing: em(17, -0.01) },
  bd: { fontSize: 17, lineHeight: 22, fontWeight: '400', letterSpacing: em(17, -0.01) },
  co: { fontSize: 16, lineHeight: 21, fontWeight: '400', letterSpacing: em(16, -0.01) },
  sh: { fontSize: 15, lineHeight: 20, fontWeight: '400', letterSpacing: em(15, -0.01) },
  fn: { fontSize: 13, lineHeight: 18, fontWeight: '400', letterSpacing: 0 },
  c1: { fontSize: 12, lineHeight: 16, fontWeight: '400', letterSpacing: 0 },
  c2: { fontSize: 11, lineHeight: 13, fontWeight: '400', letterSpacing: em(11, 0.01) },
  cap: { fontSize: 13, lineHeight: 18, fontWeight: '600', letterSpacing: em(13, 0.02), textTransform: 'uppercase' },
} as const satisfies Record<string, TextStyle>;
export type TypeVariant = keyof typeof type;

export const radius = { tile: 7, tileL: 9, tileXL: 14, group: 12, card: 16, tileCard: 18, hero: 22, btn: 14, seg: 9, pill: 17 } as const;

export const space = { gutter: 16, gutterWide: 20, groupHeaderX: 32 } as const;

/** iOS sheet/sliding spring from the design (--spring: cubic-bezier(.32,.72,0,1)). */
export const spring = { damping: 26, stiffness: 260, mass: 1 } as const;
