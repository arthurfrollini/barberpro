import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './text';
import { colors, fonts, radius, space } from './theme';

/** Two or three views of the same list, side by side. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.track}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityLabel={option.label}
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={[styles.option, selected && styles.selected]}
          >
            <Text style={[styles.label, selected && styles.selectedLabel]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: colors.bar,
    borderRadius: radius.md,
    padding: space.xs,
  },
  option: { flex: 1, paddingVertical: space.sm, borderRadius: radius.sm, alignItems: 'center' },
  selected: { backgroundColor: colors.raised },
  label: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.muted },
  selectedLabel: { color: colors.text },
});
