import { Tabs } from 'expo-router/tabs';

import { useInboxUnread } from '@/features/data';
import { Icon, type IconName } from '@/ui/icon';
import { fonts, useColors } from '@/ui/theme';

const TABS: { name: string; title: string; icon: IconName }[] = [
  { name: 'home', title: 'Home', icon: 'home' },
  { name: 'explore', title: 'Explore', icon: 'compass' },
  { name: 'tracking', title: 'Tracking', icon: 'checklist' },
  { name: 'inbox', title: 'Inbox', icon: 'bell' },
  { name: 'me', title: 'Profile', icon: 'person' },
];

/** The web has no system tab bar, and native tabs float over the page title there, so it keeps a plain bottom bar. */
export default function TabsLayout() {
  const colors = useColors();
  const unread = useInboxUnread();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.ink2,
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11 },
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.line },
        tabBarBadgeStyle: { backgroundColor: colors.accent, color: colors.white, fontFamily: fonts.medium, fontSize: 11 },
      }}>
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarIcon: ({ color, focused }) => <Icon name={t.icon} size={22} color={color} filled={focused} />,
            tabBarBadge: t.name === 'inbox' && unread > 0 ? unread : undefined,
          }}
        />
      ))}
    </Tabs>
  );
}
