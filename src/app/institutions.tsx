import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';

import { SectorSchema, type Institution, type Sector } from '@/data/schema';
import { useInstitutions } from '@/features/data';
import { SECTORS } from '@/features/labels';
import { toHref } from '@/lib/links';
import { usePrefs } from '@/state/prefs';
import { Skeleton } from '@/ui/atoms';
import { Button, Chip } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Group, GroupNote, INSET, Row, SectionHeader } from '@/ui/list';
import { InstitutionLogo } from '@/ui/logo';
import { EmptyState, RetryLine } from '@/ui/states';
import { Txt } from '@/ui/text';
import { createStyles, fonts, GUTTER, motion, radius, useColors } from '@/ui/theme';

const norm = (s: string) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function Institutions() {
  const colors = useColors();
  const styles = useStyles();
  const params = useLocalSearchParams<{ sector?: string }>();
  const initial = SectorSchema.safeParse(params.sector);
  const [sector, setSector] = useState<Sector | null>(initial.success ? initial.data : null);
  const [query, setQuery] = useState('');
  const institutions = useInstitutions();
  const follows = usePrefs((s) => s.follows);
  const setFollow = usePrefs((s) => s.setFollow);
  const catalog = institutions.data ?? [];
  const q = norm(query.trim());
  const matches = (i: Institution) => !q || [i.name, i.mono, i.why, i.kind].some((f) => norm(f).includes(q));
  const shown = catalog.filter((i) => (!sector || i.sector === sector) && matches(i));
  const sectors = (Object.keys(SECTORS) as Sector[]).filter((s) => catalog.some((i) => i.sector === s));
  const groups = sectors.map((s) => ({ sector: s, list: shown.filter((i) => i.sector === s).sort((a, b) => a.name.localeCompare(b.name)) })).filter((g) => g.list.length > 0);
  const followedCount = catalog.filter((i) => (follows[i.id] ?? 'off') !== 'off').length;

  return (
    <>
      <Stack.Screen options={{ title: 'Institutions', headerLargeTitleEnabled: true }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>
        <Txt v="callout" c={colors.ink2} style={styles.intro} num>
          {institutions.data ? `${catalog.length} official sources, ${followedCount} followed. Imboni only reads their verified accounts and websites.` : 'Official sources Imboni reads, and the ones you follow.'}
        </Txt>
        <View style={styles.px}>
          <View style={styles.search}>
            <Icon name="search" size={16} color={colors.ink3} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search by name or what they publish"
              placeholderTextColor={colors.ink3}
              style={styles.input}
              autoCorrect={false}
              returnKeyType="search"
              clearButtonMode="while-editing"
              accessibilityLabel="Search institutions"
            />
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.chips}>
          <Chip label="All" selected={sector === null} count={catalog.length} onPress={() => setSector(null)} />
          {sectors.map((s) => (
            <Chip key={s} label={SECTORS[s].label} icon={SECTORS[s].icon} selected={sector === s} count={catalog.filter((i) => i.sector === s).length} onPress={() => setSector(sector === s ? null : s)} />
          ))}
        </ScrollView>

        {institutions.isError && !institutions.data ? (
          <RetryLine label="Institutions" error={institutions.error} onRetry={() => institutions.refetch()} style={{ marginTop: 20 }} />
        ) : !institutions.data ? (
          <View style={[styles.px, { marginTop: 24 }]}>
            <Skeleton width="100%" height={260} r={radius.lg} />
          </View>
        ) : groups.length === 0 ? (
          <EmptyState icon="search" title="No institution matches" body="Try a shorter name, an abbreviation such as RRA, or what they publish, such as tax." action={{ label: 'Clear search', onPress: () => { setQuery(''); setSector(null); } }} />
        ) : (
          <Animated.View layout={LinearTransition.duration(motion.base)}>
            {groups.map((g) => (
              <Animated.View key={g.sector} layout={LinearTransition.duration(motion.base)}>
                <SectionHeader title={SECTORS[g.sector].label} icon={SECTORS[g.sector].icon} top={28} />
                <Group inset={INSET.mono}>
                  {g.list.map((i) => {
                    const following = (follows[i.id] ?? 'off') !== 'off';
                    return (
                      <Row
                        key={i.id}
                        left={<InstitutionLogo id={i.id} label={i.mono} />}
                        accessibilityLabel={`${i.name}. ${i.why}.${following ? ' Following.' : ''}`}
                        onPress={() => router.push(toHref({ kind: 'institution', id: i.id }))}
                        right={
                          <Button
                            label={following ? 'Following' : 'Follow'}
                            icon={following ? 'check' : 'plus'}
                            variant={following ? 'quiet' : 'secondary'}
                            size="sm"
                            hug
                            accessibilityHint={following ? 'Stops following this institution' : 'Follows this institution at Important level'}
                            onPress={() => setFollow(i.id, following ? null : 'important')}
                          />
                        }>
                        <Txt v="callout" w="medium" numberOfLines={1}>
                          {i.name}
                        </Txt>
                        <Txt v="footnote" c={colors.ink2} numberOfLines={1}>
                          {i.why}
                        </Txt>
                      </Row>
                    );
                  })}
                </Group>
              </Animated.View>
            ))}
            <GroupNote>Imboni is independent. Names appear only to show where an item came from.</GroupNote>
          </Animated.View>
        )}
      </ScrollView>
    </>
  );
}

const useStyles = createStyles((colors) => StyleSheet.create({
  intro: { paddingHorizontal: GUTTER, paddingTop: 4 },
  px: { paddingHorizontal: GUTTER },
  search: { height: 48, marginTop: 16, borderRadius: radius.sm, borderCurve: 'continuous', borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14 },
  input: { flex: 1, height: 46, fontSize: 16, fontFamily: fonts.regular, color: colors.ink },
  chips: { gap: 8, paddingHorizontal: GUTTER, paddingTop: 12 },
}));
