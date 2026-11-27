import { type AndroidSymbol, type SFSymbol, SymbolView } from 'expo-symbols';
import type { ColorValue, StyleProp, ViewStyle } from 'react-native';

import { useColors } from './theme';

type Glyph = { ios: SFSymbol; iosFill?: SFSymbol; android: AndroidSymbol };

/** Outline glyphs throughout; filled variants only mark the selected tab. */
const ICONS = {
  home: { ios: 'house', iosFill: 'house.fill', android: 'home' },
  compass: { ios: 'safari', iosFill: 'safari.fill', android: 'explore' },
  checklist: { ios: 'checklist', iosFill: 'checklist.checked', android: 'checklist' },
  bell: { ios: 'bell', iosFill: 'bell.fill', android: 'notifications' },
  person: { ios: 'person.crop.circle', iosFill: 'person.crop.circle.fill', android: 'account_circle' },
  globe: { ios: 'globe', android: 'language' },
  calendar: { ios: 'calendar', android: 'calendar_month' },
  calendarAdd: { ios: 'calendar.badge.plus', android: 'calendar_add_on' },
  car: { ios: 'car', android: 'directions_car' },
  bus: { ios: 'bus', android: 'directions_bus' },
  bank: { ios: 'building.columns', android: 'account_balance' },
  building: { ios: 'building.2', android: 'apartment' },
  refresh: { ios: 'arrow.triangle.2.circlepath', android: 'sync' },
  undo: { ios: 'arrow.uturn.backward', android: 'undo' },
  check: { ios: 'checkmark', android: 'check' },
  checkCircle: { ios: 'checkmark.circle', iosFill: 'checkmark.circle.fill', android: 'check_circle' },
  circle: { ios: 'circle', android: 'radio_button_unchecked' },
  chevronLeft: { ios: 'chevron.left', android: 'chevron_left' },
  chevronRight: { ios: 'chevron.right', android: 'chevron_right' },
  chevronDown: { ios: 'chevron.down', android: 'expand_more' },
  share: { ios: 'square.and.arrow.up', android: 'ios_share' },
  more: { ios: 'ellipsis', android: 'more_horiz' },
  exclamation: { ios: 'exclamationmark.circle', android: 'error' },
  shield: { ios: 'checkmark.shield', android: 'verified_user' },
  banknote: { ios: 'banknote', android: 'payments' },
  people: { ios: 'person.2', android: 'group' },
  family: { ios: 'figure.2.and.child.holdinghands', android: 'family_restroom' },
  idCard: { ios: 'person.text.rectangle', android: 'badge' },
  doc: { ios: 'doc.text', android: 'description' },
  law: { ios: 'text.book.closed', android: 'menu_book' },
  list: { ios: 'list.bullet', android: 'format_list_bulleted' },
  flag: { ios: 'flag', android: 'flag' },
  plus: { ios: 'plus', android: 'add' },
  minus: { ios: 'minus', android: 'remove' },
  xmark: { ios: 'xmark', android: 'close' },
  eye: { ios: 'eye', android: 'visibility' },
  phone: { ios: 'phone', android: 'call' },
  lock: { ios: 'lock', android: 'lock' },
  search: { ios: 'magnifyingglass', android: 'search' },
  rain: { ios: 'cloud.heavyrain', android: 'rainy' },
  chart: { ios: 'chart.line.uptrend.xyaxis', android: 'show_chart' },
  exchange: { ios: 'arrow.left.arrow.right', android: 'currency_exchange' },
  wifiOff: { ios: 'wifi.slash', android: 'wifi_off' },
  download: { ios: 'arrow.down.to.line', android: 'download' },
  clock: { ios: 'clock', android: 'schedule' },
  leaf: { ios: 'leaf', android: 'eco' },
  photo: { ios: 'photo', android: 'image' },
  snooze: { ios: 'moon.zzz', android: 'snooze' },
  fuel: { ios: 'fuelpump', android: 'local_gas_station' },
  megaphone: { ios: 'megaphone', android: 'campaign' },
  arrowRight: { ios: 'arrow.right', android: 'arrow_forward' },
  arrowUp: { ios: 'arrow.up', android: 'arrow_upward' },
  arrowDown: { ios: 'arrow.down', android: 'arrow_downward' },
  external: { ios: 'arrow.up.right', android: 'north_east' },
  turnRight: { ios: 'arrow.turn.up.right', android: 'turn_right' },
  turnLeft: { ios: 'arrow.turn.up.left', android: 'turn_left' },
  map: { ios: 'map', android: 'map' },
  route: { ios: 'point.topleft.down.to.point.bottomright.curvepath', android: 'route' },
  works: { ios: 'hammer', android: 'construction' },
  bubble: { ios: 'text.bubble', android: 'chat' },
  graduation: { ios: 'graduationcap', android: 'school' },
  health: { ios: 'cross.case', android: 'medical_services' },
  plane: { ios: 'airplane', android: 'flight' },
  briefcase: { ios: 'briefcase', android: 'work' },
  store: { ios: 'storefront', android: 'storefront' },
  newspaper: { ios: 'newspaper', android: 'newspaper' },
  pin: { ios: 'mappin.and.ellipse', android: 'location_on' },
  moon: { ios: 'moon', android: 'bedtime' },
  sun: { ios: 'sun.max', android: 'light_mode' },
  warning: { ios: 'exclamationmark.triangle', android: 'warning' },
  sparkles: { ios: 'sparkles', android: 'auto_awesome' },
  info: { ios: 'info.circle', android: 'info' },
  mail: { ios: 'envelope', android: 'mail' },
  location: { ios: 'location', android: 'near_me' },
  layers: { ios: 'square.3.layers.3d', android: 'layers' },
  bookmark: { ios: 'bookmark', iosFill: 'bookmark.fill', android: 'bookmark' },
  link: { ios: 'link', android: 'link' },
  paste: { ios: 'doc.on.clipboard', android: 'content_paste' },
  trash: { ios: 'trash', android: 'delete' },
  speakerSlash: { ios: 'speaker.slash', android: 'volume_off' },
  translate: { ios: 'character.bubble', android: 'translate' },
  quote: { ios: 'text.quote', android: 'format_quote' },
  history: { ios: 'clock.arrow.circlepath', android: 'history' },
  sliders: { ios: 'slider.horizontal.3', android: 'tune' },
  signature: { ios: 'signature', android: 'draw' },
  copy: { ios: 'doc.on.doc', android: 'content_copy' },
  hand: { ios: 'hand.raised', android: 'front_hand' },
} as const satisfies Record<string, Glyph>;

export type IconName = keyof typeof ICONS;

type Props = {
  name: IconName;
  size?: number;
  color?: ColorValue;
  /** Use the filled variant where one exists (iOS). */
  filled?: boolean;
  weight?: 'regular' | 'medium' | 'semibold';
  style?: StyleProp<ViewStyle>;
};

export function Icon({ name, size = 20, color, filled, weight = 'medium', style }: Props) {
  const colors = useColors();
  const glyph: Glyph = ICONS[name];
  const ios = filled && glyph.iosFill ? glyph.iosFill : glyph.ios;
  return <SymbolView name={{ ios, android: glyph.android, web: glyph.android }} size={size} tintColor={color ?? colors.ink} weight={weight} style={style} />;
}

/** SF Symbol name for native-only surfaces such as menus and header buttons. */
export const sfSymbol = (name: IconName, filled?: boolean): SFSymbol => {
  const glyph: Glyph = ICONS[name];
  return filled && glyph.iosFill ? glyph.iosFill : glyph.ios;
};
