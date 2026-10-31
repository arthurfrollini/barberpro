import { useId, useState } from 'react';
import { toast } from 'sonner';
import { isApiError } from '@/shared/api';
import { messageFor } from '@/shared/lib/error-messages';
import { formatShortDateTime, formatTime, isIsoDate, localDateOf } from '@/shared/lib/time';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { FormError } from '@/shared/ui/form-field';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Skeleton } from '@/shared/ui/skeleton';
import type { AgendaAppointment } from '../api/agenda';
import { useRescheduleAppointment, useRescheduleSlots } from '../hooks/use-agenda';

/** Pick a date, then one of the free times the API offers for this appointment's length. */
export function ReschedulePicker({
  appointment,
  timeZone,
  onDone,
}: {
  appointment: AgendaAppointment;
  timeZone: string;
  onDone: () => void;
}) {
  const dateId = useId();
  const [date, setDate] = useState(() => localDateOf(appointment.startsAt, timeZone));
  const [chosen, setChosen] = useState<string | null>(null);
  const slots = useRescheduleSlots(appointment.id, isIsoDate(date) ? date : null);
  const move = useRescheduleAppointment();
  const offered = (slots.data ?? []).filter((s) => s !== appointment.startsAt);

  const confirm = () => {
    if (!chosen) return;
    move.mutate(
      { id: appointment.id, startsAt: chosen },
      {
        onSuccess: (moved) => {
          toast.success(
            `Agendamento remarcado para ${formatShortDateTime(moved.startsAt, timeZone)}`,
          );
          onDone();
        },
      },
    );
  };

  return (
    <section aria-label="Remarcar" className="flex flex-col gap-4 rounded-lg border p-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor={dateId}>Nova data</Label>
        <Input
          id={dateId}
          type="date"
          value={date}
          onChange={(event) => {
            setDate(event.target.value);
            setChosen(null);
          }}
        />
      </div>

      {slots.isError ? (
        <FormError message={messageFor(isApiError(slots.error) ? slots.error.code : undefined)} />
      ) : slots.isPending && isIsoDate(date) ? (
        <div className="grid grid-cols-4 gap-2" aria-busy="true">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-9" />
          ))}
        </div>
      ) : offered.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum horário livre neste dia.</p>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {offered.map((slot) => (
            <Button
              key={slot}
              type="button"
              size="sm"
              variant="outline"
              aria-pressed={chosen === slot}
              onClick={() => setChosen(slot)}
              className={cn(
                'tabular-nums',
                chosen === slot &&
                  'border-primary bg-primary text-primary-foreground hover:bg-primary/90',
              )}
            >
              {formatTime(slot, timeZone)}
            </Button>
          ))}
        </div>
      )}

      {move.isError && (
        <FormError message={messageFor(isApiError(move.error) ? move.error.code : undefined)} />
      )}
      <Button onClick={confirm} disabled={!chosen || move.isPending}>
        Confirmar novo horário
      </Button>
    </section>
  );
}
