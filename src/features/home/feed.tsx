import { useQuery } from '@tanstack/react-query';
import { Fragment } from 'react';
import { router } from 'expo-router';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import { useApi } from '@/data/api';
import { q } from '@/data/queries';
import type { FeedItem } from '@/data/schema';
import { usePrefs } from '@/state/prefs';
import { Rule } from '@/ui/list';
import { EmptyState } from '@/ui/states';
import { motion } from '@/ui/theme';

import { FeedCard } from '../record/feed-card';
import { ModuleRetry } from './modules';

export type FeedFilter = 'all' | 'important' | 'saved';

/** Items match the person when they are for everyone, for one of their situations, or from a follow. */
export function useForYou() {
  const feed = useQuery(q.feed(useApi()));
  const muted = usePrefs((s) => s.muted);
  const situations = usePrefs((s) => s.situations);
  const follows = usePrefs((s) => s.follows);
  const matches = (f: FeedItem) => !f.audience.length || !situations.length || f.audience.some((a) => situations.includes(a)) || (follows[f.institutionId] ?? 'off') !== 'off';
  return { feed, items: (feed.data ?? []).filter((f) => !muted.includes(f.institutionId) && matches(f)) };
}

/** The feed itself: plain entries one after another, divided by rules, no cards. */
export function FeedList({ filter }: { filter: FeedFilter }) {
  const { feed, items } = useForYou();
  const saved = usePrefs((s) => s.saved);
  const shown = items.filter((f) => (filter === 'important' ? f.important : filter === 'saved' ? saved.includes(f.id) : true));

  if (feed.isError && !feed.data) return <ModuleRetry label="Your feed" error={feed.error} onRetry={() => feed.refetch()} />;
  if (shown.length === 0 && feed.data) {
    return (
      <EmptyState
        icon={filter === 'saved' ? 'bookmark' : 'megaphone'}
        art={filter === 'saved' ? 'saved' : 'inbox'}
        title={filter === 'saved' ? 'Nothing saved yet' : 'Nothing important right now'}
        body={filter === 'saved' ? 'Tap the bookmark on any item to keep it here, offline too.' : 'Required actions, changes to things you track and new laws show up here.'}
        action={filter === 'saved' ? undefined : { label: 'Follow more institutions', onPress: () => router.push('/settings/sources') }}
      />
    );
  }
  return (
    <Animated.View key={filter} entering={FadeIn.duration(motion.fast)} layout={LinearTransition.duration(motion.base)}>
      {shown.map((item, i) => (
        <Fragment key={item.id}>
          {i > 0 && <Rule />}
          <FeedCard item={item} />
        </Fragment>
      ))}
    </Animated.View>
  );
}

