import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { Text } from './text';
import { colors, radius } from './theme';

// "Navalha de Ouro" → "NO": connectors do not make initials
const CONNECTORS = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter((word) => word && !CONNECTORS.has(word.toLowerCase()))
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join('');

/** A logo or a photo, or the name's initials on the raised surface when there is none. */
export function Thumb({
  uri,
  name,
  size = 56,
  round = false,
}: {
  uri: string | null | undefined;
  name: string;
  size?: number;
  round?: boolean;
}) {
  const shape = { width: size, height: size, borderRadius: round ? size / 2 : radius.md };
  if (uri) {
    return (
      <Image
        source={uri}
        style={[styles.box, shape]}
        contentFit="cover"
        transition={150}
        accessibilityIgnoresInvertColors
      />
    );
  }
  return (
    <View
      style={[styles.box, styles.fallback, shape]}
      importantForAccessibility="no-hide-descendants"
    >
      <Text
        variant="heading"
        style={{ fontSize: size * 0.36, lineHeight: size * 0.46, color: colors.accent }}
      >
        {initials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: colors.raised },
  fallback: { alignItems: 'center', justifyContent: 'center' },
});
