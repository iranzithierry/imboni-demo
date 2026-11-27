import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { situationLabel } from '@/features/setup/situations';
import { useSuggestedSources } from '@/features/setup/sources';
import { placeLabel } from '@/lib/places';
import { usePrefs } from '@/state/prefs';
import { IconTile } from '@/ui/atoms';
import { Button } from '@/ui/button';
import { Group, GroupLabel, INSET, Row } from '@/ui/list';
import { Dock, useDockInset } from '@/ui/nav';
import { Txt } from '@/ui/text';
import { GUTTER, useColors } from '@/ui/theme';

/** Setup summary the sign-in sheet is presented over. Dismissing the sheet lands here. */
export default function SaveSetup() {
  const colors = useColors();
  const bottom = useDockInset(2);
  const situations = usePrefs((s) => s.situations);
  const place = usePrefs((s) => s.place);
  const follows = usePrefs((s) => s.follows);
  const sources = useSuggestedSources();
  const presented = useRef(false);
  const openSheet = useCallback(() => router.push({ pathname: '/auth', params: { next: 'ready' } }), []);

  useFocusEffect(
    useCallback(() => {
      if (presented.current) return;
      presented.current = true;
      openSheet();
    }, [openSheet]),
  );

  const count = Object.values(follows).filter((l) => l !== 'off').length || sources.flatMap((g) => g.institutions).length;
  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingBottom: bottom }}>
        <View style={styles.head}>
          <Txt v="title1" accessibilityRole="header">
            Keep your setup
          </Txt>
          <Txt v="callout" c={colors.ink2} style={{ marginTop: 8 }}>
            As a guest, everything stays on this phone. Signing in syncs it and lets you report mistakes.
          </Txt>
        </View>
        <GroupLabel>Summary</GroupLabel>
        <Group inset={INSET.tile}>
          <Row left={<IconTile icon="people" tone="pink" solid />} title="Situations" detail={situations.map(situationLabel).join(', ') || 'None yet'} />
          <Row left={<IconTile icon="pin" tone="red" solid />} title="Place" detail={placeLabel(place)} />
          <Row left={<IconTile icon="bank" tone="indigo" solid />} title="Sources" detail={String(count)} />
        </Group>
      </ScrollView>
      <Dock>
        <Button label="Save my setup" onPress={openSheet} />
        <Button label="Continue as guest" variant="secondary" onPress={() => router.push('/ready')} />
      </Dock>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: GUTTER + 4, paddingTop: 4 },
});
