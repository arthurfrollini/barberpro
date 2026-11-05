import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { colors, hairline, space } from './theme';

/**
 * A screen's frame: the brand ground, safe areas, and an optional scroll with pull to refresh.
 * Screens under a stack header leave the top edge to the header.
 */
export function Screen({
  children,
  scroll = true,
  edges = ['left', 'right'],
  refreshing,
  onRefresh,
  footer,
}: {
  children: ReactNode;
  /** Pinned under the scroll, above the home indicator: the screen's main action. */
  footer?: ReactNode;
  scroll?: boolean;
  edges?: Edge[];
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  return (
    <SafeAreaView style={styles.safe} edges={footer ? [...edges, 'bottom'] : edges}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={Boolean(refreshing)}
                onRefresh={onRefresh}
                tintColor={colors.accent}
              />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, styles.fill]}>{children}</View>
      )}
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ground },
  content: { flexGrow: 1, padding: space.lg, gap: space.lg },
  fill: { flex: 1 },
  footer: {
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.lg,
    gap: space.sm,
    borderTopWidth: hairline,
    borderTopColor: colors.line,
  },
});
