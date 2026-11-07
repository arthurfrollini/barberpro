import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/shared/ui/text';
import { colors, fonts, radius, space } from '@/shared/ui/theme';
import { REMINDER_OPTIONS, type Reminder } from '../lib/draft';

/** How long before the appointment the customer gets a reminder (in the app and by email). */
export function ReminderPicker({
  value,
  onChange,
}: {
  value: Reminder;
  onChange: (reminder: Reminder) => void;
}) {
  return (
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel="Lembrete">
      {REMINDER_OPTIONS.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.param}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ checked: selected }}
            onPress={() => onChange(option.value)}
            style={[styles.option, selected && styles.selected]}
          >
            <Text style={[styles.label, selected && styles.onSelected]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  option: {
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    backgroundColor: colors.raised,
  },
  selected: { backgroundColor: colors.text },
  label: { fontFamily: fonts.bodyMedium, fontSize: 14 },
  onSelected: { color: colors.bar },
});
