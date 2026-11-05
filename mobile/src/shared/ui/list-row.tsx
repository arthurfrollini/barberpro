import { useRouter, type Href } from 'expo-router';
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
  // a Pressable that navigates, not Link asChild: Link drops a style function on its child
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={label}
      onPress={() => router.push(href)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {leading}
      <View style={styles.body}>{children}</View>
      {trailing}
    </Pressable>
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
