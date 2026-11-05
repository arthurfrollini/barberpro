import type { Href } from 'expo-router';
import { Link } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, hairline, space } from './theme';

/** A tappable row in a list that leads somewhere: thumbnail, text, and an optional trailing value. */
export function LinkRow({
  href,
  label,
  leading,
  children,
  trailing,
}: {
  href: Href;
  label: string;
  leading?: ReactNode;
  children: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <Link href={href} asChild>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={label}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      >
        {leading}
        <View style={styles.body}>{children}</View>
        {trailing}
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    borderBottomWidth: hairline,
    borderBottomColor: colors.line,
  },
  pressed: { opacity: 0.7 },
  body: { flex: 1, gap: 2 },
});
