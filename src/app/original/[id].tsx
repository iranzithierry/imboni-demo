import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View, type ScrollViewInstance } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { useApi } from '@/data/api';
import { q } from '@/data/queries';
import { useInstitutionLookup } from '@/features/data';
import { provenanceLabel } from '@/features/labels';
import { formatDate, formatTime } from '@/lib/dates';
import { haptic } from '@/lib/haptics';
import { Badge, Card, Initials, Tile } from '@/ui/atoms';
import { Button } from '@/ui/button';
import { Cell, Group, INSET } from '@/ui/list';
import { NavButton } from '@/ui/nav';
import { Segmented } from '@/ui/segmented';
import { DetentSheet } from '@/ui/sheet';
import { ErrorScreen } from '@/ui/states';
import { Txt } from '@/ui/text';
import { colors } from '@/ui/theme';

const TABS = [
  { value: 'letter', label: 'Letter' },
  { value: 'post', label: 'Post' },
  { value: 'history', label: 'History' },
] as const;
const serif = { fontFamily: 'Georgia' } as const;

function Lines({ widths }: { widths: number[] }) {
  return (
    <>
      {widths.map((w, i) => (
        <View key={i} style={{ height: 6, width: `${w}%`, backgroundColor: colors.track, borderRadius: 2 }} />
      ))}
    </>
  );
}

