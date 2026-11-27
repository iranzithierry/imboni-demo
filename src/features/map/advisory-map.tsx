import { Fragment, useImperativeHandle, useRef, type Ref } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline, type LatLng, type MapType } from 'react-native-maps';

import type { Advisory, Roads } from '@/data/schema';
import { Icon } from '@/ui/icon';
import { createStyles, type Palette, radius, useColors } from '@/ui/theme';

import { advisoryStatusLabel } from '../labels';

export const advisoryColor = (colors: Palette, s: Advisory['status']) => ({ closed: colors.bad, partial: colors.warn, diversion: colors.warn, upcoming: colors.ink2 })[s];

export type AdvisoryMapHandle = { focus: (a: Advisory) => void; fitRoute: () => void; locate: () => void };

export type AdvisoryMapProps = {
  roads: Roads;
  /** Only these advisories are drawn; the saved route is always drawn. */
  visible: readonly Advisory[];
  selectedId: string | null;
  onSelect?: (a: Advisory) => void;
  mapType?: MapType;
  interactive?: boolean;
  /** Space covered by the sheet, so fits keep content visible above it. */
  bottomInset?: number;
  ref?: Ref<AdvisoryMapHandle>;
};

export function AdvisoryMap({ roads, visible, selectedId, onSelect, mapType = 'standard', interactive = true, bottomInset = 0, ref }: AdvisoryMapProps) {
  const colors = useColors();
  const styles = useStyles();
  const map = useRef<MapView>(null);
  const user = useRef<LatLng | null>(null);
  const padding = { top: 120, right: 60, bottom: bottomInset + 40, left: 60 };
  const fit = (coords: LatLng[]) => map.current?.fitToCoordinates(coords, { edgePadding: padding, animated: true });

  useImperativeHandle(ref, () => ({
    focus: (a) => fit([...a.segment, ...a.diversion, a.marker]),
    fitRoute: () => fit(roads.route.path),
    locate: () => {
      if (user.current) map.current?.animateToRegion({ ...user.current, latitudeDelta: 0.02, longitudeDelta: 0.02 }, 400);
      else fit(roads.route.path);
    },
  }));

  return (
    <MapView
      ref={map}
      style={StyleSheet.absoluteFill}
      // The muted style keeps the base map quiet so the advisories carry the colour.
      mapType={mapType === 'standard' && Platform.OS === 'ios' ? 'mutedStandard' : mapType}
      scrollEnabled={interactive}
      zoomEnabled={interactive}
      rotateEnabled={false}
      pitchEnabled={false}
      showsUserLocation={interactive}
      showsPointsOfInterests={false}
      onUserLocationChange={(e) => {
        const c = e.nativeEvent.coordinate;
        if (c) user.current = { latitude: c.latitude, longitude: c.longitude };
      }}
      onMapReady={() => fit(visible.length === 1 && visible[0] ? [...visible[0].segment, ...visible[0].diversion] : roads.route.path)}
      accessibilityLabel={`Map of ${roads.route.label} with ${visible.length} road advisories`}>
      <Polyline coordinates={roads.route.path} strokeColor={colors.ink} strokeWidth={5} />
      {visible.map((a) => {
        const color = advisoryColor(colors, a.status);
        const selected = a.id === selectedId;
        return (
          <Fragment key={a.id}>
            {a.diversion.length > 0 && <Polyline coordinates={a.diversion} strokeColor={colors.ink} strokeWidth={4} lineDashPattern={[6, 8]} />}
            <Polyline coordinates={a.segment} strokeColor={color} strokeWidth={selected ? 10 : 8} zIndex={2} />
            <Marker coordinate={a.marker} onPress={() => onSelect?.(a)} tracksViewChanges={false} anchor={{ x: 0.5, y: 0.5 }} accessibilityLabel={`${advisoryStatusLabel(a.status).label}: ${a.headline}`}>
              <View style={[styles.marker, { borderColor: color, transform: [{ scale: selected ? 1.15 : 1 }] }]}>
                <Icon name={advisoryStatusLabel(a.status).icon} size={14} color={color} weight="semibold" />
              </View>
            </Marker>
          </Fragment>
        );
      })}
    </MapView>
  );
}

const useStyles = createStyles((colors) => StyleSheet.create({
  marker: { width: 32, height: 32, borderRadius: radius.sm, borderWidth: 2.5, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
}));
