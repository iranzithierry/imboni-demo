import type { Advisory, EventKind, EventState, FeedKind, Provenance, RegulationStatus, Sector, Situation } from '@/data/schema';
import type { TagTone } from '@/ui/atoms';
import type { FeatureIconName } from '@/illustrations/icons';
import type { IconName } from '@/ui/icon';
import type { Hue } from '@/ui/theme';

type Label = { label: string; tone: TagTone; icon: IconName };

/** People only ever see labels, never scores. `meaning` is what the label sheet explains. */
export function provenanceLabel(p: Provenance): Label & { meaning: string } {
  switch (p) {
    case 'official':
      return { label: 'Official', tone: 'ok', icon: 'shield', meaning: 'Published by the institution itself, through its verified workspace or official website.' };
    case 'institution_confirmed':
      return { label: 'Institution-confirmed', tone: 'ok', icon: 'checkCircle', meaning: 'Imboni drafted this from the institution’s own post, and the institution confirmed it.' };
    case 'reviewed':
      return { label: 'Reviewed', tone: 'ok', icon: 'shield', meaning: 'A coordinator checked every field against the source before it was published.' };
    case 'ai_summary':
      return { label: 'AI summary', tone: 'neutral', icon: 'sparkles', meaning: 'Summarised automatically from an official account and not yet reviewed. Low-impact items only; check the source before acting.' };
    case 'conflicting':
      return { label: 'Conflicting', tone: 'warn', icon: 'warning', meaning: 'Two official sources disagree. Both are shown until the institution settles it.' };
    case 'updated':
      return { label: 'Updated', tone: 'warn', icon: 'refresh', meaning: 'A date, amount, place or rule changed after publication. Open it to see exactly what changed.' };
    case 'source_removed':
      return { label: 'Source removed', tone: 'neutral', icon: 'xmark', meaning: 'The original post or page was deleted. The item is under review with the institution.' };
    case 'withdrawn':
      return { label: 'Withdrawn', tone: 'bad', icon: 'xmark', meaning: 'No longer valid. Kept for history with the reason it was withdrawn.' };
    default: {
      const exhaustive: never = p;
      return exhaustive;
    }
  }
}

/** Calendar occurrence states always carry an icon and a word, never colour alone. */
export function eventStateLabel(s: EventState): Label {
  switch (s) {
    case 'expected':
      return { label: 'Usual schedule', tone: 'outline', icon: 'calendar' };
    case 'confirmed':
      return { label: 'Confirmed', tone: 'ok', icon: 'check' };
    case 'changed':
      return { label: 'Changed', tone: 'warn', icon: 'refresh' };
    case 'cancelled':
      return { label: 'Cancelled', tone: 'bad', icon: 'xmark' };
    case 'took_place':
      return { label: 'Took place', tone: 'neutral', icon: 'check' };
    case 'deadline':
      return { label: 'Deadline', tone: 'ink', icon: 'clock' };
    case 'scheduled':
      return { label: 'Scheduled', tone: 'outline', icon: 'calendar' };
    default: {
      const exhaustive: never = s;
      return exhaustive;
    }
  }
}

export function regulationStatusLabel(s: RegulationStatus): Label {
  switch (s) {
    case 'upcoming':
      return { label: 'Upcoming', tone: 'warn', icon: 'clock' };
    case 'in_force':
      return { label: 'In force', tone: 'ok', icon: 'checkCircle' };
    case 'amended':
      return { label: 'Amended', tone: 'warn', icon: 'refresh' };
    case 'repealed':
      return { label: 'Repealed', tone: 'neutral', icon: 'xmark' };
    default: {
      const exhaustive: never = s;
      return exhaustive;
    }
  }
}

export function advisoryStatusLabel(s: Advisory['status']): Label {
  switch (s) {
    case 'closed':
      return { label: 'Closed', tone: 'bad', icon: 'xmark' };
    case 'partial':
      return { label: 'Partly closed', tone: 'warn', icon: 'warning' };
    case 'diversion':
      return { label: 'Diversion', tone: 'warn', icon: 'turnRight' };
    case 'upcoming':
      return { label: 'Upcoming', tone: 'outline', icon: 'calendar' };
    default: {
      const exhaustive: never = s;
      return exhaustive;
    }
  }
}

/** Each kind keeps one hue everywhere it appears, so a law always reads as a law at a glance. */
export const FEED_KIND: Record<FeedKind, { label: string; icon: IconName; hue: Hue }> = {
  notice: { label: 'Notice', icon: 'megaphone', hue: 'sky' },
  action: { label: 'Action', icon: 'checklist', hue: 'brand' },
  regulation: { label: 'Law', icon: 'law', hue: 'indigo' },
  storyline: { label: 'Storyline update', icon: 'list', hue: 'violet' },
  schedule: { label: 'Schedule', icon: 'calendar', hue: 'teal' },
  advisory: { label: 'Road advisory', icon: 'car', hue: 'amber' },
  rate: { label: 'Prices', icon: 'chart', hue: 'green' },
};

export const EVENT_KIND: Record<EventKind, IconName> = {
  car_free_day: 'leaf',
  umuganda: 'people',
  deadline: 'clock',
  holiday: 'sun',
  school: 'graduation',
  phase: 'arrowRight',
  consular: 'globe',
};

export const SECTORS: Record<Sector, { label: string; icon: IconName; art: FeatureIconName; hue: Hue }> = {
  finance: { label: 'Money and tax', icon: 'bank', art: 'money', hue: 'green' },
  education: { label: 'Education', icon: 'graduation', art: 'school', hue: 'indigo' },
  health: { label: 'Health', icon: 'health', art: 'health', hue: 'pink' },
  transport: { label: 'Roads and transport', icon: 'car', art: 'roads', hue: 'amber' },
  identity: { label: 'ID and civil registration', icon: 'idCard', art: 'id', hue: 'violet' },
  city: { label: 'City and district', icon: 'building', art: 'institution', hue: 'teal' },
  trade: { label: 'Business and trade', icon: 'store', art: 'rates', hue: 'brand' },
  utilities: { label: 'Power, water and prices', icon: 'fuel', art: 'power', hue: 'sky' },
  safety: { label: 'Safety and weather', icon: 'shield', art: 'weather', hue: 'red' },
  abroad: { label: 'Rwandans abroad', icon: 'plane', art: 'abroad', hue: 'sky' },
};

/** Life situations: who people say they are, mapped to institutions and topics. */
export const SITUATIONS: Record<Exclude<Situation, 'general'>, { label: string; short: string; icon: IconName; hue: Hue; photo: string; blurb: string }> = {
  driver: { label: 'I drive in Kigali', short: 'Driving', icon: 'car', hue: 'amber', photo: 'kigali-road', blurb: 'Closures on your route, Car Free Day, fuel prices and traffic rules.' },
  student: { label: 'I’m a student', short: 'Studying', icon: 'graduation', hue: 'indigo', photo: 'university', blurb: 'Exam timetables, results portals and scholarship rounds.' },
  parent: { label: 'I’m a parent', short: 'Parents', icon: 'family', hue: 'pink', photo: 'school-students', blurb: 'School calendar and fees, exams, health campaigns and IDs for your children.' },
  business: { label: 'I run a business', short: 'Business', icon: 'store', hue: 'green', photo: 'market', blurb: 'Tax deadlines, new laws, permits and exchange rates.' },
  abroad: { label: 'I live abroad', short: 'Abroad', icon: 'plane', hue: 'sky', photo: 'airport', blurb: 'Consular days, digital ID enrolment at embassies and alerts in your time zone.' },
};
