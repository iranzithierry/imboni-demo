import { useMemo } from 'react';
import { useColorScheme, type TextStyle } from 'react-native';

import { usePrefs } from '@/state/prefs';

/**
 * Two palettes with the same keys. The brand orange is the accent for actions and selected state;
 * the hue pairs give each feature its own colour (a strong tone and a soft wash behind it).
 */
const light = {
  // Brand kit: ink #2A120A and cream #FFF7F2; the greys between them are warmed to match.
  canvas: '#FFF7F2',
  card: '#FFFFFF',
  ink: '#2A120A',
  ink2: '#77665E',
  ink3: '#9D8D85',
  pearl: '#D9CBC3',
  line: '#EFE3DB',
  fill: '#F7ECE5',
  pressed: '#F2E5DD',
  night: '#2A120A',
  nightRaised: '#3D2218',
  nightLine: '#4E3024',
  nightInk2: '#C9B8AF',
  accent: '#FA4616',
  accentEdge: '#C2360F',
  accentWash: '#FFEEE7',
  accentInk: '#C93A10',
  onAccent: '#FFFFFF',
  ok: '#15803D',
  okWash: '#E6F6EC',
  warn: '#B45309',
  warnWash: '#FEF3E0',
  bad: '#D92D20',
  badWash: '#FDECEA',
  indigo: '#5150D6',
  indigoWash: '#EDEDFD',
  green: '#16A34A',
  greenWash: '#E7F7EE',
  amber: '#D97706',
  amberWash: '#FEF3DF',
  sky: '#0284C7',
  skyWash: '#E2F2FB',
  violet: '#7C4DE8',
  violetWash: '#F1EBFE',
  pink: '#D9306F',
  pinkWash: '#FCE8F0',
  teal: '#0E8F86',
  tealWash: '#E0F4F2',
  white: '#FFFFFF',
  scrim: 'rgba(0,0,0,0.42)',
};

export type Palette = typeof light;

const dark: Palette = {
  canvas: '#111111',
  card: '#1C1C1E',
  ink: '#F5F5F7',
  ink2: '#AEAEB2',
  ink3: '#8E8E93',
  pearl: '#48484A',
  line: '#2C2C2E',
  fill: '#2C2C2E',
  pressed: '#2A2A2D',
  night: '#2C2C2E',
  nightRaised: '#3A3A3C',
  nightLine: '#48484A',
  nightInk2: '#AEAEB2',
  accent: '#FF5A24',
  accentEdge: '#B8330D',
  accentWash: '#3A1C12',
  accentInk: '#FF8D63',
  onAccent: '#FFFFFF',
  ok: '#34D27B',
  okWash: '#10301E',
  warn: '#FFB547',
  warnWash: '#36260C',
  bad: '#FF6259',
  badWash: '#3C1614',
  indigo: '#9898FF',
  indigoWash: '#20203F',
  green: '#3DDC84',
  greenWash: '#10301E',
  amber: '#FBBF24',
  amberWash: '#36280A',
  sky: '#4CC2FF',
  skyWash: '#0C2838',
  violet: '#B79CFF',
  violetWash: '#281E44',
  pink: '#FF6FA8',
  pinkWash: '#3D1428',
  teal: '#3ED7C6',
  tealWash: '#0C2E2A',
  white: '#FFFFFF',
  scrim: 'rgba(0,0,0,0.6)',
};

export const palettes = { light, dark } as const;
export type Scheme = keyof typeof palettes;

/** The scheme the app is showing: the one chosen in Profile, or the system's. Works on the web too. */
export function useScheme(): Scheme {
  const pref = usePrefs((s) => s.theme);
  const system = useColorScheme();
  if (pref === 'light' || pref === 'dark') return pref;
  return system === 'dark' ? 'dark' : 'light';
}

export function useColors(): Palette {
  return palettes[useScheme()];
}

/** Styles that depend on the palette, built once per palette and shared by every instance. */
export function createStyles<T>(factory: (colors: Palette) => T): () => T {
  const cache = new Map<Palette, T>();
  return function useStyles() {
    const colors = useColors();
    return useMemo(() => {
      let built = cache.get(colors);
      if (!built) {
        built = factory(colors);
        cache.set(colors, built);
      }
      return built;
    }, [colors]);
  };
}

