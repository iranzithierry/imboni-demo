import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { LinearTransition, ZoomIn, ZoomOut } from 'react-native-reanimated';

import type { Institution } from '@/data/schema';
import { suggestSources, type SourceGroup } from '@/lib/sources';
import { usePrefs } from '@/state/prefs';
import { Initials, Switch } from '@/ui/atoms';
import { Button } from '@/ui/button';
import { Cell, Group, GroupHeader, INSET } from '@/ui/list';
import { Dock, Screen, useDockInset, useNavInset } from '@/ui/nav';
import { Txt } from '@/ui/text';
import { colors } from '@/ui/theme';

import { useInstitutions } from '../data';
import { ProgressNav } from './progress-nav';

export function useSuggestedSources(): SourceGroup[] {
  const situations = usePrefs((s) => s.situations);
  const place = usePrefs((s) => s.place);
  const { data } = useInstitutions();
  return data ? suggestSources(situations, place, data) : [];
}

export function SourcesScreen({ mode }: { mode: 'onboarding' | 'edit' }) {
  const groups = useSuggestedSources();
  const { data: catalog } = useInstitutions();
  const follows = usePrefs((s) => s.follows);
  const setFollow = usePrefs((s) => s.setFollow);
  const [off, setOff] = useState<ReadonlySet<string>>(new Set());
  const top = useNavInset();
  const bottom = useDockInset();

  const suggested = groups.flatMap((g) => g.institutions);
  // Edit mode also lists everything else the person can follow.
  const others = mode === 'edit' && catalog ? catalog.filter((i) => !suggested.some((s) => s.id === i.id)) : [];
  const all: SourceGroup[] = others.length ? [...groups, { reason: 'More institutions', institutions: others }] : groups;
  const isOn = (i: Institution) => (mode === 'onboarding' ? !off.has(i.id) : follows[i.id] !== undefined && follows[i.id] !== 'off');
  const toggle = (i: Institution, on: boolean) => {
    if (mode === 'edit') setFollow(i.id, on ? 'important' : null);
    else setOff((prev) => {
      const next = new Set(prev);
      if (on) next.delete(i.id);
      else next.add(i.id);
      return next;
    });
  };
  const followed = all.flatMap((g) => g.institutions).filter(isOn);

  const commit = () => {
    if (mode === 'onboarding') {
      for (const i of suggested) setFollow(i.id, off.has(i.id) ? null : follows[i.id] ?? 'important');
      router.push('/alerts');
    } else router.back();
  };

  return (
    <Screen>
      <ProgressNav step={3} skipTo={mode === 'onboarding' ? '/alerts' : undefined} mode={mode} />
      <ScrollView contentContainerStyle={{ paddingTop: top + 8, paddingBottom: bottom }}>
        <View style={styles.px20}>
          <Txt v="t1" accessibilityRole="header">
            Your sources
          </Txt>
          <Txt v="co" c={colors.l2} style={{ marginTop: 6 }}>
            Picked from your answers. Only official accounts and websites.
          </Txt>
        </View>
        <View style={styles.stack} accessibilityElementsHidden>
          {followed.slice(0, 5).map((i, idx) => (
            <Animated.View key={i.id} entering={ZoomIn.springify()} exiting={ZoomOut} layout={LinearTransition.springify()} style={{ marginLeft: idx ? -10 : 0 }}>
              <Initials label={i.mono} color={i.color} style={styles.stackItem} />
            </Animated.View>
          ))}
        </View>
        <Txt v="fn" c={colors.l2} num center>
          {followed.length} sources selected
        </Txt>
        {all.map((g) => (
          <View key={g.reason}>
            <GroupHeader>{g.reason}</GroupHeader>
            <Group inset={INSET.avatar}>
              {g.institutions.map((i) => (
                <Cell key={i.id} left={<Initials label={i.mono} color={i.color} />} right={<Switch label={`Follow ${i.name}`} value={isOn(i)} onChange={(v) => toggle(i, v)} />}>
                  <Txt numberOfLines={1}>{i.name}</Txt>
                  <Txt v="fn" c={colors.l2} numberOfLines={1}>
                    {i.why}
                  </Txt>
                </Cell>
              ))}
            </Group>
          </View>
        ))}
      </ScrollView>
      <Dock>
        <Button label={mode === 'edit' ? 'Done' : `Follow ${followed.length} sources`} disabled={mode === 'onboarding' && followed.length === 0} onPress={commit} />
      </Dock>
    </Screen>
  );
}

const styles = StyleSheet.create({
  px20: { paddingHorizontal: 20 },
  stack: { flexDirection: 'row', justifyContent: 'center', paddingTop: 22, paddingBottom: 4 },
  stackItem: { width: 48, height: 48, borderRadius: 24, borderWidth: 3, borderColor: colors.bg },
});
