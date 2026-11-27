import { Stack } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { ScrollView, StyleSheet, View } from 'react-native';

import { photos } from '@/data/photos';
import { usePrefs } from '@/state/prefs';
import { IconTile } from '@/ui/atoms';
import { Icon } from '@/ui/icon';
import { Group } from '@/ui/list';
import { Photo } from '@/ui/photo';
import { Highlight } from '@/ui/pressable';
import { EmptyState } from '@/ui/states';
import { Txt } from '@/ui/text';
import { GUTTER, radius, useColors } from '@/ui/theme';

const THUMB = 56;

const open = (url: string) => WebBrowser.openBrowserAsync(url).catch(() => undefined);

function Link({ label, url, a11y }: { label: string; url: string; a11y: string }) {
  const colors = useColors();
  return (
    <Highlight accessibilityRole="link" accessibilityLabel={a11y} hitSlop={6} onPress={() => open(url)} style={styles.link}>
      <Txt v="footnote" w="semibold" style={styles.underline}>
        {label}
      </Txt>
      <Icon name="external" size={10} color={colors.ink} weight="semibold" />
    </Highlight>
  );
}

export default function Credits() {
  const colors = useColors();
  const lowData = usePrefs((s) => s.lowData);
  const entries = Object.entries(photos).sort(([, a], [, b]) => a.credit.title.localeCompare(b.credit.title));

  return (
    <>
      <Stack.Screen options={{ title: 'Photo credits', headerLargeTitleEnabled: true }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingTop: 4, paddingBottom: 40 }}>
        {entries.length === 0 ? (
          <EmptyState icon="photo" title="No photos bundled yet" body="Photos used in the app and their credits appear here once they are added." />
        ) : (
          <>
            <Txt v="footnote" c={colors.ink2} style={styles.intro}>
              Photos are from Wikimedia Commons under the licences shown, resized for the app.
            </Txt>
            <Group inset={GUTTER - 4 + THUMB + 12}>
              {entries.map(([key, p]) => (
                <View key={key} style={styles.row}>
                  {lowData ? <IconTile icon="photo" size={THUMB} /> : <Photo id={key} aspect={1} radius={radius.sm} style={{ width: THUMB }} />}
                  <View style={{ flex: 1 }}>
                    <Txt v="subhead" w="medium" numberOfLines={3}>
                      {p.alt}
                    </Txt>
                    <Txt v="footnote" c={colors.ink2} numberOfLines={2} style={{ marginTop: 2 }}>
                      {`By ${p.credit.author}`}
                    </Txt>
                    <View style={styles.links}>
                      <Link label={p.credit.license} url={p.credit.licenseUrl} a11y={`Licence: ${p.credit.license}`} />
                      <Link label="Source" url={p.credit.sourceUrl} a11y={`Source of ${p.credit.title}`} />
                    </View>
                  </View>
                </View>
              ))}
            </Group>
          </>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  intro: { paddingHorizontal: GUTTER + 4, paddingBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 14, paddingHorizontal: GUTTER - 4 },
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 8 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  underline: { textDecorationLine: 'underline' },
});
