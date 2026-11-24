import { type AndroidSymbol, type SFSymbol, SymbolView } from 'expo-symbols';
import type { ColorValue, StyleProp, ViewStyle } from 'react-native';

import { colors } from './theme';

const ICONS = {
  globe: { ios: 'globe', android: 'language' },
  calendar: { ios: 'calendar', android: 'calendar_month' },
  car: { ios: 'car.fill', android: 'directions_car' },
  bank: { ios: 'building.columns.fill', android: 'account_balance' },
  refresh: { ios: 'arrow.triangle.2.circlepath', android: 'sync' },
  check: { ios: 'checkmark', android: 'check' },
  chevronLeft: { ios: 'chevron.left', android: 'chevron_left' },
  chevronRight: { ios: 'chevron.right', android: 'chevron_right' },
  chevronDown: { ios: 'chevron.down', android: 'expand_more' },
  chevronUpDown: { ios: 'chevron.up.chevron.down', android: 'unfold_more' },
  share: { ios: 'square.and.arrow.up', android: 'ios_share' },
  more: { ios: 'ellipsis', android: 'more_horiz' },
  exclamation: { ios: 'exclamationmark', android: 'priority_high' },
  shield: { ios: 'checkmark.shield.fill', android: 'verified_user' },
  banknote: { ios: 'banknote.fill', android: 'payments' },
  people: { ios: 'person.2.fill', android: 'group' },
  idCard: { ios: 'person.text.rectangle.fill', android: 'badge' },
  doc: { ios: 'doc.text.fill', android: 'description' },
  list: { ios: 'list.bullet', android: 'list' },
  flag: { ios: 'flag.fill', android: 'flag' },
  bell: { ios: 'bell.fill', android: 'notifications' },
  plus: { ios: 'plus', android: 'add' },
  minus: { ios: 'minus', android: 'remove' },
  xmark: { ios: 'xmark', android: 'close' },
  xmarkCircle: { ios: 'xmark.circle.fill', android: 'cancel' },
  eye: { ios: 'eye.fill', android: 'visibility' },
  phone: { ios: 'phone.fill', android: 'call' },
  lock: { ios: 'lock.fill', android: 'lock' },
  search: { ios: 'magnifyingglass', android: 'search' },
  rain: { ios: 'cloud.heavyrain.fill', android: 'rainy' },
  chart: { ios: 'chart.line.uptrend.xyaxis', android: 'show_chart' },
  home: { ios: 'house.fill', android: 'home' },
  compass: { ios: 'safari.fill', android: 'explore' },
  checkCircle: { ios: 'checkmark.circle.fill', android: 'check_circle' },
  person: { ios: 'person.crop.circle.fill', android: 'account_circle' },
  wifiOff: { ios: 'wifi.slash', android: 'wifi_off' },
  download: { ios: 'arrow.down.circle', android: 'download' },
  clock: { ios: 'clock.fill', android: 'schedule' },
  leaf: { ios: 'leaf.fill', android: 'eco' },
  photo: { ios: 'photo', android: 'image' },
  snooze: { ios: 'moon.zzz.fill', android: 'snooze' },
  fuel: { ios: 'fuelpump.fill', android: 'local_gas_station' },
  megaphone: { ios: 'megaphone.fill', android: 'campaign' },
  arrowRight: { ios: 'arrow.right', android: 'arrow_forward' },
  arrowUp: { ios: 'arrow.up', android: 'arrow_upward' },
  turnRight: { ios: 'arrow.turn.up.right', android: 'turn_right' },
  turnLeft: { ios: 'arrow.turn.up.left', android: 'turn_left' },
  map: { ios: 'map.fill', android: 'map' },
  bubble: { ios: 'bubble.left.and.bubble.right.fill', android: 'forum' },
  graduation: { ios: 'graduationcap.fill', android: 'school' },
  heart: { ios: 'heart.fill', android: 'favorite' },
  plane: { ios: 'airplane', android: 'flight' },
  briefcase: { ios: 'briefcase.fill', android: 'work' },
  newspaper: { ios: 'newspaper.fill', android: 'newspaper' },
  pin: { ios: 'mappin.and.ellipse', android: 'location_on' },
  moon: { ios: 'moon.fill', android: 'bedtime' },
  warning: { ios: 'exclamationmark.triangle.fill', android: 'warning' },
  sparkles: { ios: 'sparkles', android: 'auto_awesome' },
  info: { ios: 'info.circle', android: 'info' },
  swap: { ios: 'arrow.left.arrow.right', android: 'swap_horiz' },
  mail: { ios: 'envelope.fill', android: 'mail' },
  location: { ios: 'location.fill', android: 'near_me' },
  layers: { ios: 'square.3.layers.3d', android: 'layers' },
  bookmark: { ios: 'bookmark.fill', android: 'bookmark' },
  link: { ios: 'link', android: 'link' },
  paste: { ios: 'doc.on.clipboard', android: 'content_paste' },
  trash: { ios: 'trash', android: 'delete' },
  speakerSlash: { ios: 'speaker.slash.fill', android: 'volume_off' },
} as const satisfies Record<string, { ios: SFSymbol; android: AndroidSymbol }>;

export type IconName = keyof typeof ICONS;

export const ICON_SIZE = { xs: 13, s: 17, m: 22, l: 28, xl: 40 } as const;

type Props = {
  name: IconName;
  size?: number;
  color?: ColorValue;
  style?: StyleProp<ViewStyle>;
};

export function Icon({ name, size = ICON_SIZE.m, color = colors.l1, style }: Props) {
  const symbol = ICONS[name];
  return (
    <SymbolView
      name={{ ios: symbol.ios, android: symbol.android, web: symbol.android }}
      size={size}
      tintColor={color}
      style={style}
    />
  );
}

/** SF Symbol name for native-only surfaces (menus, tab bar). */
export const sfSymbol = (name: IconName): SFSymbol => ICONS[name].ios;
export const materialSymbol = (name: IconName): AndroidSymbol => ICONS[name].android;
