import { StyleSheet, View } from 'react-native';
import { formatBRL } from '@/shared/lib/money';
import { formatShortDateTime } from '@/shared/lib/time';
import { LinkRow } from '@/shared/ui/list-row';
import { Text } from '@/shared/ui/text';
import { colors, fonts, radius, space } from '@/shared/ui/theme';
import type { Appointment } from '../api/appointments';

export function AppointmentRow({ appointment: a }: { appointment: Appointment }) {
  const shop = a.barber.barbershop;
  const when = formatShortDateTime(a.startsAt, shop.timezone);
  const canceled = a.status === 'CANCELED';
  return (
    <LinkRow
      href={`/agendamento/${a.id}`}
      label={[when, a.serviceName, a.barber.name, shop.name, canceled ? 'cancelado' : null]
        .filter(Boolean)
        .join(', ')}
      trailing={
        canceled ? (
          <View style={styles.tag}>
            <Text style={styles.tagText}>Cancelado</Text>
          </View>
        ) : (
          <Text variant="numeral" style={{ fontSize: 16 }}>
            {formatBRL(a.priceCents)}
          </Text>
        )
      }
    >
      <Text style={[styles.when, canceled && styles.dim]}>{when}</Text>
      <Text variant="label" style={canceled && styles.dim}>
        {a.serviceName} com {a.barber.name}
      </Text>
      <Text variant="muted">{shop.name}</Text>
    </LinkRow>
  );
}

const styles = StyleSheet.create({
  when: { fontFamily: fonts.slab, fontSize: 18, color: colors.accent },
  dim: { color: colors.muted },
  tag: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
  },
  tagText: { fontSize: 13, color: colors.muted },
});
