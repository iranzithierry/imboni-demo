import { useActionSheet } from '@expo/react-native-action-sheet';
import { router } from 'expo-router';

import type { Action } from '@/data/schema';
import { haptic } from '@/lib/haptics';

/** "Which part is wrong?" as a native action sheet, then the report form for that field. */
export function useReportPicker() {
  const { showActionSheetWithOptions } = useActionSheet();
  return (action: Action) => {
    const fields = ['Whole item', ...(action.revision?.changes.map((c) => c.field) ?? []), 'Where', 'Cost', 'Translation'];
    const options = [...fields, 'Cancel'];
    haptic.tap();
    showActionSheetWithOptions({ title: 'Report a problem', message: 'Which part is wrong?', options, cancelButtonIndex: options.length - 1 }, (i) => {
      const field = i === undefined ? undefined : fields[i];
      if (field) router.push({ pathname: '/report/[id]', params: { id: action.id, field } });
    });
  };
}
