import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import { offsetLabel } from '@/lib/dates';
import { COUNTRIES, PROVINCES, countryOf, type Place } from '@/lib/places';
import { usePrefs } from '@/state/prefs';
import { Tile } from '@/ui/atoms';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Cell, Group, GroupHeader } from '@/ui/list';
import { Dock, Screen, useDockInset, useNavInset } from '@/ui/nav';
import { Segmented } from '@/ui/segmented';
import { Txt } from '@/ui/text';
import { colors } from '@/ui/theme';

import { ProgressNav } from './progress-nav';

const MODES = [
  { value: 'rw', label: 'In Rwanda' },
  { value: 'abroad', label: 'Abroad' },
] as const;

export function PlaceScreen({ mode }: { mode: 'onboarding' | 'edit' }) {
  const place = usePrefs((s) => s.place);
  const setPlace = usePrefs((s) => s.setPlace);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<string>('City of Kigali');
  const [lastCountry, setLastCountry] = useState(place.mode === 'abroad' ? place.country : 'BE');
  const [lastDistrict, setLastDistrict] = useState(place.mode === 'rw' ? place.district : 'Kicukiro');
  const top = useNavInset();
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
      ? { icon: 'bank' as const, color: 'indigo' as const, title: `Embassy of Rwanda · ${country?.name ?? place.country}`, body: 'Consular notices for you. Alerts in local time.' }
      : { icon: 'pin' as const, color: 'orange' as const, title: `${place.district}, ${PROVINCES.find((p) => (p.districts as readonly string[]).includes(place.district))?.name ?? 'Rwanda'}`, body: 'District notices, Umuganda and road advisories.' };

  return (
    <Screen>
      <ProgressNav step={2} skipTo={mode === 'onboarding' ? '/sources' : undefined} mode={mode} />
      <ScrollView keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: top + 8, paddingBottom: bottom }}>
        <View style={styles.px20}>
          <Txt v="t1" accessibilityRole="header">
            Where do you live?
          </Txt>
          <Txt v="co" c={colors.l2} style={{ marginTop: 6 }}>
            Local notices and consular updates match your place. Alerts follow your time zone.
          </Txt>
        </View>
        <View style={[styles.px, { paddingTop: 18 }]}>
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
            <Icon name="search" size={17} color={colors.l2} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={place.mode === 'abroad' ? 'Search countries' : 'Search districts'}
              placeholderTextColor={colors.l2}
              style={styles.input}
              autoCorrect={false}
              returnKeyType="search"
              clearButtonMode="while-editing"
              accessibilityLabel={place.mode === 'abroad' ? 'Search countries' : 'Search districts'}
            />
          </View>
        </View>

        {place.mode === 'abroad' ? (
          <Animated.View entering={FadeIn} key="abroad">
            <GroupHeader>{q ? 'Results' : 'Suggested'}</GroupHeader>
            <Group>
              {COUNTRIES.filter((c) => !q || c.name.toLowerCase().includes(q)).map((c) => (
                <Cell
                  key={c.code}
                  title={c.name}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: place.country === c.code }}
                  onPress={() => choose({ mode: 'abroad', country: c.code })}
                  right={
                    <>
                      <Txt v="fn" c={colors.l2} num>
                        {offsetLabel(c.timeZone)}
                      </Txt>
                      <Icon name="check" size={17} color={colors.tint} style={{ opacity: place.country === c.code ? 1 : 0 }} />
                    </>
                  }
                />
              ))}
            </Group>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeIn} key="rw" layout={LinearTransition}>
            {PROVINCES.map((p) => {
              const districts = p.districts.filter((d) => !q || d.toLowerCase().includes(q));
              if (!districts.length) return null;
              const expanded = q.length > 0 || open === p.name;
              return (
                <Animated.View key={p.name} layout={LinearTransition}>
                  <GroupHeader>{p.name}</GroupHeader>
                  <Group>
                    {!expanded ? (
                      <Cell title={`${districts.length} districts`} detail={place.district && (p.districts as readonly string[]).includes(place.district) ? place.district : undefined} chevron onPress={() => setOpen(p.name)} accessibilityState={{ expanded: false }} />
                    ) : (
                      districts.map((d) => (
                        <Cell
                          key={d}
                          title={d}
                          accessibilityRole="radio"
                          accessibilityState={{ checked: place.district === d }}
                          onPress={() => choose({ mode: 'rw', district: d })}
                          right={<Icon name="check" size={17} color={colors.tint} style={{ opacity: place.district === d ? 1 : 0 }} />}
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
      <Dock line>
        <View style={styles.hint}>
          <Tile icon={hint.icon} color={hint.color} size="m" />
          <View style={{ flex: 1 }}>
            <Txt v="sh" w="600">
              {hint.title}
            </Txt>
            <Txt v="fn" c={colors.l2}>
              {hint.body}
            </Txt>
          </View>
        </View>
        <Button label={mode === 'edit' ? 'Done' : 'Continue'} onPress={() => (mode === 'onboarding' ? router.push('/sources') : router.back())} />
      </Dock>
    </Screen>
  );
}

const styles = StyleSheet.create({
  px: { paddingHorizontal: 16 },
  px20: { paddingHorizontal: 20 },
  search: { height: 40, borderRadius: 10, backgroundColor: colors.card, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8 },
  input: { flex: 1, fontSize: 17, height: 40, color: colors.l1 },
  hint: { flexDirection: 'row', gap: 12, alignItems: 'center' },
});
