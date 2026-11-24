import { useImperativeHandle, type Ref } from 'react';
import { StyleSheet, View } from 'react-native';

import type { Advisory, Roads } from '@/data/schema';
import type { IconName } from '@/ui/icon';
import { Txt } from '@/ui/text';
import { colors } from '@/ui/theme';

export const ADVISORY_STYLE: Record<Advisory['status'], { color: string; icon: IconName }> = {
  closed: { color: colors.red, icon: 'xmark' },
  partial: { color: colors.orange, icon: 'minus' },
  upcoming: { color: colors.gray, icon: 'clock' },
};

export type AdvisoryMapHandle = { focus: (a: Advisory) => void; fitRoute: () => void; locate: () => void };

/** Web preview only: native maps are iOS/Android. */
export function AdvisoryMap({ roads, ref }: { roads: Roads; visible: readonly Advisory[]; selectedId: string | null; onSelect?: (a: Advisory) => void; mapType?: string; interactive?: boolean; bottomInset?: number; ref?: Ref<AdvisoryMapHandle> }) {
  useImperativeHandle(ref, () => ({ focus: () => undefined, fitRoute: () => undefined, locate: () => undefined }));
  return (
    <View style={[StyleSheet.absoluteFill, styles.fallback]}>
      <Txt v="fn" c={colors.l2}>{`Map of ${roads.route.label} (native only)`}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({ fallback: { backgroundColor: '#F3F1EC', alignItems: 'center', justifyContent: 'center' } });
