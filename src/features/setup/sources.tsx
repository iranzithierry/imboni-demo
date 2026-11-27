import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import type { Institution } from '@/data/schema';
import { suggestSources, type SourceGroup } from '@/lib/sources';
import { usePrefs } from '@/state/prefs';
import { Switch } from '@/ui/atoms';
import { Button } from '@/ui/button';
import { Group, GroupLabel, INSET, Row } from '@/ui/list';
import { InstitutionLogo } from '@/ui/logo';
import { Dock, useDockInset } from '@/ui/nav';
import { Txt } from '@/ui/text';
import { createStyles, GUTTER, motion, useColors } from '@/ui/theme';

import { useInstitutions } from '../data';
import { SetupHeader } from './progress-nav';

export function useSuggestedSources(): SourceGroup[] {
  const situations = usePrefs((s) => s.situations);
  const place = usePrefs((s) => s.place);
  const { data } = useInstitutions();
  return data ? suggestSources(situations, place, data) : [];
}

export function SourcesScreen({ mode }: { mode: 'onboarding' | 'edit' }) {
  const colors = useColors();
  const styles = useStyles();
  const groups = useSuggestedSources();
  const { data: catalog } = useInstitutions();
  const follows = usePrefs((s) => s.follows);
  const setFollow = usePrefs((s) => s.setFollow);
  const [off, setOff] = useState<ReadonlySet<string>>(new Set());
  const bottom = useDockInset();

  const suggested = groups.flatMap((g) => g.institutions);
  // Edit mode also lists everything else the person can follow.
  const others = mode === 'edit' && catalog ? catalog.filter((i) => !suggested.some((s) => s.id === i.id)) : [];
  const all: SourceGroup[] = others.length ? [...groups, { reason: 'More institutions', institutions: others }] : groups;
  const isOn = (i: Institution) => (mode === 'onboarding' ? !off.has(i.id) : follows[i.id] !== undefined && follows[i.id] !== 'off');
  const toggle = (i: Institution, on: boolean) => {
    if (mode === 'edit') setFollow(i.id, on ? 'important' : null);
    else
      setOff((prev) => {
        const next = new Set(prev);
        if (on) next.delete(i.id);
        else next.add(i.id);
        return next;
      });
  };
  const followed = all.flatMap((g) => g.institutions).filter(isOn);

  const commit = () => {
    if (mode === 'onboarding') {
      for (const i of suggested) setFollow(i.id, off.has(i.id) ? null : (follows[i.id] ?? 'important'));
      router.push('/alerts');
    } else router.back();
  };

  return (
    <View style={{ flex: 1 }}>
      <SetupHeader step={3} skipTo={mode === 'onboarding' ? '/alerts' : undefined} mode={mode} title="Sources" />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingBottom: bottom }}>
        <View style={styles.head}>
          <Txt v="title1" accessibilityRole="header">
            {mode === 'edit' ? 'Institutions you follow' : 'Your sources'}
          </Txt>
          <Txt v="callout" c={colors.ink2} style={{ marginTop: 8 }}>
            Picked from your answers. Only verified official accounts and websites, never commentary.
          </Txt>
        </View>
        <View style={styles.stackRow} accessibilityElementsHidden>
          <View style={styles.stack}>
            {followed.slice(0, 6).map((i, idx) => (
              <Animated.View key={i.id} entering={FadeIn.duration(motion.fast)} exiting={FadeOut.duration(motion.fast)} layout={LinearTransition.duration(motion.base)} style={{ marginLeft: idx ? -10 : 0, zIndex: 10 - idx }}>
                <InstitutionLogo id={i.id} label={i.mono} size="l" style={styles.stackItem} />
              </Animated.View>
            ))}
          </View>
          <Txt v="subhead" w="medium" c={colors.ink2} num>
            {`${followed.length} ${followed.length === 1 ? 'source' : 'sources'}`}
          </Txt>
        </View>
        {all.map((g) => (
          <View key={g.reason}>
            <GroupLabel>{g.reason}</GroupLabel>
            <Group inset={INSET.mono}>
              {g.institutions.map((i) => (
                <Row key={i.id} left={<InstitutionLogo id={i.id} label={i.mono} />} right={<Switch label={`Follow ${i.name}`} value={isOn(i)} onChange={(v) => toggle(i, v)} />}>
                  <Txt v="callout" w="medium" numberOfLines={1}>
                    {i.name}
                  </Txt>
                  <Txt v="footnote" c={colors.ink2} numberOfLines={1}>
                    {i.why}
                  </Txt>
                </Row>
              ))}
            </Group>
          </View>
        ))}
      </ScrollView>
      <Dock>
        <Button label={mode === 'edit' ? 'Done' : `Follow ${followed.length} ${followed.length === 1 ? 'source' : 'sources'}`} disabled={mode === 'onboarding' && followed.length === 0} onPress={commit} />
      </Dock>
    </View>
  );
}

const useStyles = createStyles((colors) => StyleSheet.create({
  head: { paddingHorizontal: GUTTER + 4, paddingTop: 4 },
  stackRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 22, paddingHorizontal: GUTTER + 4 },
  stack: { flexDirection: 'row' },
  stackItem: { borderWidth: 3, borderColor: colors.canvas },
}));
