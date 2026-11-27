import { useQuery } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import * as WebBrowser from 'expo-web-browser';
import { useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, useWindowDimensions, View, type ScrollViewInstance } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { useApi } from '@/data/api';
import { q } from '@/data/queries';
import { useInstitutionLookup } from '@/features/data';
import { ProvenanceLabel } from '@/features/record/parts';
import { formatDate, formatTime } from '@/lib/dates';
import { haptic } from '@/lib/haptics';
import { IconTile, Tag } from '@/ui/atoms';
import { Button } from '@/ui/button';
import { Group, INSET, Row } from '@/ui/list';
import { InstitutionLogo } from '@/ui/logo';
import { closeAction, HeaderActions } from '@/ui/nav';
import { Highlight } from '@/ui/pressable';
import { Segmented } from '@/ui/segmented';
import { DetentSheet } from '@/ui/sheet';
import { ErrorScreen } from '@/ui/states';
import { Txt } from '@/ui/text';
import { createStyles, GUTTER, motion, radius, useColors } from '@/ui/theme';

type Tab = 'letter' | 'post' | 'history';

export default function OriginalScreen() {
  const colors = useColors();
  const styles = useStyles();
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useQuery(q.original(useApi(), id));
  const inst = useInstitutionLookup();
  const { height } = useWindowDimensions();
  const headerHeight = useHeaderHeight();
  const letter = useRef<ScrollViewInstance>(null);
  const offsets = useRef<Record<string, number>>({});
  const [tab, setTab] = useState<Tab>('letter');
  const [field, setField] = useState<string | null>(null);
  const [detent, setDetent] = useState(1);
  const o = query.data;
  const header = (
    <>
      <Stack.Screen options={{ title: 'Original' }} />
      <HeaderActions actions={[closeAction]} />
    </>
  );
  if (!o)
    return (
      <View style={styles.screen}>
        {header}
        {query.isPending ? null : <ErrorScreen error={query.error} onRetry={() => query.refetch()} />}
      </View>
    );
  const selected = field ?? o.fields[0]?.id ?? null;
  const issuer = inst(o.institutionId);
  // The tab switcher sits outside the scroll views, so where the header floats over the screen (iOS) it has to clear it by hand.
  const top = Platform.OS === 'ios' ? headerHeight : 0;

  const pick = (fid: string) => {
    haptic.selection();
    setField(fid);
    const y = offsets.current[fid];
    if (y !== undefined) letter.current?.scrollTo({ y: Math.max(0, y - 60), animated: true });
  };

  return (
    <View style={[styles.screen, { paddingTop: top }]}>
      {header}
      <HeaderActions placement="left" actions={[{ icon: 'flag', text: 'Report', label: 'Report a problem', onPress: () => router.push({ pathname: '/report/[id]', params: { id: o.id, field: 'Whole item' } }) }]} />
      <View style={styles.tabs}>
        <Segmented
          accessibilityLabel="Original view"
          options={[
            { value: 'letter', label: o.kind === 'letter' ? 'Letter' : 'Document' },
            { value: 'post', label: 'Post' },
            { value: 'history', label: 'History' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </View>

      {tab === 'letter' && (
        <Animated.View entering={FadeIn.duration(motion.fast)} style={{ flex: 1 }}>
          <ScrollView ref={letter} maximumZoomScale={3} minimumZoomScale={1} contentContainerStyle={{ paddingVertical: 16, paddingBottom: height * 0.42 }}>
            <View style={styles.paper} accessibilityLabel={`Text read from the letter by ${issuer.name}, ${o.dated}. Pinch to zoom.`}>
              <View style={styles.letterhead}>
                <InstitutionLogo id={issuer.id} label={issuer.mono} size="s" />
                <View style={{ flex: 1 }}>
                  <Txt v="caption" w="medium">
                    {issuer.name}
                  </Txt>
                  <Txt v="caption" c={colors.ink2} num>{`${o.reference} · ${o.dated}`}</Txt>
                </View>
              </View>
              <Txt v="callout" w="medium" style={{ marginTop: 18 }}>
                {o.heading}
              </Txt>
              {o.passages.map((p, i) => {
                const fid = p.fieldId;
                if (!fid) {
                  return (
                    <Txt key={i} v="subhead" style={styles.passage}>
                      {p.text}
                    </Txt>
                  );
                }
                const on = selected === fid;
                return (
                  <Highlight
                    key={i}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    onLayout={(e) => {
                      offsets.current[fid] = e.nativeEvent.layout.y;
                    }}
                    onPress={() => pick(fid)}
                    style={[styles.mark, on && styles.markOn]}>
                    <Txt v="subhead">{p.text}</Txt>
                  </Highlight>
                );
              })}
              {o.signatory && (
                <Highlight
                  accessibilityRole="button"
                  accessibilityLabel={`Signed by the ${o.signatory}`}
                  onLayout={(e) => {
                    offsets.current['signed-by'] = e.nativeEvent.layout.y;
                  }}
                  onPress={() => pick('signed-by')}
                  style={[styles.sign, selected === 'signed-by' && styles.markOn]}>
                  <Svg viewBox="0 0 90 28" width={96} height={30}>
                    <Path d="M4 20c10-14 16 6 24-4s10-10 18 0 14 4 20-6 10 2 20 4" fill="none" stroke={colors.ink} strokeWidth={1.6} />
                  </Svg>
                  <Txt v="caption" w="medium">
                    {o.signatory}
                  </Txt>
                </Highlight>
              )}
            </View>
            <Txt v="caption" c={colors.ink3} center style={{ marginTop: 10 }}>
              Text read from the photo of the letter · highlighted where each field came from
            </Txt>
          </ScrollView>
          <DetentSheet
            detents={[112, 300]}
            index={detent}
            onIndexChange={setDetent}
            header={
              <View style={styles.sheetHead}>
                <Txt v="callout" w="semibold">
                  Fields from this letter
                </Txt>
                <ProvenanceLabel provenance={o.provenance} institution={issuer.name} />
              </View>
            }>
            <ScrollView>
              {o.fields.map((f, i) => {
                const on = selected === f.id;
                return (
                  <Highlight key={f.id} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => pick(f.id)} style={[styles.field, on && { backgroundColor: colors.canvas }]}>
                    <View style={[styles.n, on && styles.nOn]}>
                      <Txt v="footnote" w="medium" c={on ? colors.white : colors.ink} num>
                        {i + 1}
                      </Txt>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Txt v="footnote" c={colors.ink2}>
                        {f.label}
                      </Txt>
                      <Txt v="callout" w="semibold" num>
                        {f.value}
                      </Txt>
                    </View>
                    <Tag label={`Matches ${f.matchedOn.toLowerCase()}`} tone="ok" icon="check" />
                  </Highlight>
                );
              })}
            </ScrollView>
          </DetentSheet>
        </Animated.View>
      )}

      {tab === 'post' && (
        <Animated.ScrollView entering={FadeIn.duration(motion.fast)} contentContainerStyle={{ paddingTop: 16, paddingBottom: 48 }}>
          <View style={styles.post}>
            <View style={styles.letterhead}>
              <InstitutionLogo id={issuer.id} label={issuer.mono} />
              <View style={{ flex: 1 }}>
                <Txt v="callout" w="semibold">
                  {o.post.author}
                </Txt>
                <Txt v="footnote" c={colors.ink2} num>{`${o.post.handle} · ${formatDate.long(o.post.postedAt.slice(0, 10))}, ${formatTime(o.post.postedAt, 'Africa/Kigali')}`}</Txt>
              </View>
            </View>
            <Txt v="body" style={{ marginTop: 12 }}>
              {o.post.text}
            </Txt>
            <View style={styles.attachment}>
              <View style={styles.miniPaper}>
                {[60, 100, 92, 100, 74, 88].map((w, i) => (
                  <View key={i} style={{ height: 5, width: `${w}%`, borderRadius: radius.xs, backgroundColor: i === 2 ? colors.accentWash : colors.fill }} />
                ))}
              </View>
            </View>
            <Txt v="footnote" c={colors.ink2} style={{ marginTop: 12 }}>
              {o.post.edited ? 'Edited once, wording only · shown live from the source' : 'Shown live from the source'}
            </Txt>
          </View>
          <View style={{ paddingHorizontal: GUTTER, marginTop: 14 }}>
            <Button label="Open on the source" icon="external" variant="secondary" onPress={() => WebBrowser.openBrowserAsync(o.post.url).catch(() => undefined)} />
          </View>
        </Animated.ScrollView>
      )}

      {tab === 'history' && (
        <Animated.ScrollView entering={FadeIn.duration(motion.fast)} contentContainerStyle={{ paddingTop: 16, paddingBottom: 48 }}>
          <Group inset={INSET.tile}>
            {o.history.map((h) => (
              <Row key={h.title} left={<IconTile icon={h.icon} tone={h.icon === 'shield' ? 'ok' : 'neutral'} />} title={h.title} subtitle={h.detail} right={<Txt v="footnote" c={colors.ink2} num>{h.time}</Txt>} />
            ))}
          </Group>
          <Txt v="footnote" c={colors.ink3} style={{ paddingHorizontal: GUTTER + 4, paddingTop: 10 }}>
            Wording-only edits never reach you. Changes to dates, amounts, places or rules go back through review and arrive as a before and after.
          </Txt>
        </Animated.ScrollView>
      )}
    </View>
  );
}

const useStyles = createStyles((colors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  tabs: { paddingHorizontal: GUTTER, paddingBottom: 6 },
  paper: { marginHorizontal: GUTTER, padding: 20, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, gap: 2 },
  letterhead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  passage: { marginTop: 10 },
  mark: { marginTop: 10, marginHorizontal: -6, paddingHorizontal: 6, paddingVertical: 4, borderRadius: radius.xs, backgroundColor: colors.accentWash },
  markOn: { borderWidth: 1.5, borderColor: colors.accent },
  sign: { alignSelf: 'flex-end', alignItems: 'flex-end', marginTop: 18, padding: 6, borderRadius: radius.xs, backgroundColor: colors.accentWash },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: GUTTER, paddingBottom: 8 },
  field: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: GUTTER },
  n: { width: 28, height: 28, borderRadius: radius.sm, backgroundColor: colors.fill, alignItems: 'center', justifyContent: 'center' },
  nOn: { backgroundColor: colors.accent },
  post: { marginHorizontal: GUTTER, padding: 16, borderRadius: radius.xl, borderCurve: 'continuous', borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card },
  attachment: { marginTop: 12, height: 190, borderRadius: radius.lg, backgroundColor: colors.fill, alignItems: 'center', justifyContent: 'center' },
  miniPaper: { width: 120, height: 160, borderRadius: radius.xs, backgroundColor: colors.card, padding: 12, gap: 7, borderWidth: 1, borderColor: colors.line },
}));
