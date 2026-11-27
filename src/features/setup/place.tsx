import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import { offsetLabel } from '@/lib/dates';
import { COUNTRIES, PROVINCES, countryOf, type Place } from '@/lib/places';
import { usePrefs } from '@/state/prefs';
import { IconTile, Radio } from '@/ui/atoms';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Group, GroupLabel, Row } from '@/ui/list';
import { Dock, useDockInset } from '@/ui/nav';
import { Segmented } from '@/ui/segmented';
import { Txt } from '@/ui/text';
import { createStyles, fonts, GUTTER, motion, radius, useColors } from '@/ui/theme';

import { SetupHeader } from './progress-nav';

const MODES = [
  { value: 'rw', label: 'In Rwanda' },
  { value: 'abroad', label: 'Abroad' },
] as const;

const layout = LinearTransition.duration(motion.base);

export function PlaceScreen({ mode }: { mode: 'onboarding' | 'edit' }) {
  const colors = useColors();
  const styles = useStyles();
  const place = usePrefs((s) => s.place);
  const setPlace = usePrefs((s) => s.setPlace);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<string>('City of Kigali');
  const [lastCountry, setLastCountry] = useState(place.mode === 'abroad' ? place.country : 'BE');
  const [lastDistrict, setLastDistrict] = useState(place.mode === 'rw' ? place.district : 'Kicukiro');
  const bottom = useDockInset(2);
  const q = query.trim().toLowerCase();

  const choose = (next: Place) => {
    setPlace(next);
    if (next.mode === 'abroad') setLastCountry(next.country);
    else setLastDistrict(next.district);
  };
  const country = place.mode === 'abroad' ? countryOf(place.country) : undefined;
  const hint =
    place.mode === 'abroad'
      ? { icon: 'globe' as const, title: `Embassy of Rwanda · ${country?.name ?? place.country}`, body: `Consular notices and alerts in ${country ? offsetLabel(country.timeZone) : 'local time'}.` }
      : { icon: 'pin' as const, title: `${place.district}, ${PROVINCES.find((p) => (p.districts as readonly string[]).includes(place.district))?.name ?? 'Rwanda'}`, body: 'District notices, Umuganda and road advisories.' };

  return (
    <View style={{ flex: 1 }}>
      <SetupHeader step={2} skipTo={mode === 'onboarding' ? '/sources' : undefined} mode={mode} title="Place" />
      <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: bottom }}>
        <View style={styles.head}>
          <Txt v="title1" accessibilityRole="header">
            Where do you live?
          </Txt>
          <Txt v="callout" c={colors.ink2} style={{ marginTop: 8 }}>
            Local notices and consular updates match your place. Alerts follow your time zone.
          </Txt>
        </View>
        <View style={[styles.px, { paddingTop: 22 }]}>
          <Segmented
            accessibilityLabel="Where you live"
            options={MODES}
            value={place.mode}
            onChange={(m) => {
              setQuery('');
              choose(m === 'abroad' ? { mode: 'abroad', country: lastCountry } : { mode: 'rw', district: lastDistrict });
            }}
          />
        </View>
        <View style={[styles.px, { paddingTop: 12 }]}>
          <View style={styles.search}>
            <Icon name="search" size={16} color={colors.ink3} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={place.mode === 'abroad' ? 'Search countries' : 'Search districts'}
              placeholderTextColor={colors.ink3}
              style={styles.input}
              autoCorrect={false}
              returnKeyType="search"
              clearButtonMode="while-editing"
              accessibilityLabel={place.mode === 'abroad' ? 'Search countries' : 'Search districts'}
            />
          </View>
        </View>

        {place.mode === 'abroad' ? (
          <Animated.View entering={FadeIn.duration(motion.base)} key="abroad">
            <GroupLabel>{q ? 'Results' : 'Suggested countries'}</GroupLabel>
            <Group>
              {COUNTRIES.filter((c) => !q || c.name.toLowerCase().includes(q)).map((c) => (
                <Row
                  key={c.code}
                  title={c.name}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: place.country === c.code }}
                  onPress={() => choose({ mode: 'abroad', country: c.code })}
                  detail={offsetLabel(c.timeZone)}
                  right={<Radio on={place.country === c.code} />}
                />
              ))}
            </Group>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeIn.duration(motion.base)} key="rw" layout={layout}>
            {PROVINCES.map((p) => {
              const districts = p.districts.filter((d) => !q || d.toLowerCase().includes(q));
              if (!districts.length) return null;
              const expanded = q.length > 0 || open === p.name;
              const here = (p.districts as readonly string[]).includes(place.district);
              return (
                <Animated.View key={p.name} layout={layout}>
                  <GroupLabel>{p.name}</GroupLabel>
                  <Group>
                    {!expanded ? (
                      <Row title={`${districts.length} districts`} detail={here ? place.district : undefined} chevron onPress={() => setOpen(p.name)} accessibilityState={{ expanded: false }} />
                    ) : (
                      districts.map((d) => (
                        <Row
                          key={d}
                          title={d}
                          accessibilityRole="radio"
                          accessibilityState={{ checked: place.district === d }}
                          onPress={() => choose({ mode: 'rw', district: d })}
                          right={<Radio on={place.district === d} />}
                        />
                      ))
                    )}
                  </Group>
                </Animated.View>
              );
            })}
          </Animated.View>
        )}
      </ScrollView>
      <Dock>
        <View style={styles.hint}>
          <IconTile icon={hint.icon} size={40} tone={place.mode === 'abroad' ? 'sky' : 'red'} solid />
          <View style={{ flex: 1 }}>
            <Txt v="subhead" w="semibold">
              {hint.title}
            </Txt>
            <Txt v="footnote" c={colors.ink2}>
              {hint.body}
            </Txt>
          </View>
        </View>
        <Button label={mode === 'edit' ? 'Done' : 'Continue'} onPress={() => (mode === 'onboarding' ? router.push('/sources') : router.back())} />
      </Dock>
    </View>
  );
}

const useStyles = createStyles((colors) => StyleSheet.create({
  px: { paddingHorizontal: GUTTER },
  head: { paddingHorizontal: GUTTER + 4, paddingTop: 4 },
  search: { height: 44, borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: colors.fill, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12 },
  input: { flex: 1, fontSize: 16, fontFamily: fonts.regular, height: 44, color: colors.ink },
  hint: { flexDirection: 'row', gap: 12, alignItems: 'center' },
}));
