import DeadlineWidget from '@/widgets/deadline';
import NextEventWidget from '@/widgets/next-event';
import RateWidget from '@/widgets/rate';

import type { WidgetSnapshot } from './widget-sync';

export function syncWidgets({ deadline, nextEvent, rate }: WidgetSnapshot): void {
  // One timeline entry per midnight so the countdown ticks without the app running.
  if (deadline.length) DeadlineWidget.updateTimeline(deadline);
  else DeadlineWidget.updateSnapshot({ title: '', mono: '', daysLeft: 0, remaining: 0, dueLabel: '', url: 'imboni:///tracking' });
  NextEventWidget.updateSnapshot(nextEvent);
  if (rate) RateWidget.updateSnapshot(rate);
}
