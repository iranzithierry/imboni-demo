/** Bundled asset id from `require`: a 256 px square with the logo inside its middle 216 px. */
export type Logo = { source: number };

/**
 * Institution logos (assets/images/logos/CREDITS.md). They identify the source of each notice and
 * nothing more. Institutions without one, or whose mark is unreadable at chip size (RDB's bars without
 * the letters), show their initials. Every logo sits on white in both themes.
 */
export const logos: Record<string, Logo> = {
  'bnr': { source: require('../../assets/images/logos/bnr.png') },
  'rra': { source: require('../../assets/images/logos/rra.png') },
  'nida': { source: require('../../assets/images/logos/nida.png') },
  'mfa': { source: require('../../assets/images/logos/mfa.png') },
  'cok': { source: require('../../assets/images/logos/cok.png') },
  'rura': { source: require('../../assets/images/logos/rura.png') },
  'rnp': { source: require('../../assets/images/logos/rnp.png') },
  'rtda': { source: require('../../assets/images/logos/rtda.png') },
  'meteo': { source: require('../../assets/images/logos/meteo.png') },
  'nesa': { source: require('../../assets/images/logos/nesa.png') },
  'mineduc': { source: require('../../assets/images/logos/mineduc.png') },
  'hec': { source: require('../../assets/images/logos/hec.png') },
  'rbc': { source: require('../../assets/images/logos/rbc.png') },
  'rssb': { source: require('../../assets/images/logos/rssb.png') },
  'minicom': { source: require('../../assets/images/logos/minicom.png') },
  'rsb': { source: require('../../assets/images/logos/rsb.png') },
  'reg': { source: require('../../assets/images/logos/reg.png') },
  'wasac': { source: require('../../assets/images/logos/wasac.png') },
  'musanze': { source: require('../../assets/images/logos/musanze.png') },
};
