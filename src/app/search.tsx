import { useQuery } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams, useNavigation, type NativeStackNavigationProp } from 'expo-router';
import type { ParamListBase } from 'expo-router/react-navigation';
import { useDeferredValue, useEffect, useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import type { SearchBarCommands } from 'react-native-screens';

import { useApi } from '@/data/api';
import { q } from '@/data/queries';
import type { SearchKind } from '@/data/schema';
import { toHref } from '@/lib/links';
import { search } from '@/lib/search';
import { IconTile } from '@/ui/atoms';
import { Chip } from '@/ui/button';
import { Icon, type IconName } from '@/ui/icon';
import { Group, GroupLabel, Row } from '@/ui/list';
import { EmptyState, RetryLine } from '@/ui/states';
import { Txt } from '@/ui/text';
import { createStyles, fonts, GUTTER, motion, radius, useColors, type Hue } from '@/ui/theme';

const KINDS: { value: SearchKind | 'all'; label: string; icon: IconName; hue?: Hue }[] = [
  { value: 'all', label: 'All', icon: 'search' },
  { value: 'action', label: 'Actions', icon: 'checklist', hue: 'brand' },
  { value: 'law', label: 'Laws', icon: 'law', hue: 'indigo' },
  { value: 'notice', label: 'Notices', icon: 'megaphone', hue: 'sky' },
  { value: 'story', label: 'Storylines', icon: 'list', hue: 'violet' },
  { value: 'dir', label: 'Offices', icon: 'building', hue: 'teal' },
];
const SUGGESTIONS = ['banknotes', 'VAT', 'embassy', 'Car Free Day', 'power cut', 'school fees'];
const NATIVE_SEARCH = Platform.OS === 'ios';

/** The excerpt read from a letter image, with the matched words marked. */
function Excerpt({ text, terms }: { text: string; terms: string[] }) {
  const colors = useColors();
  const pattern = terms.filter((t) => t.length > 2).map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (!pattern.length) return <Txt v="footnote">{`…${text}…`}</Txt>;
  const parts = text.split(new RegExp(`(\\w*(?:${pattern.join('|')})\\w*)`, 'i'));
  return (
    <Txt v="footnote">
      …
      {parts.map((p, i) =>
        i % 2 ? (
          <Txt key={i} v="footnote" w="semibold" style={{ backgroundColor: colors.accentWash }}>
            {p}
          </Txt>
        ) : (
          p
        ),
      )}
      …
    </Txt>
  );
}

export default function Search() {
  const colors = useColors();
  const styles = useStyles();
  const params = useLocalSearchParams<{ q?: string }>();
  const navigation = useNavigation<NativeStackNavigationProp<ParamListBase>>();
  const searchBar = useRef<SearchBarCommands>(null);
  const [query, setQuery] = useState(params.q ?? '');
  const [kind, setKind] = useState<SearchKind | 'all'>('all');
  const deferred = useDeferredValue(query);
  const index = useQuery(q.searchIndex(useApi()));
  const result = index.data ? search(deferred, index.data.docs, index.data.synonyms) : null;
  const terms = deferred.toLowerCase().split(/\s+/).concat(result?.alsoMatched ?? []);
  const groups = KINDS.filter((k) => k.value !== 'all' && (kind === 'all' || kind === k.value))
    .map((k) => ({ ...k, docs: result?.docs.filter((d) => d.kind === k.value) ?? [] }))
    .filter((g) => g.docs.length);

  // The native field ignores `autoFocus` on iOS, and it only takes focus once the push has finished.
  useEffect(() => {
    if (!NATIVE_SEARCH) return;
    const unsubscribe = navigation.addListener('transitionEnd', (e) => {
      if (e.data.closing) return;
      unsubscribe();
      if (params.q) searchBar.current?.setText(params.q);
      searchBar.current?.focus();
    });
    return unsubscribe;
  }, [navigation, params.q]);

  const fill = (text: string) => {
    setQuery(text);
    searchBar.current?.setText(text);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Search',
          headerSearchBarOptions: NATIVE_SEARCH
            ? {
                ref: searchBar,
                placeholder: 'Notices, laws, letters, offices',
                placement: 'stacked',
                hideWhenScrolling: false,
                hideNavigationBar: false,
                obscureBackground: false,
                onChangeText: (e) => setQuery(e.nativeEvent.text),
                onSearchButtonPress: () => searchBar.current?.blur(),
              }
            : undefined,
        }}
      />
      <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 48 }}>
        {!NATIVE_SEARCH && (
          <View style={styles.px}>
            <View style={styles.field}>
              <Icon name="search" size={16} color={colors.ink3} />
              <TextInput
                autoFocus
                value={query}
                onChangeText={setQuery}
                placeholder="Notices, laws, letters, offices"
                placeholderTextColor={colors.ink3}
                returnKeyType="search"
                clearButtonMode="while-editing"
                autoCorrect={false}
                style={styles.input}
                accessibilityLabel="Search"
              />
            </View>
          </View>
        )}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.kinds}>
          {KINDS.map((k) => (
            <Chip key={k.value} label={k.label} count={result && deferred.trim() ? result.counts[k.value] : undefined} selected={kind === k.value} onPress={() => setKind(k.value)} />
          ))}
        </ScrollView>
        {index.isError && !index.data && <RetryLine label="Search" error={index.error} onRetry={() => index.refetch()} style={{ marginTop: 12 }} />}
        {result && result.alsoMatched.length > 0 && (
          <View style={styles.also}>
            <Icon name="translate" size={14} color={colors.ink2} />
            <Txt v="footnote" c={colors.ink2} style={{ flex: 1 }}>
              {'Also matched '}
              {result.alsoMatched.map((t, i) => (
                <Txt key={t} v="footnote" w="semibold" c={colors.ink}>
                  {t}
                  {i < result.alsoMatched.length - 1 ? <Txt v="footnote" c={colors.ink2}>{' and '}</Txt> : null}
                </Txt>
              ))}
              {' in Kinyarwanda and French'}
            </Txt>
          </View>
        )}
        {!deferred.trim() ? (
          <View>
            <EmptyState icon="search" art="search" title="Search official records" body="Every kind of record, in all three languages, including text read from photos of letters." />
            <View style={styles.suggest}>
              {SUGGESTIONS.map((s) => (
                <Chip key={s} label={s} icon="search" onPress={() => fill(s)} />
              ))}
            </View>
          </View>
        ) : result && !result.docs.length ? (
          <EmptyState icon="search" art="search" title="No official record matches" body={`Nothing from the institutions Imboni follows mentions “${deferred.trim()}”. That isn’t the same as false.`} action={{ label: 'Check a message instead', onPress: () => router.push('/is-this-true') }} />
        ) : (
          groups.map((g) => (
            <Animated.View key={g.value} entering={FadeIn.duration(motion.fast)} layout={LinearTransition.duration(motion.base)}>
              <GroupLabel>{`${g.label} · ${g.docs.length}`}</GroupLabel>
              <Group inset={64}>
                {g.docs.map((d) => (
                  <Row key={d.id} align="top" left={<IconTile icon={g.icon} tone={g.hue} />} title={d.title} subtitle={d.meta} onPress={() => router.push(toHref(d.link))}>
                    {d.ocr && terms.some((t) => t && d.ocr?.toLowerCase().includes(t.slice(0, 5))) && (
                      <View style={styles.ocr}>
                        <Excerpt text={d.ocr} terms={terms} />
                        <View style={styles.ocrMeta}>
                          <Icon name="photo" size={12} color={colors.ink2} />
                          <Txt v="caption" c={colors.ink2}>
                            Found in the text of a letter image
                          </Txt>
                        </View>
                      </View>
                    )}
                  </Row>
                ))}
              </Group>
            </Animated.View>
          ))
        )}
      </ScrollView>
    </>
  );
}

const useStyles = createStyles((colors) => StyleSheet.create({
  px: { paddingHorizontal: GUTTER, paddingTop: 8 },
  field: { height: 48, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.ink, backgroundColor: colors.card, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14 },
  input: { flex: 1, height: 46, fontSize: 16, fontFamily: fonts.regular, color: colors.ink },
  kinds: { gap: 8, paddingHorizontal: GUTTER, paddingTop: 12, paddingBottom: 4 },
  also: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: GUTTER, marginTop: 14, padding: 12, borderRadius: radius.md, backgroundColor: colors.fill },
  suggest: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, paddingHorizontal: GUTTER },
  ocr: { marginTop: 10, padding: 10, borderRadius: radius.sm, backgroundColor: colors.canvas, borderWidth: 1, borderColor: colors.line },
  ocrMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
}));
