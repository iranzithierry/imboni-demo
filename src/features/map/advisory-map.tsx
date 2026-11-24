import { Fragment, useImperativeHandle, useRef, type Ref } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline, type LatLng, type MapType } from 'react-native-maps';

import type { Advisory, Roads } from '@/data/schema';
import { Icon, type IconName } from '@/ui/icon';
import { colors } from '@/ui/theme';

export const ADVISORY_STYLE: Record<Advisory['status'], { color: string; icon: IconName }> = {
  closed: { color: colors.red, icon: 'xmark' },
  partial: { color: colors.orange, icon: 'minus' },
  upcoming: { color: colors.gray, icon: 'clock' },
};

export type AdvisoryMapHandle = { focus: (a: Advisory) => void; fitRoute: () => void; locate: () => void };

type Props = {
  roads: Roads;
  /** Only these advisories are drawn; the route is always drawn. */
  visible: readonly Advisory[];
  selectedId: string | null;
  onSelect?: (a: Advisory) => void;
  mapType?: MapType;
  interactive?: boolean;
  /** Space the sheet covers, so fits keep content visible above it. */
  bottomInset?: number;
  ref?: Ref<AdvisoryMapHandle>;
};

export function AdvisoryMap({ roads, visible, selectedId, onSelect, mapType = 'standard', interactive = true, bottomInset = 0, ref }: Props) {
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
      mapType={mapType}
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
      <Polyline coordinates={roads.route.path} strokeColor={colors.tint} strokeWidth={6} />
      {visible.map((a) => {
        const s = ADVISORY_STYLE[a.status];
        const selected = a.id === selectedId;
        return (
          <Fragment key={a.id}>
            {a.diversion.length > 0 && <Polyline coordinates={a.diversion} strokeColor={colors.tint} strokeWidth={5} lineDashPattern={[2, 10]} />}
            <Polyline coordinates={a.segment} strokeColor={s.color} strokeWidth={selected ? 10 : 8} zIndex={2} />
            <Marker coordinate={a.marker} onPress={() => onSelect?.(a)} tracksViewChanges={false} anchor={{ x: 0.5, y: 0.5 }} accessibilityLabel={a.headline}>
              <View style={[styles.marker, { backgroundColor: s.color, transform: [{ scale: selected ? 1.25 : 1 }] }]}>
                <Icon name={s.icon} size={14} color={colors.white} />
              </View>
            </Marker>
          </Fragment>
        );
      })}
    </MapView>
  );
}

const styles = StyleSheet.create({
  marker: { width: 30, height: 30, borderRadius: 15, borderWidth: 3, borderColor: colors.white, alignItems: 'center', justifyContent: 'center' },
});
