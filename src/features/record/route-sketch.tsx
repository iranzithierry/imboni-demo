import { useState } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';

import type { LatLng } from '@/data/schema';
import { useColors } from '@/ui/theme';

type Props = {
  segment: readonly LatLng[];
  diversion?: readonly LatLng[];
  route?: readonly LatLng[];
  status: 'closed' | 'partial' | 'diversion' | 'upcoming';
  height?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * The advisory's own geometry drawn to scale: the affected stretch, the signed diversion and, when
 * it crosses a saved route, that route for context. No tiles, so it costs nothing to load.
 */
export function RouteSketch({ segment, diversion = [], route = [], status, height = 132, style }: Props) {
  const colors = useColors();
  const [width, setWidth] = useState(0);
  const points = [...segment, ...diversion, ...route];
  const lats = points.map((p) => p.latitude);
  const lngs = points.map((p) => p.longitude);
  const midLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  // Longitude degrees shrink with latitude; scale them so the sketch keeps true proportions.
  const kx = Math.cos((midLat * Math.PI) / 180);
  const minX = Math.min(...lngs) * kx;
  const maxX = Math.max(...lngs) * kx;
  const minY = Math.min(...lats);
  const maxY = Math.max(...lats);
  const pad = 22;
  const spanX = Math.max(maxX - minX, 0.002);
  const spanY = Math.max(maxY - minY, 0.002);
  const scale = width ? Math.min((width - pad * 2) / spanX, (height - pad * 2) / spanY) : 0;
  const ox = (width - spanX * scale) / 2;
  const oy = (height - spanY * scale) / 2;
  const xy = (p: LatLng) => `${ox + (p.longitude * kx - minX) * scale},${oy + (maxY - p.latitude) * scale}`;
  const line = (ps: readonly LatLng[]) => ps.map(xy).join(' ');
  const affected = status === 'closed' ? colors.bad : status === 'upcoming' ? colors.ink2 : colors.warn;
  const start = segment[0];
  const end = segment[segment.length - 1];

  return (
    <View style={[{ height, backgroundColor: colors.fill }, style]} onLayout={(e) => setWidth(e.nativeEvent.layout.width)} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {width > 0 && (
        <Svg width={width} height={height}>
          {route.length > 1 && <Polyline points={line(route)} stroke={colors.pearl} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" fill="none" />}
          {diversion.length > 1 && <Polyline points={line(diversion)} stroke={colors.ink} strokeWidth={2.5} strokeDasharray="6 5" strokeLinecap="round" strokeLinejoin="round" fill="none" />}
          {segment.length > 1 && <Polyline points={line(segment)} stroke={affected} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" fill="none" />}
          {start && <Circle cx={xy(start).split(',')[0]} cy={xy(start).split(',')[1]} r={5} fill={colors.card} stroke={affected} strokeWidth={2.5} />}
          {end && <Circle cx={xy(end).split(',')[0]} cy={xy(end).split(',')[1]} r={5} fill={colors.card} stroke={affected} strokeWidth={2.5} />}
        </Svg>
      )}
    </View>
  );
}
