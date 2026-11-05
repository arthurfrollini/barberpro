import { ActivityIndicator, Pressable, StyleSheet, View, type PressableProps } from 'react-native';
import { Text } from './text';
import { colors, fonts, radius, space } from './theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  variant?: Variant;
  /** Shows a spinner and blocks presses while a mutation runs. */
  loading?: boolean;
};

export function Button({
  label,
  variant = 'primary',
  loading = false,
  disabled,
  ...props
}: ButtonProps) {
  const inactive = Boolean(disabled) || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        inactive && styles.inactive,
        pressed && styles.pressed,
      ]}
      {...props}
    >
      <View style={styles.row}>
        {loading ? (
          <ActivityIndicator color={variant === 'primary' ? colors.onAccent : colors.text} />
        ) : null}
        <Text style={[styles.label, labelStyles[variant]]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  primary: { backgroundColor: colors.accent },
  secondary: { backgroundColor: colors.raised },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.error },
  inactive: { opacity: 0.45 },
  pressed: { opacity: 0.8 },
  label: { fontFamily: fonts.bodySemiBold, fontSize: 16 },
});

const labelStyles = StyleSheet.create({
  primary: { color: colors.onAccent },
  secondary: { color: colors.text },
  ghost: { color: colors.accent },
  danger: { color: colors.error },
});
