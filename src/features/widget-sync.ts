import type { DeadlineWidgetProps } from '@/widgets/deadline';
import type { NextEventWidgetProps } from '@/widgets/next-event';
import type { RateWidgetProps } from '@/widgets/rate';

export type WidgetSnapshot = {
  deadline: { date: Date; props: DeadlineWidgetProps }[];
  nextEvent: NextEventWidgetProps;
  rate: RateWidgetProps | null;
};

/** Widgets are iOS-only (see widget-sync.ios.ts); other platforms never load SwiftUI views. */
export function syncWidgets(_snapshot: WidgetSnapshot): void {}
