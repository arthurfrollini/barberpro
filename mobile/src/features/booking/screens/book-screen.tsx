import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useIsSignedIn } from '@/features/auth/hooks/use-auth';
import { returnPathWith } from '@/features/auth/lib/return-path';
import { useBarber } from '@/features/shops/hooks/use-shops';
import type { Barber } from '@/features/shops/api/shops';
import { isApiError } from '@/shared/api';
import { messageFor } from '@/shared/lib/error-messages';
import { formatBRL, formatDuration } from '@/shared/lib/money';
import { formatLongDate, formatShortDateTime } from '@/shared/lib/time';
import { Button, LinkButton } from '@/shared/ui/button';
import { FormError } from '@/shared/ui/form-error';
import { Screen } from '@/shared/ui/screen';
import { EmptyState, ErrorState, LoadingState } from '@/shared/ui/states';
import { Text } from '@/shared/ui/text';
import { colors, hairline, radius, space } from '@/shared/ui/theme';
import { DateStrip } from '../components/date-strip';
import { ReminderPicker } from '../components/reminder-picker';
import { SlotGrid } from '../components/slot-grid';
import { useBook, useSlots } from '../hooks/use-booking';
import { bookingDates } from '../lib/dates';
import { draftParams, readDraft, type Draft } from '../lib/draft';

type Service = Barber['services'][number];

export function BookScreen() {
  const { barbeiro } = useLocalSearchParams<{ barbeiro?: string }>();
  const barber = useBarber(barbeiro);

  if (barber.isPending)
    return (
      <Frame>
        <LoadingState />
      </Frame>
    );
  if (barber.isError)
    return (
      <Frame>
        <ErrorState error={barber.error} onRetry={() => void barber.refetch()} />
      </Frame>
    );
  if (barber.data === null)
    return (
      <Frame>
        <EmptyState title="Barbeiro não encontrado" body="Ele pode ter saído da barbearia." />
      </Frame>
    );
  return <Booking barber={barber.data} />;
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <Screen>
      <Stack.Screen options={{ title: 'Agendar' }} />
      {children}
    </Screen>
  );
}

const SLOT_GONE = new Set(['SLOT_UNAVAILABLE', 'SLOT_IN_PAST']);

function Booking({ barber }: { barber: Barber }) {
  const params = useLocalSearchParams<Record<string, string>>();
  const router = useRouter();
  const signedIn = useIsSignedIn();
  const timeZone = barber.barbershop.timezone;
  const dates = useMemo(() => bookingDates(timeZone), [timeZone]);
  const draft = readDraft(params, dates);
  const service = barber.services.find((s) => s.id === draft.serviceId);
  const slots = useSlots(barber.id, draft.serviceId, draft.date, Boolean(service));
  const book = useBook();
  const [error, setError] = useState<string>();

  // a time is chosen only while it is still on the list for that day
  const chosen = draft.startsAt && slots.data?.includes(draft.startsAt) ? draft.startsAt : null;

  const update = (patch: Partial<Draft>) => {
    setError(undefined);
    const next = { ...draft, ...patch };
    // an empty `hora` clears it; setParams merges, so leaving it out would keep the old one
    router.setParams({ ...draftParams(next), hora: next.startsAt ?? '' });
  };

  if (!service)
    return (
      <Frame>
        <EmptyState
          title="Serviço não encontrado"
          body="Ele não está mais disponível. Escolha outro serviço."
          action={
            <LinkButton
              href={`/barbeiro/${barber.id}`}
              label="Ver serviços"
              variant="secondary"
              replace
            />
          }
        />
      </Frame>
    );

  const confirm = async () => {
    if (!chosen) return;
    if (!signedIn) {
      const here = `/agendar?${new URLSearchParams(draftParams({ ...draft, startsAt: chosen }))}`;
      router.push(returnPathWith('/entrar', here) as Href);
      return;
    }
    try {
      const appointment = await book.mutateAsync({
        barberId: barber.id,
        serviceId: service.id,
        startsAt: chosen,
        reminderLeadMinutes: draft.reminder,
      });
      router.replace(`/agendamento/${appointment.id}?novo=1` as Href);
    } catch (failure) {
      const code = isApiError(failure) ? failure.code : undefined;
      setError(messageFor(code));
      if (code && SLOT_GONE.has(code)) {
        router.setParams({ hora: '' });
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
            {chosen
              ? `${formatShortDateTime(chosen, timeZone)} · ${formatBRL(service.priceCents)}`
              : 'Escolha um horário'}
          </Text>
          <Button
            label={signedIn ? 'Confirmar agendamento' : 'Entrar para agendar'}
            disabled={!chosen}
            loading={book.isPending}
            onPress={() => void confirm()}
          />
        </>
      }
    >
      <Stack.Screen options={{ title: 'Agendar' }} />
      <ServiceSummary barber={barber} service={service} />

      <View style={styles.section}>
        <Text variant="heading">Dia</Text>
        <DateStrip
          dates={dates}
          value={draft.date}
          onChange={(date) => update({ date, startsAt: null })}
        />
        <Text variant="muted">{formatLongDate(draft.date)}</Text>
      </View>

      <View style={styles.section}>
        <Text variant="heading">Horário</Text>
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
            value={chosen}
            onChange={(startsAt) => update({ startsAt })}
          />
        )}
      </View>

      <View style={styles.section}>
        <Text variant="heading">Lembrete</Text>
        <ReminderPicker value={draft.reminder} onChange={(reminder) => update({ reminder })} />
      </View>
    </Screen>
  );
}

function ServiceSummary({ barber, service }: { barber: Barber; service: Service }) {
  return (
    <View style={styles.summary}>
      <View style={styles.summaryText}>
        <Text variant="heading">{service.name}</Text>
        <Text variant="muted">
          {barber.name} · {barber.barbershop.name}
        </Text>
      </View>
      <View style={styles.price}>
        <Text variant="numeral" style={{ color: colors.accent }}>
          {formatBRL(service.priceCents)}
        </Text>
        <Text variant="muted">{formatDuration(service.durationMinutes)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: space.md },
  center: { textAlign: 'center' },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: hairline,
    borderColor: colors.line,
    backgroundColor: colors.bar,
  },
  summaryText: { flex: 1, gap: 2 },
  price: { alignItems: 'flex-end' },
});
