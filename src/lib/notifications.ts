import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { z } from 'zod';

import { RouteRefSchema, type Action } from '@/data/schema';
import type { Tracked } from '@/state/schema';

import { addDays, daysBetween, zonedIso } from './dates';
import { AppError, reportError, toAppError } from './errors';
import { toHref } from './links';
import { reminderSchedule } from './reminders';

const PayloadSchema = z.object({ link: RouteRefSchema });

export const CHANNELS = { critical: 'critical', reminders: 'reminders', updates: 'updates' } as const;

export async function configureNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: true }),
  });
  if (Platform.OS === 'android') {
    await Promise.all([
      Notifications.setNotificationChannelAsync(CHANNELS.critical, { name: 'Critical alerts', importance: AndroidImportance.MAX }),
      Notifications.setNotificationChannelAsync(CHANNELS.reminders, { name: 'Reminders', importance: AndroidImportance.HIGH }),
      Notifications.setNotificationChannelAsync(CHANNELS.updates, { name: 'Updates and digest', importance: AndroidImportance.DEFAULT }),
    ]);
  }
}

export async function notificationsAllowed(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  return current.granted;
}

/** Shows the system prompt once; later calls return the stored answer. */
export async function requestNotifications(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted || !current.canAskAgain) return current.granted;
  const next = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: true, allowSound: true } });
  return next.granted;
}

const reminderContent = (action: Action, institution: string, ymd: string) => {
  const left = daysBetween(ymd, action.deadline);
  const when = left === 0 ? 'Due today' : left === 1 ? 'Due tomorrow' : `${left} days left`;
  return {
    title: `${institution} · Reminder`,
    body: `${when}: ${action.title}`,
    data: { link: { kind: 'action', id: action.id } },
    // Time-sensitive breaks through Focus on the due day; true Critical Alerts need an Apple entitlement.
    interruptionLevel: left === 0 ? ('timeSensitive' as const) : ('active' as const),
    threadIdentifier: action.id,
  };
};

/** Schedules local reminders for a tracked action. Returns notification ids to store for cancellation. */
export async function scheduleReminders(action: Action, institution: string, tracked: Pick<Tracked, 'plan'>, today: string, timeZone: string): Promise<string[]> {
  if (!(await requestNotifications())) throw new AppError('permission_denied');
  const plan = reminderSchedule(tracked.plan, action.deadline, today, new Date(), timeZone);
  return Promise.all(
    plan.map((r) =>
      Notifications.scheduleNotificationAsync({
        content: reminderContent(action, institution, r.ymd),
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(r.at), channelId: CHANNELS.reminders },
      }),
    ),
  );
}

export async function cancelReminders(ids: readonly string[]) {
  await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined)));
}

/** Snooze: drop pending reminders and ask again tomorrow morning. */
export async function snoozeReminders(action: Action, institution: string, tracked: Tracked, today: string, timeZone: string): Promise<{ ids: string[]; until: string }> {
  await cancelReminders(tracked.notificationIds);
  const tomorrow = addDays(today, 1);
  const until = zonedIso(tomorrow, '09:00', timeZone);
  if (!(await requestNotifications())) throw new AppError('permission_denied');
  const id = await Notifications.scheduleNotificationAsync({
    content: reminderContent(action, institution, tomorrow),
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(until), channelId: CHANNELS.reminders },
  });
  const rest = reminderSchedule(tracked.plan, action.deadline, addDays(tomorrow, 1), new Date(until), timeZone);
  const later = await Promise.all(
    rest.map((r) =>
      Notifications.scheduleNotificationAsync({
        content: reminderContent(action, institution, r.ymd),
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(r.at), channelId: CHANNELS.reminders },
      }),
    ),
  );
  return { ids: [id, ...later], until };
}

export async function setBadge(count: number) {
  await Notifications.setBadgeCountAsync(count).catch(() => undefined);
}

/** Opens the screen a tapped notification points at, including cold starts. Push payloads are validated. */
export function useNotificationRouting(ready: boolean) {
  useEffect(() => {
    if (!ready || Platform.OS === 'web') return;
    const open = (response: Notifications.NotificationResponse) => {
      const parsed = PayloadSchema.safeParse(response.notification.request.content.data);
      if (!parsed.success) {
        reportError(toAppError(new AppError('invalid_response', { cause: parsed.error, detail: 'notification payload' })), 'notifications');
        return;
      }
      router.push(toHref(parsed.data.link));
      Notifications.clearLastNotificationResponse();
    };
    const last = Notifications.getLastNotificationResponse();
    if (last) open(last);
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, [ready]);
}
