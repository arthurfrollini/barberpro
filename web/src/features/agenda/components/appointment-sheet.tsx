import { useState } from 'react';
import { toast } from 'sonner';
import { isApiError } from '@/shared/api';
import { messageFor } from '@/shared/lib/error-messages';
import { formatBRL } from '@/shared/lib/money';
import { formatLongDate, formatTime, localDateOf } from '@/shared/lib/time';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/shared/ui/alert-dialog';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { FormError } from '@/shared/ui/form-field';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/shared/ui/sheet';
import type { AgendaAppointment } from '../api/agenda';
import { useCancelAppointment } from '../hooks/use-agenda';
import { CANCEL_REASONS, capitalize } from '../lib/labels';
import { canChange } from '../lib/rules';
import { ReschedulePicker } from './reschedule-picker';

export function AppointmentSheet({
  appointment,
  timeZone,
  now,
  onClose,
  returnFocus,
}: {
  appointment: AgendaAppointment | undefined;
  timeZone: string;
  now: Date;
  onClose: () => void;
  returnFocus?: () => void;
}) {
  return (
    <Sheet open={!!appointment} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        className="w-full overflow-y-auto sm:max-w-md"
        onCloseAutoFocus={(event) => {
          if (!returnFocus) return;
          event.preventDefault();
          returnFocus();
        }}
      >
        {appointment && (
          <Details appointment={appointment} timeZone={timeZone} now={now} onClose={onClose} />
        )}
      </SheetContent>
    </Sheet>
  );
}

function Details({
  appointment: a,
  timeZone,
  now,
  onClose,
}: {
  appointment: AgendaAppointment;
  timeZone: string;
  now: Date;
  onClose: () => void;
}) {
  const [moving, setMoving] = useState(false);
  const cancel = useCancelAppointment(timeZone);
  const start = formatTime(a.startsAt, timeZone);
  const range = `${start} às ${formatTime(a.endsAt, timeZone)}`;
  const booked = a.status === 'BOOKED';
  const changeable = booked && canChange(a.startsAt, now);

  const confirmCancel = () =>
    cancel.mutate(a.id, { onSuccess: () => toast.success('Agendamento cancelado') });

  return (
    <>
      <SheetHeader>
        <SheetTitle className="font-display text-2xl">{a.customer.name}</SheetTitle>
        <SheetDescription>
          {a.serviceName}, {range}
        </SheetDescription>
      </SheetHeader>

      <div className="flex flex-col gap-6 px-4 pb-6">
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
          <dt className="text-muted-foreground">Data</dt>
          <dd>{capitalize(formatLongDate(localDateOf(a.startsAt, timeZone)))}</dd>
          <dt className="text-muted-foreground">Horário</dt>
          <dd className="tabular-nums">{range}</dd>
          <dt className="text-muted-foreground">Serviço</dt>
          <dd>
            {a.serviceName}, {a.durationMinutes} min
          </dd>
          <dt className="text-muted-foreground">Valor</dt>
          <dd>{formatBRL(a.priceCents)}</dd>
          <dt className="text-muted-foreground">Lembrete</dt>
          <dd>{a.reminderLeadMinutes ? `${a.reminderLeadMinutes} min antes` : 'Sem lembrete'}</dd>
          <dt className="text-muted-foreground">Situação</dt>
          <dd>
            {booked ? (
              <Badge>Agendado</Badge>
            ) : (
              <span>
                <Badge variant="secondary">Cancelado</Badge>{' '}
                {a.cancelReason && (
                  <span className="text-muted-foreground">{CANCEL_REASONS[a.cancelReason]}</span>
                )}
              </span>
            )}
          </dd>
        </dl>

        {cancel.isError && (
          <FormError
            message={messageFor(isApiError(cancel.error) ? cancel.error.code : undefined)}
          />
        )}

        {booked && (
          <div className="flex flex-col gap-3">
            {!changeable && (
              <p className="text-sm text-muted-foreground">
                Faltam menos de 2 horas: não dá mais para cancelar ou remarcar.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={!changeable || cancel.isPending}>
                    Cancelar agendamento
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancelar agendamento</AlertDialogTitle>
                    <AlertDialogDescription>
                      Cancelar o agendamento de {a.customer.name} às {start}? O cliente recebe um
                      aviso.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Voltar</AlertDialogCancel>
                    <AlertDialogAction variant="destructive" onClick={confirmCancel}>
                      Cancelar agendamento
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button
                variant="outline"
                disabled={!changeable}
                aria-expanded={moving}
                onClick={() => setMoving((open) => !open)}
              >
                Remarcar
              </Button>
            </div>
            {moving && changeable && (
              <ReschedulePicker appointment={a} timeZone={timeZone} onDone={onClose} />
            )}
          </div>
        )}
      </div>
    </>
  );
}
