import { router } from 'expo-router';
import { AsYouType, getCountryCallingCode, isSupportedCountry, isValidPhoneNumber, parsePhoneNumber, type CountryCode } from 'libphonenumber-js/min';
import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { useApi } from '@/data/api';
import { useAuthParams } from '@/features/auth';
import { useMenu } from '@/features/record/menu';
import { toAppError, userMessage } from '@/lib/errors';
import { haptic } from '@/lib/haptics';
import { COUNTRIES } from '@/lib/places';
import { usePrefs } from '@/state/prefs';
import { Button, TextAction } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { KeyboardDock } from '@/ui/keyboard-dock';
import { Highlight } from '@/ui/pressable';
import { Txt } from '@/ui/text';
import { createStyles, fonts, GUTTER, radius, useColors } from '@/ui/theme';

const DIAL: CountryCode[] = ['RW', ...COUNTRIES.map((c) => c.code).filter((code) => isSupportedCountry(code))];

export default function PhoneNumber() {
  const colors = useColors();
  const styles = useStyles();
  const params = useAuthParams();
  const api = useApi();
  const menu = useMenu();
  const place = usePrefs((s) => s.place);
  const initial: CountryCode = place.mode === 'abroad' && isSupportedCountry(place.country) ? place.country : 'RW';
  const [country, setCountry] = useState<CountryCode>(initial);
  const [digits, setDigits] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState(true);

  const formatted = new AsYouType(country).input(digits);
  const valid = digits.length > 0 && isValidPhoneNumber(digits, country);
  const helper = error ?? (valid ? 'Looks right. Codes expire after 10 minutes.' : 'Enter your mobile number without the country code.');
  const helperTone = error ? colors.bad : valid ? colors.ok : colors.ink2;

  const send = async () => {
    if (!valid) return;
    const e164 = parsePhoneNumber(digits, country).number;
    setSending(true);
    setError(null);
    try {
      const { demoCode } = await api.sendSmsCode(e164);
      haptic.success();
      router.push({ pathname: '/auth/code', params: { next: params.next, id: params.id, phone: e164, display: `+${getCountryCallingCode(country)} ${formatted}`, demo: demoCode ?? undefined } });
    } catch (e) {
      haptic.error();
      setError(userMessage(toAppError(e).code));
    } finally {
      setSending(false);
    }
  };

  const pickCountry = () =>
    menu(
      DIAL.map((c) => {
        const name = COUNTRIES.find((x) => x.code === c)?.name ?? 'Rwanda';
        return {
          label: `${name} (+${getCountryCallingCode(c)})${c === country ? ' (current)' : ''}`,
          onPress: () => {
            haptic.selection();
            setCountry(c);
            setDigits('');
          },
        };
      }),
      'Country code',
    );

  return (
    <View style={styles.screen}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" bounces={false} contentContainerStyle={styles.body}>
        <Txt v="title1" accessibilityRole="header">
          Your phone number
        </Txt>
        <Txt v="callout" c={colors.ink2} style={{ marginTop: 8 }}>
          We’ll text you a 6-digit code. Your number is never shown to anyone.
        </Txt>
        <View style={styles.field}>
          <Highlight accessibilityRole="button" accessibilityLabel={`Country code, plus ${getCountryCallingCode(country)}`} onPress={pickCountry} style={styles.cc}>
            <Txt v="callout" w="semibold">
              {country}
            </Txt>
            <Txt v="callout" c={colors.ink2} num>{`+${getCountryCallingCode(country)}`}</Txt>
            <Icon name="chevronDown" size={11} color={colors.ink2} weight="semibold" />
          </Highlight>
          <TextInput
            autoFocus
            value={formatted}
            onChangeText={(t) => {
              setError(null);
              setDigits(t.replace(/\D/g, '').slice(0, 15));
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            autoComplete="tel-national"
            placeholder="Mobile number"
            placeholderTextColor={colors.ink3}
            style={[styles.input, { borderColor: error ? colors.bad : focused ? colors.ink : colors.line }]}
            accessibilityLabel="Mobile number"
            onSubmitEditing={send}
          />
        </View>
        <View style={styles.helper} accessibilityLiveRegion="polite">
          <Icon name={error ? 'exclamation' : valid ? 'checkCircle' : 'info'} size={14} color={helperTone} weight="semibold" />
          <Txt v="footnote" c={helperTone} style={{ flex: 1 }}>
            {helper}
          </Txt>
        </View>
        {country !== 'RW' && (
          <View style={{ marginTop: 14, alignSelf: 'flex-start' }}>
            <TextAction label="Use a Rwandan number (+250)" icon={null} color={colors.ink} onPress={() => setCountry('RW')} />
          </View>
        )}
      </ScrollView>
      <KeyboardDock>
        <Button label="Send code" disabled={!valid} loading={sending} onPress={send} />
      </KeyboardDock>
    </View>
  );
}

const useStyles = createStyles((colors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  body: { paddingHorizontal: GUTTER + 4, paddingTop: 4, paddingBottom: 16 },
  field: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 28 },
  cc: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 48, paddingHorizontal: 12, borderRadius: radius.sm, borderCurve: 'continuous', borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card },
  input: { flex: 1, height: 48, paddingHorizontal: 14, borderRadius: radius.sm, borderCurve: 'continuous', borderWidth: 1, backgroundColor: colors.card, fontFamily: fonts.semibold, fontSize: 18, color: colors.ink, fontVariant: ['tabular-nums'] },
  helper: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 10 },
}));
