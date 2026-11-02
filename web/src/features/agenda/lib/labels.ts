import type { AgendaAppointment } from '../api/agenda';

export const CANCEL_REASONS: Record<NonNullable<AgendaAppointment['cancelReason']>, string> = {
  CUSTOMER: 'pelo cliente',
  BARBER: 'por você',
  DAY_BLOCKED: 'dia bloqueado',
  SCHEDULE_CHANGED: 'mudança no horário de trabalho',
  BARBER_REMOVED: 'saída da equipe',
};

export const appointmentsCount = (n: number) =>
  n === 0 ? 'Nenhum agendamento' : n === 1 ? '1 agendamento' : `${n} agendamentos`;

export const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
