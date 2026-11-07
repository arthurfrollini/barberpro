import { useEffect, useRef, type ComponentRef } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { formatLongDate } from '@/shared/lib/time';
import { Text } from './text';
import { colors, fonts, radius, space } from './theme';
import { dayLabel } from '@/shared/lib/booking-dates';

const CELL = 64;

/** The bookable days in a row: weekday small, day number big, the chosen one filled. */
export function DateStrip({
  dates,
  value,
  onChange,
}: {
  dates: string[];
  value: string;
  onChange: (date: string) => void;
}) {
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const today = dates[0]!;
  const index = Math.max(0, dates.indexOf(value));

  // a day chosen before (back from sign in) starts in view
  useEffect(() => {
    scroll.current?.scrollTo({ x: Math.max(0, (index - 1) * (CELL + space.sm)), animated: false });
    // only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ScrollView
      ref={scroll}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      accessibilityRole="list"
      accessibilityLabel="Dias"
    >
      {dates.map((date) => {
        const selected = date === value;
        const label = dayLabel(date, today);
        return (
          <Pressable
            key={date}
            accessibilityRole="button"
            accessibilityLabel={`${label === 'hoje' || label === 'amanhã' ? `${label}, ` : ''}${formatLongDate(date)}`}
            accessibilityState={{ selected }}
            onPress={() => onChange(date)}
            style={[styles.cell, selected && styles.selected]}
          >
            <Text style={[styles.weekday, selected && styles.onAccent]}>{label}</Text>
            <Text style={[styles.day, selected && styles.onAccent]}>{Number(date.slice(8))}</Text>
            <View style={[styles.dot, date.slice(8) === '01' && styles.monthStart]} />
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: space.sm, paddingVertical: space.xs },
  cell: {
    width: CELL,
    paddingVertical: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.raised,
    alignItems: 'center',
    gap: 2,
  },
  selected: { backgroundColor: colors.accent },
  weekday: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.muted },
  day: { fontFamily: fonts.slab, fontSize: 24, lineHeight: 28 },
  onAccent: { color: colors.onAccent },
  dot: { width: 4, height: 4, borderRadius: 2 },
  monthStart: { backgroundColor: colors.muted },
});
