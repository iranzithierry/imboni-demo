import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View, type HostInstance } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { captureRef } from 'react-native-view-shot';
import { z } from 'zod';

import { useApi } from '@/data/api';
import { q } from '@/data/queries';
import type { Language, RouteRef } from '@/data/schema';
import { useAction, useInstitutionLookup } from '@/features/data';
import { formatDate } from '@/lib/dates';
import { toAppError, userMessage } from '@/lib/errors';
import { haptic } from '@/lib/haptics';
import { copyLink, saveImage, shareImage, shareUrl } from '@/lib/share';
import { usePrefs } from '@/state/prefs';
import { GlassBadge, Gradient } from '@/ui/atoms';
import { CircleButton } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Cell, Group } from '@/ui/list';
import { Segmented } from '@/ui/segmented';
import { Txt } from '@/ui/text';
import { colors, type GradientName } from '@/ui/theme';
import { useToast } from '@/ui/toast';

const LANGS = [
  { value: 'EN', label: 'EN' },
  { value: 'FR', label: 'FR' },
  { value: 'RW', label: 'RW' },
] as const;
/** Card chrome per language. Kinyarwanda strings stay as the design's placeholders until translated. */
const CHROME: Record<Language, { required: string; until: string; source: string; inForce: string }> = {
  EN: { required: 'Required', until: 'until', source: 'Source', inForce: 'In force' },
  FR: { required: 'Obligatoire', until: 'jusqu’au', source: 'Source', inForce: 'En vigueur' },
  RW: { required: '[Required]', until: '[until]', source: '[Source]', inForce: '[In force]' },
};
const Params = z.object({ id: z.string(), kind: z.enum(['action', 'regulation']).catch('action') });

type CardModel = { gradient: GradientName; required: boolean; institution: string; title: string; boxes: { k: string; v: string }[]; source: string; link: RouteRef };

export default function ShareScreen() {
  const { id, kind } = Params.parse(useLocalSearchParams());
  const preferred = usePrefs((s) => s.contentLanguage);
  const [lang, setLang] = useState<Language>(preferred);
  const [copied, setCopied] = useState(false);
  const card = useRef<HostInstance>(null);
  const toast = useToast();
  const inst = useInstitutionLookup();
  const { action } = useAction(id);
  const reg = useQuery({ ...q.regulation(useApi(), id), enabled: kind === 'regulation' });
  const c = CHROME[lang];
  const date = (ymd: string) => (lang === 'EN' ? formatDate.long(ymd) : lang === 'FR' ? new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(ymd)) : ymd.split('-').reverse().join('/'));

  let model: CardModel | null = null;
  if (kind === 'action' && action) {
    const i = inst(action.institutionId);
    model = {
      gradient: action.icon === 'banknote' ? 'banknote' : 'brand',
      required: action.required,
      institution: i.nameI18n?.[lang] ?? i.name,
      title: action.titleI18n?.[lang] ?? action.title,
      boxes: action.phases.length ? action.phases.map((p) => ({ k: `${p.label.split(' ')[0]} ${c.until}`, v: date(p.to) })) : [{ k: c.until, v: date(action.deadline) }],
      source: `${c.source}: ${action.source.label}`,
      link: { kind: 'action', id: action.id },
    };
  } else if (kind === 'regulation' && reg.data) {
    const r = reg.data;
    model = { gradient: 'law', required: false, institution: inst(r.institutionId).name, title: r.title[lang], boxes: [{ k: c.inForce, v: date(r.inForce) }], source: `${c.source}: ${r.reference}`, link: { kind: 'regulation', id: r.id } };
  }
  if (!model) return <View style={styles.screen} />;
  const m = model;

  const capture = () => captureRef(card, { format: 'png', quality: 1, result: 'tmpfile' });
  const run = async (fn: () => Promise<void>, done?: string) => {
    try {
      await fn();
      if (done) {
        haptic.success();
        toast({ message: done, icon: 'checkCircle' });
      }
    } catch (e) {
      const err = toAppError(e);
      if (err.code !== 'cancelled') toast({ message: userMessage(err.code), icon: 'warning', iconColor: colors.orange });
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.closeRow}>
        <CircleButton icon="xmark" label="Close" variant="glass" onPress={() => router.back()} />
      </View>
      <Animated.View entering={ZoomIn.springify().damping(16)} style={{ paddingHorizontal: 40 }}>
        <View ref={card} collapsable={false} style={styles.card}>
          <Gradient name={m.gradient} />
          <View style={styles.between}>
            <View style={styles.brand}>
              <View style={styles.brandIcon}>
                <Icon name="eye" size={13} color={colors.white} />
              </View>
              <Txt v="c1" w="600" c={colors.white}>
                Imboni
              </Txt>
            </View>
            {m.required && <GlassBadge label={c.required} />}
          </View>
          <Animated.View key={lang} entering={FadeIn}>
            <Txt v="c1" c="rgba(255,255,255,0.85)" style={{ marginTop: 16 }}>
              {m.institution}
            </Txt>
            <Txt v="t2" c={colors.white} style={{ marginTop: 2 }}>
              {m.title}
            </Txt>
            <View style={styles.boxes}>
              {m.boxes.map((b) => (
                <View key={b.k} style={styles.box}>
                  <Txt v="c1" c="rgba(255,255,255,0.8)">
                    {b.k}
                  </Txt>
                  <Txt v="hl" num c={colors.white}>
                    {b.v}
                  </Txt>
                </View>
              ))}
            </View>
            <Txt v="c2" c="rgba(255,255,255,0.75)" style={{ marginTop: 14 }}>
              {m.source}
            </Txt>
          </Animated.View>
        </View>
        <View style={{ alignSelf: 'center', width: 170, marginTop: 12 }}>
          <Segmented dark accessibilityLabel="Card language" options={LANGS} value={lang} onChange={setLang} />
        </View>
      </Animated.View>
      <View style={styles.sheet}>
        <View style={styles.grab} />
        <View style={styles.linkRow}>
          <View style={{ flex: 1 }}>
            <Txt v="sh" w="600" numberOfLines={1}>
              {m.title}
            </Txt>
            <Txt v="fn" c={colors.l2} numberOfLines={1}>
              {shareUrl(m.link)}
            </Txt>
          </View>
        </View>
        <Group>
          <Cell left={<Icon name="share" size={20} color={colors.tint} />} title="Share image…" onPress={() => run(async () => shareImage(await capture(), m.title))} />
          <Cell
            left={<Icon name={copied ? 'check' : 'link'} size={20} color={copied ? colors.green : colors.tint} />}
            title={copied ? 'Copied' : 'Copy link'}
            onPress={() =>
              run(async () => {
                await copyLink(m.link);
                haptic.success();
                setCopied(true);
              })
            }
          />
          <Cell left={<Icon name="download" size={20} color={colors.tint} />} title="Save image" onPress={() => run(async () => saveImage(await capture()), 'Saved to Photos')} />
        </Group>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  closeRow: { alignItems: 'flex-end', padding: 16 },
  card: { borderRadius: 22, overflow: 'hidden', padding: 20 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  brandIcon: { width: 20, height: 20, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  boxes: { flexDirection: 'row', gap: 10, marginTop: 16 },
  box: { flex: 1, backgroundColor: 'rgba(0,0,0,0.18)', borderRadius: 12, padding: 10 },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingBottom: 40, backgroundColor: colors.bg, borderTopLeftRadius: 14, borderTopRightRadius: 14 },
  grab: { width: 36, height: 5, borderRadius: 3, backgroundColor: colors.l3, alignSelf: 'center', marginTop: 6 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12 },
});
