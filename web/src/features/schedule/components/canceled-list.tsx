import { formatShortDateTime } from '@/shared/lib/time';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import type { AgendaAppointment } from '@/features/agenda/api/agenda';

/** What a change to the hours or a blocked day canceled; the customers were told by email. */
export function CanceledDialog({
  appointments,
  timeZone,
  reason,
  onClose,
}: {
  appointments: AgendaAppointment[];
  timeZone: string;
  /** Why they were canceled, in one sentence. */
  reason: string;
  onClose: () => void;
}) {
  const count = appointments.length;
  return (
    <Dialog open={count > 0} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {count === 1 ? '1 agendamento cancelado' : `${count} agendamentos cancelados`}
          </DialogTitle>
          <DialogDescription>
            {reason} Os clientes foram avisados por email e no app.
          </DialogDescription>
        </DialogHeader>
        <ul className="flex flex-col gap-2 text-sm">
          {appointments.map((a) => (
            <li key={a.id}>
              {a.customer.name}, {a.serviceName}, {formatShortDateTime(a.startsAt, timeZone)}
            </li>
          ))}
        </ul>
        <DialogFooter>
          <Button onClick={onClose}>Entendi</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
