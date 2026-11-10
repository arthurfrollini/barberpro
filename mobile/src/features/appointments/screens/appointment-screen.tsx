import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { EnablePushCard } from '@/features/push/components/enable-push-card';
import { mapsUrl } from '@/features/shops/lib/maps';
import { SignedOut } from '@/features/auth/components/signed-out';
import { useIsSignedIn } from '@/features/auth/hooks/use-auth';
import { isApiError } from '@/shared/api';
import { useNow } from '@/shared/hooks/use-now';
import { messageFor } from '@/shared/lib/error-messages';
import { formatBRL, formatDuration } from '@/shared/lib/money';
import { formatLongDate, formatTime, localDateOf } from '@/shared/lib/time';
import { Button, LinkButton } from '@/shared/ui/button';
import { confirm } from '@/shared/ui/confirm';
import { FormError } from '@/shared/ui/form-error';
import { Screen } from '@/shared/ui/screen';
import { EmptyState, ErrorState, LoadingState } from '@/shared/ui/states';
import { Text } from '@/shared/ui/text';
import { colors, fonts, hairline, radius, space } from '@/shared/ui/theme';
import type { Appointment } from '../api/appointments';
import { useAppointment, useCancelAppointment } from '../hooks/use-appointments';
import { canChange, cancelReasonLabel, reminderLabel } from '../lib/rules';

export type Notice = 'booked' | 'moved';

const NOTICES: Record<Notice, string> = { booked: 'Agendado', moved: 'Agendamento remarcado' };

export function AppointmentScreen({ id, notice }: { id: string; notice?: Notice }) {
  const signedIn = useIsSignedIn();
  if (!signedIn)
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Agendamento' }} />
        <SignedOut
          title="Entre para ver este agendamento"
          body="Os agendamentos ficam na sua conta."
          back={`/agendamento/${id}`}
        />
      </Screen>
    );
  return <AppointmentLoader id={id} notice={notice} />;
}

function AppointmentLoader({ id, notice }: { id: string; notice?: Notice }) {
  const { appointment, isPending, error, refetch } = useAppointment(id);
  return (
    <Screen>
      <Stack.Screen options={{ title: 'Agendamento' }} />
      {appointment ? (
        <Details appointment={appointment} notice={notice} />
      ) : isPending ? (
        <LoadingState />
      ) : error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : (
        <EmptyState title="Agendamento não encontrado" body="Confira a lista em Agendamentos." />
      )}
    </Screen>
  );
}

function Details({ appointment: a, notice }: { appointment: Appointment; notice?: Notice }) {
  const shop = a.barber.barbershop;
  const cancel = useCancelAppointment();
  const [error, setError] = useState<string>();
  const booked = a.status === 'BOOKED';
  const now = useNow();
  const upcoming = Date.parse(a.startsAt) > now;
  const changeable = booked && canChange(a.startsAt, now);

  const onCancel = async () => {
    const sure = await confirm({
      title: 'Cancelar agendamento?',
      message: `${a.serviceName} com ${a.barber.name}, ${formatLongDate(localDateOf(a.startsAt, shop.timezone))} às ${formatTime(a.startsAt, shop.timezone)}.`,
      confirmLabel: 'Cancelar agendamento',
    });
    if (!sure) return;
    setError(undefined);
    try {
      await cancel.mutateAsync(a.id);
    } catch (failure) {
      setError(messageFor(isApiError(failure) ? failure.code : undefined));
    }
  };

  return (
    <View style={styles.stack}>
      {notice && booked ? (
        <View style={styles.notice} accessibilityLiveRegion="polite">
          <Ionicons name="checkmark-circle" size={28} color={colors.accent} />
          <Text variant="heading">{NOTICES[notice]}</Text>
        </View>
      ) : null}

      <Ticket appointment={a} />

      {notice === 'booked' && booked ? <EnablePushCard /> : null}

      <View style={styles.block}>
        <Text variant="muted">Endereço</Text>
        <Text>{shop.address}</Text>
        <Button
          label="Abrir no mapa"
          variant="secondary"
          onPress={() => void Linking.openURL(mapsUrl(shop))}
        />
      </View>

      <View style={styles.block}>
        <Text variant="muted">Lembrete</Text>
        <Text>{reminderLabel(a.reminderLeadMinutes)}</Text>
      </View>

      {!booked ? (
        <View style={styles.block}>
          <Text variant="heading">Cancelado</Text>
          <Text variant="muted">{cancelReasonLabel(a.cancelReason)}</Text>
        </View>
      ) : null}

      {cancel.isSuccess ? (
        <Text accessibilityLiveRegion="polite">Agendamento cancelado.</Text>
      ) : null}
      <FormError message={error} />

      {booked && upcoming && !cancel.isSuccess ? (
        <View style={styles.block}>
          {!changeable ? (
            <Text variant="muted">
              Faltam menos de 2 horas: não dá mais para cancelar ou remarcar.
            </Text>
          ) : null}
          <LinkButtonOrDisabled id={a.id} enabled={changeable} />
          <Button
            label="Cancelar agendamento"
            variant="danger"
            disabled={!changeable}
            loading={cancel.isPending}
            onPress={() => void onCancel()}
          />
        </View>
      ) : null}
    </View>
  );
}

function LinkButtonOrDisabled({ id, enabled }: { id: string; enabled: boolean }) {
  return enabled ? (
    <LinkButton href={`/remarcar/${id}`} label="Remarcar" variant="secondary" />
  ) : (
    <Button label="Remarcar" variant="secondary" disabled />
  );
}

/** The booking as a ticket: shop, the time big in slab type, date, service and barber. */
function Ticket({ appointment: a }: { appointment: Appointment }) {
  const shop = a.barber.barbershop;
  const canceled = a.status === 'CANCELED';
  return (
    <View style={styles.ticket}>
      <Text variant="muted">{shop.name}</Text>
      <Text style={[styles.time, canceled && styles.struck]}>
        {formatTime(a.startsAt, shop.timezone)}
      </Text>
      <Text variant="label">{formatLongDate(localDateOf(a.startsAt, shop.timezone))}</Text>
      <View style={styles.perforation} />
      <View style={styles.ticketRow}>
        <View style={{ flex: 1 }}>
          <Text variant="label">{a.serviceName}</Text>
          <Text variant="muted">
            com {a.barber.name} · {formatDuration(a.durationMinutes)}
          </Text>
        </View>
        <Text variant="numeral" style={{ color: colors.accent }}>
          {formatBRL(a.priceCents)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space.xl },
  block: { gap: space.sm },
  notice: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  ticket: {
    backgroundColor: colors.bar,
    borderRadius: radius.lg,
    borderWidth: hairline,
    borderColor: colors.line,
    padding: space.xl,
    gap: space.xs,
  },
  time: { fontFamily: fonts.slab, fontSize: 56, lineHeight: 64 },
  struck: { textDecorationLine: 'line-through', color: colors.muted },
  perforation: {
    marginVertical: space.md,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.line,
  },
  ticketRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
});
