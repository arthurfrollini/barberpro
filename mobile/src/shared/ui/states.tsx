import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { isApiError } from '@/shared/api/errors';
import { messageFor } from '@/shared/lib/error-messages';
import { Button } from './button';
import { Text } from './text';
import { colors, space } from './theme';

export function LoadingState({ label = 'Carregando' }: { label?: string }) {
  return (
    <View style={styles.center} accessibilityLabel={label} accessibilityRole="progressbar">
      <ActivityIndicator color={colors.accent} size="large" />
    </View>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.center}>
      <Text variant="heading" style={styles.centered}>
        {title}
      </Text>
      {body ? (
        <Text variant="muted" style={styles.centered}>
          {body}
        </Text>
      ) : null}
      {action}
    </View>
  );
}

/** What went wrong, in the customer's words, with a way to try again. */
export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <View style={styles.center}>
      <Text variant="heading" style={styles.centered}>
        Não deu certo
      </Text>
      <Text variant="muted" style={styles.centered}>
        {messageFor(isApiError(error) ? error.code : undefined)}
      </Text>
      {onRetry ? <Button label="Tentar de novo" variant="secondary" onPress={onRetry} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flexGrow: 1,
    alignItems: 'stretch',
    justifyContent: 'center',
    gap: space.md,
    padding: space.xl,
  },
  centered: { textAlign: 'center' },
});
