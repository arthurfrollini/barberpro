import { Stack, useRouter, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { isApiError } from '@/shared/api';
import { bookingDates } from '@/shared/lib/booking-dates';
import { messageFor } from '@/shared/lib/error-messages';
import { formatLongDate, formatShortDateTime } from '@/shared/lib/time';
import { Button } from '@/shared/ui/button';
import { DateStrip } from '@/shared/ui/date-strip';
import { FormError } from '@/shared/ui/form-error';
import { Screen } from '@/shared/ui/screen';
import { SlotGrid } from '@/shared/ui/slot-grid';
import { EmptyState, ErrorState, LoadingState } from '@/shared/ui/states';
import { Text } from '@/shared/ui/text';
import { space } from '@/shared/ui/theme';
import type { Appointment } from '../api/appointments';
import { useAppointment, useReschedule, useRescheduleSlots } from '../hooks/use-appointments';

export function RescheduleScreen({ id }: { id: string }) {
  const { appointment, isPending, error, refetch } = useAppointment(id);
  if (appointment) return <Reschedule appointment={appointment} />;
  return (
    <Screen>
      <Stack.Screen options={{ title: 'Remarcar' }} />
      {isPending ? (
        <LoadingState />
      ) : error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : (
        <EmptyState title="Agendamento não encontrado" body="Confira a lista em Agendamentos." />
      )}
    </Screen>
  );
}

function Reschedule({ appointment: a }: { appointment: Appointment }) {
  const router = useRouter();
  const timeZone = a.barber.barbershop.timezone;
  const dates = useMemo(() => bookingDates(timeZone), [timeZone]);
  const [date, setDate] = useState(dates[0]!);
  const [chosen, setChosen] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const slots = useRescheduleSlots(a.id, date);
  const reschedule = useReschedule();
  const selected = chosen && slots.data?.includes(chosen) ? chosen : null;

  const submit = async () => {
    if (!selected) return;
    setError(undefined);
    try {
      await reschedule.mutateAsync({ id: a.id, startsAt: selected });
      // back to the detail this came from, not a second copy of it on top
      router.dismissTo(`/agendamento/${a.id}?remarcado=1` as Href);
    } catch (failure) {
      const code = isApiError(failure) ? failure.code : undefined;
      setError(messageFor(code));
      if (code === 'SLOT_UNAVAILABLE' || code === 'SLOT_IN_PAST') {
        setChosen(null);
        void slots.refetch();
      }
    }
  };

  return (
    <Screen
      footer={
        <>
          <FormError message={error} />
          <Text variant="muted" style={styles.center}>
            {selected
              ? `De ${formatShortDateTime(a.startsAt, timeZone)} para ${formatShortDateTime(selected, timeZone)}`
              : `Hoje: ${formatShortDateTime(a.startsAt, timeZone)}`}
          </Text>
          <Button
            label="Confirmar novo horário"
            disabled={!selected}
            loading={reschedule.isPending}
            onPress={() => void submit()}
          />
        </>
      }
    >
      <Stack.Screen options={{ title: 'Remarcar' }} />
      <Text variant="heading">
        {a.serviceName} com {a.barber.name}
      </Text>
      <View style={styles.section}>
        <Text variant="heading">Novo dia</Text>
        <DateStrip
          dates={dates}
          value={date}
          onChange={(next) => {
            setDate(next);
            setChosen(null);
            setError(undefined);
          }}
        />
        <Text variant="muted">{formatLongDate(date)}</Text>
      </View>
      <View style={styles.section}>
        <Text variant="heading">Novo horário</Text>
        {slots.isPending ? (
          <LoadingState label="Buscando horários livres" />
        ) : slots.isError ? (
          <ErrorState error={slots.error} onRetry={() => void slots.refetch()} />
        ) : slots.data.length === 0 ? (
          <EmptyState title="Nenhum horário livre neste dia" body="Escolha outro dia acima." />
        ) : (
          <SlotGrid
            slots={slots.data}
            timeZone={timeZone}
            value={selected}
            onChange={(slot) => {
              setChosen(slot);
              setError(undefined);
            }}
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: space.md },
  center: { textAlign: 'center' },
});
