import { Pressable, StyleSheet, View } from 'react-native';
import { formatTime } from '@/shared/lib/time';
import { Text } from '@/shared/ui/text';
import { colors, fonts, radius, space } from '@/shared/ui/theme';

/** Free start times as big slab numerals, four to a row; the chosen one filled orange. */
export function SlotGrid({
  slots,
  timeZone,
  value,
  onChange,
}: {
  slots: string[];
  timeZone: string;
  value: string | null;
  onChange: (startsAt: string) => void;
}) {
  return (
    <View style={styles.grid} accessibilityRole="list" accessibilityLabel="Horários livres">
      {slots.map((slot) => {
        const selected = slot === value;
        const time = formatTime(slot, timeZone);
        return (
          <Pressable
            key={slot}
            accessibilityRole="button"
            accessibilityLabel={time}
            accessibilityState={{ selected }}
            onPress={() => onChange(slot)}
            style={({ pressed }) => [
              styles.slot,
              selected && styles.selected,
              pressed && !selected && styles.pressed,
            ]}
          >
            <Text style={[styles.time, selected && styles.onAccent]}>{time}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  slot: {
    width: '23%',
    flexGrow: 1,
    maxWidth: '25%',
    paddingVertical: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
  },
  selected: { backgroundColor: colors.accent, borderColor: colors.accent },
  pressed: { backgroundColor: colors.raised },
  time: { fontFamily: fonts.slab, fontSize: 20, lineHeight: 24 },
  onAccent: { color: colors.onAccent },
});
