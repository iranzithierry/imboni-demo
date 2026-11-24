import { MenuView } from '@expo/ui/community/menu';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import { useApi } from '@/data/api';
import { q } from '@/data/queries';
import type { FeedItem } from '@/data/schema';
import { ageShort } from '@/lib/dates';
import { haptic } from '@/lib/haptics';
import { toHref } from '@/lib/links';
import { shareText } from '@/lib/share';
import { usePrefs } from '@/state/prefs';
import { Badge, Initials } from '@/ui/atoms';
import { Cell, Group, INSET, SectionTitle } from '@/ui/list';
import { Segmented } from '@/ui/segmented';
import { Txt } from '@/ui/text';
import { colors } from '@/ui/theme';
import { useToast } from '@/ui/toast';

import { useInstitutionLookup } from '../data';
import { provenanceLabel } from '../labels';
import { ModuleRetry } from './modules';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'important', label: 'Important' },
] as const;

export function ForYou() {
  const feed = useQuery(q.feed(useApi()));
  const [filter, setFilter] = useState<'all' | 'important'>('all');
  const muted = usePrefs((s) => s.muted);
  const items = (feed.data ?? []).filter((f) => !muted.includes(f.institutionId) && (filter === 'all' || f.important));

  return (
    <>
      <SectionTitle title="For you" />
      <View style={{ paddingHorizontal: 16, marginBottom: 10 }}>
        <Segmented accessibilityLabel="Feed filter" options={FILTERS} value={filter} onChange={setFilter} />
      </View>
      {feed.isError && !feed.data ? (
        <ModuleRetry label="Your feed" error={feed.error} onRetry={() => feed.refetch()} />
      ) : (
        <Animated.View layout={LinearTransition}>
          <Group inset={INSET.avatar}>
            {items.map((item) => (
              <FeedRow key={item.id} item={item} />
            ))}
          </Group>
        </Animated.View>
      )}
    </>
  );
}

function FeedRow({ item }: { item: FeedItem }) {
  const lookup = useInstitutionLookup();
  const inst = lookup(item.institutionId);
  const saved = usePrefs((s) => s.saved.includes(item.id));
  const following = usePrefs((s) => (item.storylineId ? s.storylines[item.storylineId] !== undefined && s.storylines[item.storylineId] !== 'off' : false));
  const toggleSaved = usePrefs((s) => s.toggleSaved);
  const toggleMuted = usePrefs((s) => s.toggleMuted);
  const setStorylineLevel = usePrefs((s) => s.setStorylineLevel);
  const toast = useToast();
  const prov = provenanceLabel(item.provenance);

  const onAction = (id: string) => {
    haptic.tap();
    switch (id) {
      case 'save':
        toggleSaved(item.id);
        toast({ message: saved ? 'Removed from saved items' : 'Saved', icon: 'bookmark', iconColor: colors.yellow });
        break;
      case 'share':
        shareText(item.title, item.link).catch(() => undefined);
        break;
      case 'follow':
        if (item.storylineId) setStorylineLevel(item.storylineId, following ? 'off' : 'important');
        break;
      case 'mute':
        toggleMuted(item.institutionId);
        toast({ message: `${inst.name} muted`, icon: 'speakerSlash', iconColor: colors.white, action: { label: 'Undo', onPress: () => toggleMuted(item.institutionId) } });
        break;
    }
  };

  return (
    <Animated.View entering={FadeIn} exiting={FadeOut}>
      <MenuView
        shouldOpenOnLongPress
        onPressAction={({ nativeEvent }) => onAction(nativeEvent.event)}
        actions={[
          { id: 'save', title: saved ? 'Unsave' : 'Save', image: saved ? 'bookmark.slash' : 'bookmark' },
          { id: 'share', title: 'Share', image: 'square.and.arrow.up' },
          ...(item.storylineId ? [{ id: 'follow', title: following ? 'Unfollow storyline' : 'Follow storyline', image: 'list.bullet' as const }] : []),
          { id: 'mute', title: `Mute ${inst.mono}`, image: 'speaker.slash', attributes: { destructive: true } },
        ]}>
        <Cell align="top" padY={12} left={<Initials label={inst.mono} color={inst.color} />} onPress={() => router.push(toHref(item.link))} accessibilityLabel={`${item.title}. ${inst.name}. ${prov.label}`}>
          <View style={styles.meta}>
            <Txt v="fn" c={colors.l2} numberOfLines={1} style={{ flex: 1 }}>
              {item.meta}
            </Txt>
            <Txt v="fn" c={colors.l3} num>
              {ageShort(item.publishedAt)}
            </Txt>
          </View>
          <Txt v="hl" numberOfLines={2} style={{ marginTop: 1 }}>
            {item.title}
          </Txt>
          <Txt v="fn" c={colors.l2} numberOfLines={2} style={{ marginTop: 2 }}>
            {item.summary}
          </Txt>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
            <Badge label={prov.label} tone={prov.tone} icon={prov.icon} />
            {saved && <Badge label="Saved" tone="gray" icon="bookmark" />}
          </View>
        </Cell>
      </MenuView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  meta: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
});
