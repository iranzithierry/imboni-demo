import { requireOptionalNativeModule } from 'expo';

import type { WidgetSnapshot } from './widget-sync';

// expo-widgets throws on import when its native module is missing (Expo Go, or a dev build made
// before the widget extension was added), so the widget modules are only loaded when it exists.
/* eslint-disable @typescript-eslint/no-require-imports */
const widgets = requireOptionalNativeModule('ExpoWidgets')
  ? {
      deadline: (require('@/widgets/deadline') as typeof import('@/widgets/deadline')).default,
      nextEvent: (require('@/widgets/next-event') as typeof import('@/widgets/next-event')).default,
      rate: (require('@/widgets/rate') as typeof import('@/widgets/rate')).default,
    }
  : null;
/* eslint-enable @typescript-eslint/no-require-imports */

export function syncWidgets({ deadline, nextEvent, rate }: WidgetSnapshot): void {
  if (!widgets) return;
  // One timeline entry per midnight so the countdown ticks without the app running.
  if (deadline.length) widgets.deadline.updateTimeline(deadline);
  else widgets.deadline.updateSnapshot({ title: '', mono: '', daysLeft: 0, remaining: 0, dueLabel: '', url: 'imboni:///tracking' });
  widgets.nextEvent.updateSnapshot(nextEvent);
  if (rate) widgets.rate.updateSnapshot(rate);
}
