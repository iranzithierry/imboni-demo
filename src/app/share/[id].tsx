import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, View, type HostInstance } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { IconTile, Tag } from '@/ui/atoms';
import { Wordmark } from '@/ui/brand';
import { IconButton } from '@/ui/button';
import { Icon, type IconName } from '@/ui/icon';
import { Photo } from '@/ui/photo';
import { Highlight } from '@/ui/pressable';
import { Segmented } from '@/ui/segmented';
import { Txt } from '@/ui/text';
import { createStyles, GUTTER, motion, radius, useColors } from '@/ui/theme';
import { useToast } from '@/ui/toast';

/** Card labels per language. Kinyarwanda wording should go through the shared glossary before launch. */
const CHROME: Record<Language, { required: string; until: string; source: string; inForce: string }> = {
  EN: { required: 'Required', until: 'until', source: 'Source', inForce: 'In force from' },
  FR: { required: 'Obligatoire', until: 'jusqu’au', source: 'Source', inForce: 'En vigueur le' },
  RW: { required: 'Birategetswe', until: 'kugeza', source: 'Inkomoko', inForce: 'Gukurikizwa guhera' },
};
const Params = z.object({ id: z.string(), kind: z.enum(['action', 'regulation']).catch('action') });

type CardModel = { photo?: string; required: boolean; institution: string; title: string; boxes: { k: string; v: string }[]; source: string; link: RouteRef };

export default function ShareScreen() {
  const colors = useColors();
  const styles = useStyles();
  const { id, kind } = Params.parse(useLocalSearchParams());
  const insets = useSafeAreaInsets();
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
      photo: action.photo,
      required: action.required,
      institution: i.nameI18n?.[lang] ?? i.name,
      title: action.titleI18n?.[lang] ?? action.title,
      boxes: action.phases.length ? action.phases.map((p) => ({ k: `${p.label} ${c.until}`, v: date(p.to) })) : [{ k: c.until, v: date(action.deadline) }],
      source: `${c.source}: ${action.source.label}`,
      link: { kind: 'action', id: action.id },
    };
  } else if (kind === 'regulation' && reg.data) {
    const r = reg.data;
    model = { photo: 'parliament', required: false, institution: inst(r.institutionId).name, title: r.title[lang], boxes: [{ k: c.inForce, v: date(r.inForce) }], source: `${c.source}: ${r.reference}`, link: { kind: 'regulation', id: r.id } };
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
      if (err.code !== 'cancelled') toast({ message: userMessage(err.code), icon: 'warning' });
    }
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.closeRow, { paddingTop: Math.max(insets.top, 12) }]}>
        <Txt v="callout" w="semibold" c={colors.white}>
          Share
        </Txt>
        <IconButton icon="xmark" label="Close" variant="onDark" size={36} onPress={() => router.back()} />
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 240 }}>
        <View style={{ paddingHorizontal: 32 }}>
          <View ref={card} collapsable={false} style={styles.card}>
            {m.photo && <Photo id={m.photo} aspect={2} radius={radius.lg} />}
            <Animated.View key={lang} entering={FadeIn.duration(motion.fast)} style={{ padding: 12, paddingTop: 14 }}>
              <View style={styles.between}>
                <Txt v="caption" c={colors.ink2} numberOfLines={1} style={{ flex: 1 }}>
                  {m.institution}
                </Txt>
                {m.required && <Tag label={c.required} tone="ink" />}
              </View>
              <Txt v="title2" style={{ marginTop: 8 }}>
                {m.title}
              </Txt>
              <View style={styles.boxes}>
                {m.boxes.map((b) => (
                  <View key={b.k} style={styles.box}>
                    <Txt v="caption" c={colors.ink2}>
                      {b.k}
                    </Txt>
                    <Txt v="callout" w="semibold" num>
                      {b.v}
                    </Txt>
                  </View>
                ))}
              </View>
              <Txt v="caption" c={colors.ink3} style={{ marginTop: 12 }}>
                {m.source}
              </Txt>
              <View style={styles.cardFoot}>
                <Wordmark size={18} />
                <Txt v="caption" c={colors.ink3}>
                  Independent · not a government app
                </Txt>
              </View>
            </Animated.View>
          </View>
          <View style={styles.langs}>
            <Segmented
              accessibilityLabel="Card language"
              options={[
                { value: 'EN', label: 'English' },
                { value: 'FR', label: 'Français' },
                { value: 'RW', label: 'Kinyarwanda' },
              ]}
              value={lang}
              onChange={setLang}
            />
          </View>
        </View>
      </ScrollView>
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.linkRow}>
          <IconTile icon="link" size={40} />
          <View style={{ flex: 1 }}>
            <Txt v="subhead" w="semibold" numberOfLines={1}>
              {m.title}
            </Txt>
            <Txt v="footnote" c={colors.ink2} numberOfLines={1}>
              {shareUrl(m.link)}
            </Txt>
          </View>
        </View>
        <View style={styles.actions}>
          <ShareAction icon="share" label="Share" onPress={() => run(async () => shareImage(await capture(), m.title))} />
          <ShareAction
            icon={copied ? 'check' : 'copy'}
            label={copied ? 'Copied' : 'Copy link'}
            onPress={() =>
              run(async () => {
                await copyLink(m.link);
                haptic.success();
                setCopied(true);
              })
            }
          />
          <ShareAction icon="download" label="Save image" onPress={() => run(async () => saveImage(await capture()), 'Saved to Photos')} />
        </View>
        <Txt v="caption" c={colors.ink3}>
          The link opens a public page with the source. No sign-in, no personal data.
        </Txt>
      </View>
    </View>
  );
}

function ShareAction({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const colors = useColors();
  const styles = useStyles();
  return (
    <Highlight accessibilityRole="button" accessibilityLabel={label} onPress={onPress} pressedStyle={{ backgroundColor: colors.pressed }} style={styles.action}>
      <Icon name={icon} size={20} color={colors.ink} />
      <Txt v="footnote" w="medium">
        {label}
      </Txt>
    </Highlight>
  );
}

const useStyles = createStyles((colors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.night },
  closeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: GUTTER, paddingBottom: 16 },
  card: { borderRadius: radius.xl, borderCurve: 'continuous', backgroundColor: colors.card, padding: 8, overflow: 'hidden' },
  between: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  boxes: { flexDirection: 'row', gap: 8, marginTop: 14 },
  box: { flex: 1, padding: 10, borderRadius: radius.md, backgroundColor: colors.fill },
  cardFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.line },
  langs: { marginTop: 14 },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 16, paddingHorizontal: GUTTER, gap: 12, backgroundColor: colors.canvas, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  actions: { flexDirection: 'row', gap: 8 },
  action: { flex: 1, height: 72, alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card },
}));
