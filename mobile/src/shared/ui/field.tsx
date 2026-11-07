import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { Text } from './text';
import { colors, fonts, radius, space } from './theme';

type TextFieldProps = TextInputProps & { label: string; error?: string };

/** A labeled input; the label doubles as its accessible name, the error is read with it. */
export function TextField({ label, error, style, ...props }: TextFieldProps) {
  return (
    <View style={styles.field}>
      <Text variant="label">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={error}
        placeholderTextColor={colors.muted}
        selectionColor={colors.accent}
        style={[styles.input, error ? styles.invalid : null, style]}
        {...props}
      />
      {error ? (
        <Text variant="error" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: space.xs },
  input: {
    minHeight: 52,
    borderRadius: radius.md,
    backgroundColor: colors.raised,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 16,
    paddingHorizontal: space.lg,
    borderWidth: 1,
    borderColor: colors.raised,
  },
  invalid: { borderColor: colors.error },
});
