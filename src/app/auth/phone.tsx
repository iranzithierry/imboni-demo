import { MenuView } from '@expo/ui/community/menu';
import { router } from 'expo-router';
import { AsYouType, getCountryCallingCode, isSupportedCountry, isValidPhoneNumber, parsePhoneNumber, type CountryCode } from 'libphonenumber-js/min';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useApi } from '@/data/api';
import { useAuthParams } from '@/features/auth';
import { toAppError, userMessage } from '@/lib/errors';
import { haptic } from '@/lib/haptics';
import { COUNTRIES } from '@/lib/places';
import { usePrefs } from '@/state/prefs';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { BackButton, NavBar } from '@/ui/nav';
import { Txt } from '@/ui/text';
import { colors } from '@/ui/theme';

const DIAL: CountryCode[] = ['RW', ...COUNTRIES.map((c) => c.code).filter(isSupportedCountry)];

export default function PhoneNumber() {
  const params = useAuthParams();
  const api = useApi();
  const place = usePrefs((s) => s.place);
  const top = useSafeAreaInsets().top;
  const initial: CountryCode = place.mode === 'abroad' && isSupportedCountry(place.country) ? place.country : 'RW';
  const [country, setCountry] = useState<CountryCode>(initial);
  const [digits, setDigits] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatted = new AsYouType(country).input(digits);
  const valid = digits.length > 0 && isValidPhoneNumber(digits, country);
  const helper = error ?? (valid ? 'Looks right. Codes expire after 10 minutes.' : 'Enter your mobile number without the country code.');

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

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.white }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <NavBar background={colors.white} left={<BackButton label="Back" />} />
      <View style={[styles.body, { paddingTop: top + 52 }]}>
        <Txt v="t1" accessibilityRole="header">
          Your phone number
        </Txt>
        <Txt v="co" c={colors.l2} style={{ marginTop: 6 }}>
          We’ll text you a 6-digit code. Your number is never shown to anyone.
        </Txt>
        <View style={styles.field}>
          <MenuView
            title="Country code"
            actions={DIAL.map((c) => ({ id: c, title: `${COUNTRIES.find((x) => x.code === c)?.name ?? 'Rwanda'} (+${getCountryCallingCode(c)})`, state: c === country ? 'on' : 'off' }))}
            onPressAction={({ nativeEvent }) => {
              if (isSupportedCountry(nativeEvent.event)) {
                haptic.selection();
                setCountry(nativeEvent.event);
                setDigits('');
              }
            }}>
            <View style={styles.cc} accessibilityRole="button" accessibilityLabel={`Country code, plus ${getCountryCallingCode(country)}`}>
              <Txt v="sh" w="600">
                {country}
              </Txt>
              <Txt v="sh" num>{`+${getCountryCallingCode(country)}`}</Txt>
              <Icon name="chevronDown" size={13} color={colors.l2} />
            </View>
          </MenuView>
          <TextInput
            autoFocus
            value={formatted}
            onChangeText={(t) => {
              setError(null);
              setDigits(t.replace(/\D/g, '').slice(0, 15));
            }}
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            autoComplete="tel-national"
            placeholder="Mobile number"
            placeholderTextColor={colors.l3}
            style={styles.input}
            accessibilityLabel="Mobile number"
            onSubmitEditing={send}
          />
        </View>
        <Txt v="fn" c={error ? colors.red : valid ? colors.greenText : colors.l2} style={{ marginTop: 10 }} accessibilityLiveRegion="polite">
          {helper}
        </Txt>
        {country !== 'RW' && (
          <Pressable accessibilityRole="button" onPress={() => setCountry('RW')} style={{ marginTop: 14 }}>
            <Txt v="fn" w="600" c={colors.tint}>
              Use a Rwandan number (+250)
            </Txt>
          </Pressable>
        )}
      </View>
      <View style={styles.footer}>
        <Button label="Send code" disabled={!valid} loading={sending} onPress={send} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, paddingHorizontal: 20 },
  field: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 28, paddingBottom: 12, borderBottomWidth: 2, borderBottomColor: colors.tint },
  cc: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 36, paddingHorizontal: 12, borderRadius: 10, backgroundColor: colors.fill },
  input: { flex: 1, fontSize: 28, fontWeight: '600', letterSpacing: 0.5, color: colors.l1, fontVariant: ['tabular-nums'] },
  footer: { paddingHorizontal: 16, paddingBottom: 16 },
});
