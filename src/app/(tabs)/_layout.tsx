import { NativeTabs } from 'expo-router/native-tabs';

import { useInboxUnread } from '@/features/data';
import { materialSymbol, sfSymbol } from '@/ui/icon';
import { colors } from '@/ui/theme';

export default function TabsLayout() {
  const unread = useInboxUnread();
  return (
    <NativeTabs tintColor={colors.tint}>
      <NativeTabs.Trigger name="home">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={sfSymbol('home')} md={materialSymbol('home')} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="explore">
        <NativeTabs.Trigger.Label>Explore</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={sfSymbol('compass')} md={materialSymbol('compass')} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="tracking">
        <NativeTabs.Trigger.Label>Tracking</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={sfSymbol('checkCircle')} md={materialSymbol('checkCircle')} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="inbox">
        <NativeTabs.Trigger.Label>Inbox</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={sfSymbol('bell')} md={materialSymbol('bell')} />
        <NativeTabs.Trigger.Badge hidden={unread === 0}>{String(unread)}</NativeTabs.Trigger.Badge>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="me">
        <NativeTabs.Trigger.Label>Me</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={sfSymbol('person')} md={materialSymbol('person')} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
