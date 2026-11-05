import { useState } from 'react';
import { View } from 'react-native';
import { SignedOut } from '@/features/auth/components/signed-out';
import { useIsSignedIn } from '@/features/auth/hooks/use-auth';
import { LinkButton } from '@/shared/ui/button';
import { Screen } from '@/shared/ui/screen';
import { Segmented } from '@/shared/ui/segmented';
import { EmptyState, ErrorState, LoadingState } from '@/shared/ui/states';
import { Text } from '@/shared/ui/text';
import { AppointmentRow } from '../components/appointment-row';
import { useMyAppointments } from '../hooks/use-appointments';

type View_ = 'upcoming' | 'past';
const VIEWS = [
  { value: 'upcoming', label: 'Próximos' },
  { value: 'past', label: 'Anteriores' },
] as const;

export function AppointmentsScreen() {
  const signedIn = useIsSignedIn();
  if (!signedIn)
    return (
      <Screen edges={['top', 'left', 'right']}>
        <Text variant="title">Agendamentos</Text>
        <SignedOut
          title="Entre para ver seus agendamentos"
          body="Seus horários marcados aparecem aqui, com a opção de cancelar ou remarcar."
          back="/agendamentos"
        />
      </Screen>
    );
  return <Appointments />;
}

function Appointments() {
  const [view, setView] = useState<View_>('upcoming');
  const list = useMyAppointments(view === 'upcoming');

  return (
    <Screen
      edges={['top', 'left', 'right']}
      refreshing={list.isRefetching}
      onRefresh={() => void list.refetch()}
    >
      <Text variant="title">Agendamentos</Text>
      <Segmented options={VIEWS} value={view} onChange={setView} />
      {list.isPending ? (
        <LoadingState />
      ) : list.isError ? (
        <ErrorState error={list.error} onRetry={() => void list.refetch()} />
      ) : list.data.length === 0 ? (
        view === 'upcoming' ? (
          <EmptyState
            title="Nenhum agendamento marcado"
            body="Escolha uma barbearia e marque seu próximo corte."
            action={<LinkButton href="/" label="Explorar barbearias" />}
          />
        ) : (
          <EmptyState
            title="Nada por aqui ainda"
            body="Seus agendamentos passados aparecem aqui."
          />
        )
      ) : (
        <View>
          {list.data.map((appointment) => (
            <AppointmentRow key={appointment.id} appointment={appointment} />
          ))}
        </View>
      )}
    </Screen>
  );
}
