import { useQuery } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';

import { useApi } from '@/data/api';
import { q } from '@/data/queries';
import { FeedCard } from '@/features/record/feed-card';
import { usePrefs } from '@/state/prefs';
import { Skeleton } from '@/ui/atoms';
import { EmptyState, RetryLine } from '@/ui/states';
import { Txt } from '@/ui/text';
import { createStyles, GUTTER, motion, radius, useColors } from '@/ui/theme';

export default function Saved() {
  const colors = useColors();
  const styles = useStyles();
  const feed = useQuery(q.feed(useApi()));
  const saved = usePrefs((s) => s.saved);
  // Newest save first: the saved list is in the order things were saved.
  const items = [...saved].reverse().flatMap((id) => feed.data?.find((f) => f.id === id) ?? []);

  return (
    <>
      <Stack.Screen options={{ title: 'Saved', headerLargeTitleEnabled: true }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingTop: 4, paddingBottom: 40 }}>
        {feed.isError && !feed.data ? (
          <RetryLine label="Saved items" error={feed.error} onRetry={() => feed.refetch()} />
        ) : feed.isPending ? (
          <View style={styles.list} accessibilityLabel="Loading">
            {[0, 1].map((i) => (
              <View key={i} style={styles.skeleton}>
                <Skeleton width="100%" height={160} r={radius.lg} />
                <Skeleton width="70%" height={18} />
                <Skeleton width="90%" height={14} />
              </View>
            ))}
          </View>
        ) : items.length === 0 ? (
          <EmptyState icon="bookmark" art="saved" title="Nothing saved yet" body="Tap the bookmark on any card to keep it here. Saved items stay readable when you’re offline." action={{ label: 'Go to Home', onPress: () => router.navigate('/home') }} />
        ) : (
          <>
            <Txt v="footnote" c={colors.ink2} num style={styles.count}>
              {`${items.length} ${items.length === 1 ? 'item' : 'items'} · kept on this phone and readable offline`}
            </Txt>
            <Animated.View layout={LinearTransition.duration(motion.base)} style={styles.list}>
              {items.map((item) => (
                <FeedCard key={item.id} item={item} />
              ))}
            </Animated.View>
          </>
        )}
      </ScrollView>
    </>
  );
}

const useStyles = createStyles((colors) => StyleSheet.create({
  count: { paddingHorizontal: GUTTER + 4, paddingBottom: 12 },
  list: { gap: 12, paddingHorizontal: GUTTER },
  skeleton: { gap: 10, padding: 8, paddingBottom: 16, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card },
}));
