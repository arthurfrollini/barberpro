import { Text as RNText, StyleSheet, type TextProps } from 'react-native';
import { colors, fonts } from './theme';

export type TextVariant = 'title' | 'heading' | 'body' | 'label' | 'muted' | 'numeral' | 'error';

/** Roboto Slab for headings and the numbers that matter (times, prices); Archivo for the rest. */
export function Text({ variant = 'body', style, ...props }: TextProps & { variant?: TextVariant }) {
  return (
    <RNText
      {...props}
      accessibilityRole={variant === 'title' || variant === 'heading' ? 'header' : undefined}
      style={[styles.base, styles[variant], style]}
    />
  );
}

const styles = StyleSheet.create({
  base: { color: colors.text, fontFamily: fonts.body, fontSize: 16, lineHeight: 22 },
  title: { fontFamily: fonts.slab, fontSize: 28, lineHeight: 34 },
  heading: { fontFamily: fonts.slab, fontSize: 20, lineHeight: 26 },
  body: {},
  label: { fontFamily: fonts.bodyMedium, fontSize: 14, lineHeight: 18 },
  muted: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  numeral: { fontFamily: fonts.slab, fontSize: 20, lineHeight: 24 },
  error: { color: colors.error, fontSize: 14, lineHeight: 20 },
});