export default function OriginalScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useQuery(q.original(useApi(), id));
  const inst = useInstitutionLookup();
  const { height } = useWindowDimensions();
  const letter = useRef<ScrollViewInstance>(null);
  const offsets = useRef<Record<string, number>>({});
  const [tab, setTab] = useState<(typeof TABS)[number]['value']>('letter');
  const [field, setField] = useState<string | null>(null);
  const [detent, setDetent] = useState(1);
  const o = query.data;
  if (!o) return <View style={{ flex: 1, backgroundColor: colors.bg }}>{query.isPending ? null : <ErrorScreen error={query.error} onRetry={() => query.refetch()} />}</View>;
  const selected = field ?? o.fields[0]?.id ?? null;
  const prov = provenanceLabel(o.provenance);
  const mono = inst(o.institutionId).mono;

  const pick = (fid: string) => {
    haptic.selection();
    setField(fid);
    const y = offsets.current[fid];
    if (y !== undefined) letter.current?.scrollTo({ y: Math.max(0, y - 80), animated: true });
  };
  const excerpt = (fid: string) => {
    const f = o.fields.find((x) => x.id === fid);
    if (!f) return null;
    const on = selected === fid;
    return (
      <Pressable
        key={fid}
        accessibilityRole="button"
        accessibilityLabel={`${f.label}: ${f.value}`}
        onLayout={(e) => {
          offsets.current[fid] = e.nativeEvent.layout.y;
        }}
        onPress={() => pick(fid)}
        style={[styles.mark, { backgroundColor: on ? colors.highlight : colors.highlightDim }]}>
        <Txt style={[serif, { fontSize: 12, lineHeight: 17 }]}>{f.excerpt}</Txt>
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <NavButton label="Done" bold onPress={() => router.back()} />
          <Txt v="hl" accessibilityRole="header">
            Original
          </Txt>
          <NavButton label="Report" icon="flag" onPress={() => router.push({ pathname: '/report/[id]', params: { id: o.id, field: 'Whole item' } })} />
        </View>
        <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
          <Segmented accessibilityLabel="Original view" options={TABS} value={tab} onChange={setTab} />
        </View>
      </View>

      {tab === 'letter' && (
        <Animated.View entering={FadeIn} style={{ flex: 1 }}>
          <ScrollView ref={letter} maximumZoomScale={3} minimumZoomScale={1} centerContent style={{ backgroundColor: '#D8D8DD' }} contentContainerStyle={{ paddingVertical: 18, paddingBottom: height * 0.4 }}>
            <View style={styles.paper} accessibilityLabel={`Letter from ${inst(o.institutionId).name}, ${o.dated}. Pinch to zoom.`}>
              <View style={styles.between}>
                <Initials label={mono} color={inst(o.institutionId).color} size="s" />
                <View style={{ alignItems: 'flex-end' }}>
                  <Txt style={[serif, { fontSize: 11, lineHeight: 15 }]}>{o.reference}</Txt>
                  <Txt style={[serif, { fontSize: 11, lineHeight: 15 }]}>{o.dated}</Txt>
                </View>
              </View>
              <View style={{ height: 9, width: '55%', backgroundColor: '#D1D1D6', borderRadius: 2, marginTop: 10 }} />
              <Lines widths={[100, 93]} />
              {excerpt('bank-deadline')}
              <Lines widths={[88, 96]} />
              {excerpt('bnr-only-ends')}
              <Lines widths={[70, 82]} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Signature"
                onLayout={(e) => {
                  offsets.current['signed-by'] = e.nativeEvent.layout.y;
                }}
                onPress={() => pick('signed-by')}
                style={[styles.sign, { backgroundColor: selected === 'signed-by' ? colors.highlight : colors.highlightDim }]}>
                <Svg viewBox="0 0 90 28" width={90} height={28}>
                  <Path d="M4 20c10-14 16 6 24-4s10-10 18 0 14 4 20-6 10 2 20 4" fill="none" stroke="#1C2E6B" strokeWidth={1.6} />
                </Svg>
                <Txt style={[serif, { fontSize: 11, fontWeight: '700' }]}>Governor</Txt>
              </Pressable>
            </View>
          </ScrollView>
          <DetentSheet
            detents={[120, 300]}
            index={detent}
            onIndexChange={setDetent}
            header={
              <View style={styles.sheetHead}>
                <Txt v="hl">Fields from this letter</Txt>
                <Badge label={prov.label} tone={prov.tone} icon={prov.icon} />
              </View>
            }>
            <ScrollView>
              {o.fields.map((f, i) => {
                const on = selected === f.id;
                return (
                  <Pressable key={f.id} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => pick(f.id)} style={[styles.field, { backgroundColor: on ? colors.bg : colors.card }]}>
                    <View style={[styles.n, { backgroundColor: on ? colors.yellow : '#C7C7CC' }]}>
                      <Txt v="fn" w="700" c={colors.white} num>
                        {i + 1}
                      </Txt>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Txt v="fn" c={colors.l2}>
                        {f.label}
                      </Txt>
                      <Txt num>{f.value}</Txt>
                    </View>
                    <Badge label={f.matchedOn} tone="green" icon="check" />
                  </Pressable>
                );
              })}
            </ScrollView>
          </DetentSheet>
        </Animated.View>
      )}

      {tab === 'post' && (
        <Animated.ScrollView entering={FadeIn} contentContainerStyle={{ paddingTop: 16, paddingBottom: 40 }}>
          <Card style={{ padding: 16 }}>
            <View style={styles.row}>
              <Initials label={mono} color={inst(o.institutionId).color} />
              <View style={{ flex: 1 }}>
                <Txt v="hl">{o.post.author}</Txt>
                <Txt v="fn" c={colors.l2} num>{`${o.post.handle} · ${formatDate.long(o.post.postedAt.slice(0, 10))}, ${formatTime(o.post.postedAt, 'Africa/Kigali')}`}</Txt>
              </View>
            </View>
            <Txt v="co" style={{ marginTop: 12 }}>
              {o.post.text}
            </Txt>
            <View style={styles.attachment}>
              <View style={styles.miniPaper}>
                <Lines widths={[60, 100, 100, 80]} />
              </View>
            </View>
            <Txt v="fn" c={colors.l2} style={{ marginTop: 12 }}>
              {o.post.edited ? 'Edited once · shown live from the source' : 'Shown live from the source'}
            </Txt>
          </Card>
          <View style={{ paddingHorizontal: 16, marginTop: 14 }}>
            <Button label="Open source" icon="turnRight" variant="tinted" onPress={() => WebBrowser.openBrowserAsync(o.post.url).catch(() => undefined)} />
          </View>
        </Animated.ScrollView>
      )}

      {tab === 'history' && (
        <Animated.ScrollView entering={FadeIn} contentContainerStyle={{ paddingTop: 16 }}>
          <Group inset={INSET.tile}>
            {o.history.map((h) => (
              <Cell key={h.title} left={<Tile icon={h.icon} color={h.color} />} title={h.title} subtitle={h.detail} right={<Txt v="fn" c={colors.l2} num>{h.time}</Txt>} />
            ))}
          </Group>
        </Animated.ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: 'rgba(249,249,249,0.96)', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.sep, zIndex: 2 },
  headerRow: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingTop: 6 },
  paper: { marginHorizontal: 22, backgroundColor: colors.white, borderRadius: 3, padding: 20, gap: 9, boxShadow: '0 6px 24px rgba(0,0,0,0.18)' },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  mark: { paddingVertical: 3, paddingHorizontal: 5, borderRadius: 4 },
  sign: { alignSelf: 'flex-end', alignItems: 'flex-end', marginTop: 12, paddingVertical: 4, paddingHorizontal: 6, borderRadius: 4 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 6 },
  field: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 11, paddingHorizontal: 16 },
  n: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  attachment: { marginTop: 12, height: 180, borderRadius: 14, backgroundColor: '#D8D8DD', alignItems: 'center', justifyContent: 'center' },
  miniPaper: { width: 110, height: 150, backgroundColor: colors.white, borderRadius: 2, padding: 10, gap: 5 },
});
