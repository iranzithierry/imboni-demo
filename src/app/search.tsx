import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useDeferredValue, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import { useApi } from '@/data/api';
import { q } from '@/data/queries';
import type { SearchKind } from '@/data/schema';
import { toHref } from '@/lib/links';
import { search } from '@/lib/search';
import { Pill, Tile } from '@/ui/atoms';
import { Icon } from '@/ui/icon';
import { Cell, Group, GroupHeader } from '@/ui/list';
import { NavBar, NavButton, Screen, useNavInset } from '@/ui/nav';
import { EmptyState, RetryLine } from '@/ui/states';
import { Txt } from '@/ui/text';
import { colors } from '@/ui/theme';

const KINDS: { value: SearchKind | 'all'; label: string; group: string }[] = [
  { value: 'all', label: 'All', group: '' },
  { value: 'action', label: 'Actions', group: 'Actions' },
  { value: 'law', label: 'Laws', group: 'Laws' },
  { value: 'notice', label: 'Notices', group: 'Notices' },
  { value: 'story', label: 'Storylines', group: 'Storylines' },
  { value: 'dir', label: 'Directory', group: 'Directory' },
];

function Highlight({ text, terms }: { text: string; terms: string[] }) {
  const pattern = terms.filter((t) => t.length > 2).map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (!pattern.length) return <Txt v="fn">{`…${text}…`}</Txt>;
  const parts = text.split(new RegExp(`(\\w*(?:${pattern.join('|')})\\w*)`, 'i'));
  return (
    <Txt v="fn">
      …
      {parts.map((p, i) => (i % 2 ? <Txt key={i} v="fn" style={{ backgroundColor: colors.highlight }}>{p}</Txt> : p))}…
    </Txt>
  );
}

export default function Search() {
  const params = useLocalSearchParams<{ q?: string }>();
  const [query, setQuery] = useState(params.q ?? '');
  const [kind, setKind] = useState<SearchKind | 'all'>('all');
  const deferred = useDeferredValue(query);
  const index = useQuery(q.searchIndex(useApi()));
  const top = useNavInset(52);
  const fieldWidth = useWindowDimensions().width - 16 - 84;
  const result = index.data ? search(deferred, index.data.docs, index.data.synonyms) : null;
  const terms = deferred.toLowerCase().split(/\s+/).concat(result?.alsoMatched ?? []);
  const groups = KINDS.filter((k) => k.value !== 'all' && (kind === 'all' || kind === k.value))
    .map((k) => ({ ...k, docs: result?.docs.filter((d) => d.kind === k.value) ?? [] }))
    .filter((g) => g.docs.length);

  return (
    <Screen>
      <NavBar
        right={<NavButton label="Cancel" onPress={() => router.back()} />}
        left={
          <View style={[styles.field, { width: fieldWidth }]}>
            <Icon name="search" size={17} color={colors.l2} />
            <TextInput
              autoFocus
              value={query}
              onChangeText={setQuery}
              placeholder="Notices, laws, letters, offices"
              placeholderTextColor={colors.l2}
              returnKeyType="search"
              clearButtonMode="while-editing"
              autoCorrect={false}
              style={styles.input}
              accessibilityLabel="Search"
            />
          </View>
        }>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.kinds}>
          {KINDS.map((k) => (
            <Pill key={k.value} filled label={`${k.label}${result && deferred ? ` ${result.counts[k.value]}` : ''}`} on={kind === k.value} onPress={() => setKind(k.value)} />
          ))}
        </ScrollView>
      </NavBar>
      <ScrollView keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: top, paddingBottom: 40 }}>
        {index.isError && !index.data && <RetryLine label="Search" error={index.error} onRetry={() => index.refetch()} style={{ marginTop: 12 }} />}
        {result && result.alsoMatched.length > 0 && (
          <Txt v="fn" c={colors.l2} style={{ paddingHorizontal: 20, paddingTop: 6 }}>
            Also matched {result.alsoMatched.map((t, i) => (
              <Txt key={t} v="fn" w="700">
                {t}
                {i < result.alsoMatched.length - 1 ? <Txt v="fn" c={colors.l2}> and </Txt> : null}
              </Txt>
            ))}
          </Txt>
        )}
        {!deferred.trim() ? (
          <EmptyState icon="search" color={colors.tint} title="Search official records" body="Try banknote, tax or embassy. Results include text found in letter images." />
        ) : result && !result.docs.length ? (
          <EmptyState icon="search" color={colors.gray} title="No official records" body={`Nothing from the institutions Imboni follows matches “${deferred.trim()}”.`} />
        ) : (
          groups.map((g) => (
            <Animated.View key={g.value} entering={FadeIn} layout={LinearTransition}>
              <GroupHeader>{g.group}</GroupHeader>
              <Group inset={60}>
                {g.docs.map((d) => (
                  <Cell key={d.id} align="top" left={<Tile icon={d.icon} color={d.color} />} title={d.title} subtitle={d.meta} onPress={() => router.push(toHref(d.link))}>
                    {d.ocr && terms.some((t) => t && d.ocr?.toLowerCase().includes(t.slice(0, 5))) && (
                      <View style={styles.ocr}>
                        <Highlight text={d.ocr} terms={terms} />
                        <View style={styles.ocrMeta}>
                          <Icon name="photo" size={11} color={colors.l2} />
                          <Txt v="c1" c={colors.l2}>
                            Found in a letter image
                          </Txt>
                        </View>
                      </View>
                    )}
                  </Cell>
                ))}
              </Group>
            </Animated.View>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  field: { height: 38, borderRadius: 10, backgroundColor: colors.fill, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, marginLeft: 8 },
  input: { flex: 1, height: 38, fontSize: 17, color: colors.l1 },
  kinds: { gap: 8, paddingHorizontal: 16, paddingTop: 6, paddingBottom: 10 },
  ocr: { marginTop: 8, padding: 10, borderRadius: 10, backgroundColor: colors.bg },
  ocrMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
});
