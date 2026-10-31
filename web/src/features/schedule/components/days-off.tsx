import { useId, useState } from 'react';
import { toast } from 'sonner';
import type { AgendaAppointment } from '@/features/agenda/api/agenda';
import { isApiError } from '@/shared/api';
import { messageFor } from '@/shared/lib/error-messages';
import { formatLongDate, isIsoDate, todayIn } from '@/shared/lib/time';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog';
import { Button } from '@/shared/ui/button';
import { FormError } from '@/shared/ui/form-field';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { useNow } from '@/shared/hooks/use-now';
import type { MySchedule } from '../api/schedule';
import { useBlockDate, useUnblockDate } from '../hooks/use-schedule';
import { CanceledDialog } from './canceled-list';

const longDate = (date: string) => formatLongDate(date);
const capitalized = (date: string) => {
  const text = longDate(date);
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export function DaysOff({ schedule, timeZone }: { schedule: MySchedule; timeZone: string }) {
  const dateId = useId();
  const today = todayIn(timeZone, useNow());
  const [date, setDate] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [canceled, setCanceled] = useState<AgendaAppointment[]>([]);
  const block = useBlockDate();
  const unblock = useUnblockDate();
  const upcoming = schedule.blockedDates.filter((d) => d >= today).sort();
  const error = block.error ?? unblock.error;

  const confirmBlock = () =>
    block.mutate(date, {
      onSuccess: (result) => {
        toast.success(
          result.length === 0
            ? 'Dia bloqueado'
            : `Dia bloqueado. ${result.length === 1 ? '1 agendamento cancelado' : `${result.length} agendamentos cancelados`}`,
        );
        setCanceled(result);
        setDate('');
      },
    });

  return (
    <section aria-labelledby="days-off-title" className="flex flex-col gap-4">
      <h2 id="days-off-title" className="text-xl">
        Dias bloqueados
      </h2>
      <p className="max-w-prose text-sm text-muted-foreground">
        Um dia bloqueado fica fechado para novos agendamentos, mesmo que caia num dia de trabalho.
      </p>

      {upcoming.length === 0 ? (
        <p className="text-muted-foreground">Nenhum dia bloqueado.</p>
      ) : (
        <ul className="flex flex-col divide-y rounded-lg border">
          {upcoming.map((day) => (
            <li key={day} className="flex items-center justify-between gap-4 px-4 py-3">
              <span>{capitalized(day)}</span>
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Desbloquear ${longDate(day)}`}
                disabled={unblock.isPending}
                onClick={() =>
                  unblock.mutate(day, { onSuccess: () => toast.success('Dia desbloqueado') })
                }
              >
                Desbloquear
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor={dateId}>Dia</Label>
          <Input
            id={dateId}
            type="date"
            min={today}
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="w-auto"
          />
        </div>
        <Button
          variant="outline"
          disabled={!isIsoDate(date) || date < today || block.isPending}
          onClick={() => setConfirming(true)}
        >
          Bloquear dia
        </Button>
      </div>
      {error && <FormError message={messageFor(isApiError(error) ? error.code : undefined)} />}

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bloquear dia</AlertDialogTitle>
            <AlertDialogDescription>
              Bloquear {isIsoDate(date) ? longDate(date) : 'este dia'}? Agendamentos desse dia com 2
              horas ou mais de antecedência são cancelados e os clientes avisados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBlock}>Bloquear dia</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <CanceledDialog appointments={canceled} timeZone={timeZone} onClose={() => setCanceled([])} />
    </section>
  );
}
