import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useApi } from '@/data/api';
import { q } from '@/data/queries';
import type { FeedItem } from '@/data/schema';
import { ageShort } from '@/lib/dates';
import { haptic } from '@/lib/haptics';
import { toHref } from '@/lib/links';
import { shareText } from '@/lib/share';
import { usePrefs } from '@/state/prefs';
import { Tag } from '@/ui/atoms';
import { Button, IconButton } from '@/ui/button';
import { InstitutionLogo } from '@/ui/logo';
import { Photo, hasPhoto } from '@/ui/photo';
import { PressableScale } from '@/ui/pressable';
import { Txt } from '@/ui/text';
import { createStyles, GUTTER, radius, useColors } from '@/ui/theme';
import { useToast } from '@/ui/toast';

import { useInstitutionLookup } from '../data';
import { advisoryStatusLabel, FEED_KIND } from '../labels';
import { useMenu } from './menu';
import { ChangeLine, FieldStrip, ProvenanceLabel } from './parts';
import { RouteSketch } from './route-sketch';

const age = (iso: string) => {
  const a = ageShort(iso);
  return a === 'now' ? 'just now' : `${a} ago`;
};

/** One feed item per record kind, as a plain list entry: same frame, kind-specific body, provenance always visible. */
export function FeedCard({ item }: { item: FeedItem }) {
  const colors = useColors();
  const styles = useStyles();
  const inst = useInstitutionLookup()(item.institutionId);
  const kind = FEED_KIND[item.kind];
  const saved = usePrefs((s) => s.saved.includes(item.id));
  const following = usePrefs((s) => (item.storylineId ? (s.storylines[item.storylineId] ?? 'off') !== 'off' : false));
  const tracked = usePrefs((s) => (item.link.kind === 'action' ? Boolean(s.tracked[item.link.id]) : false));
  const toggleSaved = usePrefs((s) => s.toggleSaved);
  const toggleMuted = usePrefs((s) => s.toggleMuted);
  const setStorylineLevel = usePrefs((s) => s.setStorylineLevel);
  const toast = useToast();
  const menu = useMenu();
  const roads = useQuery({ ...q.roads(useApi()), enabled: Boolean(item.advisoryId) });
  const advisory = item.advisoryId ? roads.data?.advisories.find((a) => a.id === item.advisoryId) : undefined;
  const open = () => router.push(toHref(item.link));

  const more = () =>
    menu(
      [
        { label: 'Share', onPress: () => shareText(item.title, item.link).catch(() => undefined) },
        ...(item.storylineId ? [{ label: following ? 'Unfollow storyline' : 'Follow storyline', onPress: () => setStorylineLevel(item.storylineId ?? '', following ? 'off' : 'important') }] : []),
        { label: 'Report a problem', onPress: () => router.push({ pathname: '/report/[id]', params: { id: item.id, field: 'Whole item' } }) },
        {
          label: `Mute ${inst.name}`,
          destructive: true,
          onPress: () => {
            toggleMuted(item.institutionId);
            toast({ message: `${inst.name} muted`, icon: 'speakerSlash', action: { label: 'Undo', onPress: () => toggleMuted(item.institutionId) } });
          },
        },
      ],
      item.title,
    );

  const showPhoto = !advisory && hasPhoto(item.photo);

  return (
    <View style={styles.card}>
      {/* The actions row sits outside the pressable card body: on the web a button can't hold other buttons. */}
      <PressableScale onPress={open} accessibilityRole="button" accessibilityLabel={`${kind.label}. ${item.title}. ${inst.name}.`}>
        {advisory ? (
          <View style={styles.media}>
            <RouteSketch segment={advisory.segment} diversion={advisory.diversion} route={advisory.onRoute ? roads.data?.route.path : undefined} status={advisory.status} height={128} style={{ borderRadius: radius.lg, overflow: 'hidden' }} />
            <Tag label={advisoryStatusLabel(advisory.status).label} icon={advisoryStatusLabel(advisory.status).icon} tone={advisoryStatusLabel(advisory.status).tone} style={styles.mediaTag} />
          </View>
        ) : (
          showPhoto && (
            <View style={styles.media}>
              <Photo id={item.photo} aspect={16 / 9} radius={radius.lg} hideInLowData />
            </View>
          )
        )}
        <View style={styles.body}>
          <View style={styles.head}>
            <InstitutionLogo id={item.institutionId} label={inst.mono} size="s" />
            <View style={{ flex: 1 }}>
              <Txt v="footnote" w="semibold" numberOfLines={1}>
                {inst.name}
              </Txt>
            </View>
            <Txt v="caption" c={colors.ink3} num>
              {age(item.publishedAt)}
            </Txt>
          </View>
          <View style={styles.kind}>
            <Tag label={kind.label} icon={kind.icon} tone={kind.hue} />
            {item.important && <Tag label="Important" icon="exclamation" tone="red" />}
          </View>
          <Txt v="title3" style={styles.title}>
            {item.title}
          </Txt>
          <Txt v="subhead" c={colors.ink2} numberOfLines={3} style={{ marginTop: 6 }}>
            {item.summary}
          </Txt>
          {item.change && <ChangeLine change={item.change} style={{ marginTop: 12 }} />}
          <FieldStrip fields={item.fields} style={{ marginTop: 14 }} />
        </View>
      </PressableScale>
      <View style={styles.foot}>
        <ProvenanceLabel provenance={item.provenance} institution={inst.name} at={item.publishedAt} />
        <View style={styles.footActions}>
          {item.link.kind === 'action' &&
            (tracked ? (
              <Tag label="Tracking" tone="outline" icon="check" />
            ) : (
              <Button label="Track" icon="plus" variant="tinted" size="sm" hug onPress={() => router.push({ pathname: '/track/[id]', params: { id: item.link.kind === 'action' ? item.link.id : '' } })} />
            ))}
          {item.kind === 'storyline' && item.storylineId && (
            <Button
              label={following ? 'Following' : 'Follow'}
              icon={following ? 'check' : 'plus'}
              variant={following ? 'secondary' : 'tinted'}
              size="sm"
              hug
              onPress={() => setStorylineLevel(item.storylineId ?? '', following ? 'off' : 'important')}
            />
          )}
          <IconButton
            icon="bookmark"
            label={saved ? 'Remove from saved' : 'Save'}
            variant="plain"
            size={36}
            selected={saved}
            onPress={() => {
              haptic.selection();
              toggleSaved(item.id);
            }}
          />
          <IconButton icon="more" label="More" variant="plain" size={36} onPress={more} />
        </View>
      </View>
    </View>
  );
}

const useStyles = createStyles((colors) => StyleSheet.create({
  card: { paddingVertical: 16, paddingHorizontal: GUTTER },
  media: { paddingBottom: 12 },
  mediaTag: { position: 'absolute', top: 10, left: 10 },
  body: {},
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  kind: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  title: { marginTop: 8 },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: -8 },
  footActions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
}));
