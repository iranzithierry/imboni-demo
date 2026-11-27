import { Fragment, useImperativeHandle, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';

import type { Advisory, LatLng } from '@/data/schema';
import { Icon } from '@/ui/icon';
import { createStyles, type Palette, radius, useColors } from '@/ui/theme';

import { advisoryStatusLabel } from '../labels';
import type { AdvisoryMapHandle, AdvisoryMapProps } from './advisory-map';

export const advisoryColor = (colors: Palette, s: Advisory['status']) => ({ closed: colors.bad, partial: colors.warn, diversion: colors.warn, upcoming: colors.ink2 })[s];
export type { AdvisoryMapHandle };

/** Native maps are iOS and Android only; the web draws the same geometry to scale on a plain ground. */
export function AdvisoryMap({ roads, visible, selectedId, onSelect, bottomInset = 0, ref }: AdvisoryMapProps) {
  const colors = useColors();
  const styles = useStyles();
  const [size, setSize] = useState({ width: 0, height: 0 });
  useImperativeHandle(ref, () => ({ focus: () => undefined, fitRoute: () => undefined, locate: () => undefined }));
  const points: LatLng[] = [...roads.route.path, ...visible.flatMap((a) => [...a.segment, ...a.diversion, a.marker])];
  const lats = points.map((p) => p.latitude);
  const lngs = points.map((p) => p.longitude);
  const kx = Math.cos((((Math.min(...lats) + Math.max(...lats)) / 2) * Math.PI) / 180);
  const minX = Math.min(...lngs) * kx;
  const maxY = Math.max(...lats);
  const spanX = Math.max(Math.max(...lngs) * kx - minX, 0.004);
  const spanY = Math.max(maxY - Math.min(...lats), 0.004);
  const h = Math.max(0, size.height - bottomInset);
  const pad = 48;
  const scale = size.width ? Math.min((size.width - pad * 2) / spanX, (h - pad * 2 - 60) / spanY) : 0;
  const ox = (size.width - spanX * scale) / 2;
  const oy = 60 + (h - 60 - spanY * scale) / 2;
  const x = (p: LatLng) => ox + (p.longitude * kx - minX) * scale;
  const y = (p: LatLng) => oy + (maxY - p.latitude) * scale;
  const line = (ps: readonly LatLng[]) => ps.map((p) => `${x(p)},${y(p)}`).join(' ');

  return (
    <View style={[StyleSheet.absoluteFill, styles.ground]} onLayout={(e) => setSize(e.nativeEvent.layout)} accessibilityLabel={`Map of ${roads.route.label} with ${visible.length} road advisories`}>
      {scale > 0 && (
        <>
          <Svg width={size.width} height={size.height} style={StyleSheet.absoluteFill}>
            <Polyline points={line(roads.route.path)} stroke={colors.ink} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            {visible.map((a) => (
              <Fragment key={a.id}>
                {a.diversion.length > 1 && <Polyline points={line(a.diversion)} stroke={colors.ink} strokeWidth={3} strokeDasharray="6 6" strokeLinecap="round" fill="none" />}
                <Polyline points={line(a.segment)} stroke={advisoryColor(colors, a.status)} strokeWidth={a.id === selectedId ? 10 : 8} strokeLinecap="round" fill="none" />
              </Fragment>
            ))}
          </Svg>
          {visible.map((a) => (
            <Pressable
              key={a.id}
              accessibilityRole="button"
              accessibilityLabel={`${advisoryStatusLabel(a.status).label}: ${a.headline}`}
              onPress={() => onSelect?.(a)}
              style={[styles.marker, { left: x(a.marker) - 16, top: y(a.marker) - 16, borderColor: advisoryColor(colors, a.status), transform: [{ scale: a.id === selectedId ? 1.15 : 1 }] }]}>
              <Icon name={advisoryStatusLabel(a.status).icon} size={14} color={advisoryColor(colors, a.status)} weight="semibold" />
            </Pressable>
          ))}
        </>
      )}
    </View>
  );
}

const useStyles = createStyles((colors) => StyleSheet.create({
  ground: { backgroundColor: colors.fill },
  marker: { position: 'absolute', width: 32, height: 32, borderRadius: radius.sm, borderWidth: 2.5, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
}));
