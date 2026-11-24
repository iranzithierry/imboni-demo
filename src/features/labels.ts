import type { EventState, Provenance } from '@/data/schema';
import type { IconName } from '@/ui/icon';
import type { Tone } from '@/ui/theme';

type Label = { label: string; tone: Tone; icon: IconName };

/** People only ever see labels, never scores. */
export function provenanceLabel(p: Provenance): Label {
  switch (p) {
    case 'official':
      return { label: 'Official', tone: 'green', icon: 'shield' };
    case 'institution_confirmed':
      return { label: 'Institution-confirmed', tone: 'green', icon: 'checkCircle' };
    case 'reviewed':
      return { label: 'Reviewed', tone: 'green', icon: 'shield' };
    case 'ai_summary':
      return { label: 'AI summary', tone: 'blue', icon: 'sparkles' };
    case 'conflicting':
      return { label: 'Conflicting', tone: 'orange', icon: 'warning' };
    case 'updated':
      return { label: 'Updated', tone: 'orange', icon: 'refresh' };
    case 'source_removed':
      return { label: 'Source removed', tone: 'gray', icon: 'xmarkCircle' };
    case 'withdrawn':
      return { label: 'Withdrawn', tone: 'red', icon: 'xmark' };
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
      return { label: 'Expected', tone: 'gray', icon: 'calendar' };
    case 'confirmed':
      return { label: 'Confirmed', tone: 'green', icon: 'check' };
    case 'changed':
      return { label: 'Changed', tone: 'orange', icon: 'refresh' };
    case 'cancelled':
      return { label: 'Cancelled', tone: 'red', icon: 'xmark' };
    case 'took_place':
      return { label: 'Took place', tone: 'gray', icon: 'check' };
    case 'deadline':
      return { label: 'Deadline', tone: 'red', icon: 'clock' };
    case 'scheduled':
      return { label: 'Scheduled', tone: 'gray', icon: 'calendar' };
    default: {
      const exhaustive: never = s;
      return exhaustive;
    }
  }
}