export type Status = 'neutral' | 'ok' | 'warn' | 'bad';

export function statusColors(colors: Palette, s: Status): { fg: string; bg: string } {
  switch (s) {
    case 'ok':
      return { fg: colors.ok, bg: colors.okWash };
    case 'warn':
      return { fg: colors.warn, bg: colors.warnWash };
    case 'bad':
      return { fg: colors.bad, bg: colors.badWash };
    default:
      return { fg: colors.ink2, bg: colors.fill };
  }
}

/**
 * Interface colours are deliberately few: accent, background, muted, text and muted text, plus red for
 * destructive or urgent things. Hue names are kept as call-site vocabulary, but outside `brand` and `red`
 * they all resolve to the muted pair. Real colour is reserved for charts and illustrations.
 */
export type Hue = 'brand' | 'indigo' | 'green' | 'amber' | 'sky' | 'violet' | 'pink' | 'teal' | 'red';

export function hueColors(colors: Palette, h: Hue): { fg: string; bg: string } {
  switch (h) {
    case 'brand':
      return { fg: colors.accent, bg: colors.accentWash };
    case 'red':
      return { fg: colors.bad, bg: colors.badWash };
    default:
      return { fg: colors.ink, bg: colors.fill };
  }
}

/** Real hues, for charts and for the tiles that hold illustrations and feature icons. */
export function featureColors(colors: Palette, h: Hue): { fg: string; bg: string } {
  if (h === 'brand' || h === 'red') return hueColors(colors, h);
  return { fg: colors[h], bg: colors[`${h}Wash`] };
}

/** A fill deep enough to carry white text in either scheme. */
export function solidHue(h: Hue): string {
  if (h === 'red') return palettes.light.bad;
  if (h === 'brand') return palettes.light.accent;
  return palettes.light[h];
}

/** The only radii in the system. Avatars are circles by shape, not by token. */
export const radius = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, section: 36 } as const;
export const GUTTER = 20;

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
} as const;

/** Inter throughout; semibold is the heaviest weight, for headings and emphasis. */
export type Weight = 'regular' | 'medium' | 'semibold' | 'bold';
export const weightFamily: Record<Weight, string> = {
  regular: fonts.regular,
  medium: fonts.medium,
  semibold: fonts.semibold,
  bold: fonts.semibold,
};

const track = (size: number, em: number) => size * em;

export const type = {
  display: { fontFamily: fonts.semibold, fontSize: 46, lineHeight: 50, letterSpacing: track(46, -0.03) },
  title1: { fontFamily: fonts.semibold, fontSize: 30, lineHeight: 36, letterSpacing: track(30, -0.022) },
  title2: { fontFamily: fonts.semibold, fontSize: 24, lineHeight: 30, letterSpacing: track(24, -0.02) },
  title3: { fontFamily: fonts.semibold, fontSize: 19, lineHeight: 25, letterSpacing: track(19, -0.016) },
  headline: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22, letterSpacing: track(16, -0.011) },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24, letterSpacing: track(16, -0.011) },
  callout: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, letterSpacing: track(15, -0.009) },
  subhead: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, letterSpacing: track(14, -0.006) },
  footnote: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, letterSpacing: track(13, -0.003) },
  caption: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16, letterSpacing: 0 },
} as const satisfies Record<string, TextStyle>;
export type TypeVariant = keyof typeof type;

/** Display sizes stop growing earlier so headlines keep their shape at large text sizes. */
export const maxScale: Record<TypeVariant, number> = {
  display: 1.2,
  title1: 1.3,
  title2: 1.4,
  title3: 1.5,
  headline: 1.8,
  body: 1.8,
  callout: 1.8,
  subhead: 1.8,
  footnote: 1.8,
  caption: 1.6,
};

/** Motion is for state changes: short and eased. */
export const motion = { fast: 120, base: 200, slow: 280 } as const;
