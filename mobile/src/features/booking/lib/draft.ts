// The booking in progress lives in the route's params, not in component state: it survives
// the trip through sign in (the return path carries it) and a reload on web.

export const REMINDER_OPTIONS = [
  { value: null, param: 'sem', label: 'Sem lembrete' },
  { value: 15, param: '15', label: '15 min' },
  { value: 30, param: '30', label: '30 min' },
  { value: 60, param: '60', label: '1 h' },
] as const;

export type Reminder = (typeof REMINDER_OPTIONS)[number]['value'];

export const DEFAULT_REMINDER: Reminder = 30;

export type Draft = {
  barberId: string;
  serviceId: string;
  date: string;
  startsAt: string | null;
  reminder: Reminder;
};

type Params = Record<string, string | string[] | undefined>;

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** `dates` are the bookable days; the first one is the shop's today. */
export function readDraft(params: Params, dates: string[]): Draft {
  const day = one(params.dia);
  const hora = one(params.hora);
  const lembrete = one(params.lembrete);
  const reminder = REMINDER_OPTIONS.find((o) => o.param === lembrete)?.value;
  return {
    barberId: one(params.barbeiro) ?? '',
    serviceId: one(params.servico) ?? '',
    date: day && dates.includes(day) ? day : dates[0]!,
    startsAt: hora && !Number.isNaN(Date.parse(hora)) ? hora : null,
    reminder: reminder === undefined ? DEFAULT_REMINDER : reminder,
  };
}

/** The params that describe a draft, for `setParams` and for the sign-in return path. */
export function draftParams(draft: Draft): Record<string, string> {
  return {
    barbeiro: draft.barberId,
    servico: draft.serviceId,
    dia: draft.date,
    ...(draft.startsAt ? { hora: draft.startsAt } : {}),
    lembrete: REMINDER_OPTIONS.find((o) => o.value === draft.reminder)!.param,
  };
}
