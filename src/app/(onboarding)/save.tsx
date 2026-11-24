import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { situationLabel } from '@/features/setup/situations';
import { useSuggestedSources } from '@/features/setup/sources';
import { placeLabel } from '@/lib/places';
import { usePrefs } from '@/state/prefs';
import { Button } from '@/ui/button';
import { Cell, Group, GroupHeader } from '@/ui/list';
import { BackButton, Dock, NavBar, Screen } from '@/ui/nav';
import { Txt } from '@/ui/text';
import { colors } from '@/ui/theme';

/** Setup summary the sign-in sheet is presented over. Dismissing the sheet lands here. */
export default function SaveSetup() {
  const top = useSafeAreaInsets().top;
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
    <Screen>
      <NavBar background={colors.bg} left={<BackButton />} />
      <ScrollView contentContainerStyle={{ paddingTop: top + 64 }}>
        <View style={{ paddingHorizontal: 20 }}>
          <Txt v="t1">Your setup</Txt>
        </View>
        <GroupHeader>Summary</GroupHeader>
        <Group>
          <Cell title="Situations" detail={situations.map(situationLabel).join(', ') || 'None yet'} />
          <Cell title="Place" detail={placeLabel(place)} />
          <Cell title="Sources" detail={String(count)} />
        </Group>
      </ScrollView>
      <Dock>
        <Button label="Save my setup" onPress={openSheet} />
      </Dock>
    </Screen>
  );
}
