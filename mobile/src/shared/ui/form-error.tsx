import { StyleSheet, View } from 'react-native';
import { Text } from './text';
import { colors, radius, space } from './theme';

/** A form-level error (the API said no), announced when it appears. */
export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <View style={styles.box} accessibilityRole="alert" accessibilityLiveRegion="assertive">
      <Text variant="error">{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: radius.md,
    padding: space.md,
  },
});
