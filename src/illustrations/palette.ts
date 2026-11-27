import { useScheme } from '@/ui/theme';

/**
 * One palette for every illustration and icon, so all scenes read as one set.
 *
 * Isometric shading rule (light from the top-left):
 * - top faces use `top`, faces turned to the viewer's left use `left`, faces turned right use `right`.
 * - every shape is outlined with `line` at the shared stroke width (see ART.stroke).
 */
type Hue = { top: string; left: string; right: string };

const hues = {
  brand: { top: '#FF8A5C', left: '#FA4616', right: '#C2360F' },
  amber: { top: '#FFD27A', left: '#F5A524', right: '#C77E0A' },
  green: { top: '#7BE0A6', left: '#22B567', right: '#178A4D' },
  sky: { top: '#9EDCFB', left: '#38B2EE', right: '#1C86BF' },
  indigo: { top: '#AEB4FF', left: '#6670F0', right: '#4A52C4' },
  violet: { top: '#CDB8FF', left: '#9B72F5', right: '#7550CC' },
  pink: { top: '#FFB3CC', left: '#EC5C8D', right: '#C23E6C' },
  teal: { top: '#8DE3DA', left: '#1FB5A6', right: '#158A7F' },
  red: { top: '#FF9B92', left: '#EF4434', right: '#C02A1C' },
} satisfies Record<string, Hue>;

const light = {
  ...hues,
  neutral: { top: '#FFFFFF', left: '#ECEDF1', right: '#D5D8DF' } satisfies Hue,
  dark: { top: '#5A5D66', left: '#3A3C43', right: '#26272C' } satisfies Hue,
  line: '#24252B',
  ground: '#EEF0F4',
  groundLine: '#DADDE4',
  shadow: 'rgba(36,37,43,0.10)',
  paper: '#FFFFFF',
  text: '#9AA0AC',
  window: '#BFE6FF',
  skin: '#C98A63',
  hair: '#2B2420',
};

const dark: typeof light = {
  ...hues,
  neutral: { top: '#4A4D56', left: '#33353C', right: '#24262B' },
  dark: { top: '#2A2C31', left: '#1D1F23', right: '#141518' },
  line: '#0A0A0C',
  ground: '#1B1C20',
  groundLine: '#2A2C32',
  shadow: 'rgba(0,0,0,0.35)',
  paper: '#E9EAEE',
  text: '#6B707B',
  window: '#2E5A78',
  skin: '#B9825E',
  hair: '#1A1513',
};

export type ArtPalette = typeof light;
export type ArtHue = keyof typeof hues;

/** Shared drawing constants: one projection, one line weight, one light direction. */
export const ART = {
  /** Outline width in viewBox units at the scene's native size. */
  stroke: 1.25,
  /** Isometric unit vectors: +x goes down-right, +y goes down-left, +z goes up. */
  iso: { x: [0.8660254, 0.5], y: [-0.8660254, 0.5], z: [0, -1] } as const,
} as const;

/** Palette for the current colour scheme. The app theme maps onto this in one place. */
export function useArtPalette(): ArtPalette {
  return useScheme() === 'dark' ? dark : light;
}

/** Project an isometric point (x, y, z in grid units) to 2D, scaled by `unit` and shifted to `origin`. */
export function iso(x: number, y: number, z: number, unit: number, origin: readonly [number, number]): [number, number] {
  return [origin[0] + (x - y) * 0.8660254 * unit, origin[1] + ((x + y) * 0.5 - z) * unit];
}

export const palettes = { light, dark };
