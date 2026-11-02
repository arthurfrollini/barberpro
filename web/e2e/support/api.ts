// Direct GraphQL calls to set up data the test is not about (a shop, hours, a booking by a
// customer). Used by the Playwright tests and by scripts/seed-demo.ts.

export type Api = { url: string };

async function call<T = Record<string, unknown>>(
  api: Api,
  query: string,
  variables: Record<string, unknown> = {},
  token?: string,
): Promise<T> {
  const response = await fetch(`${api.url}/graphql`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = (await response.json()) as { data?: T; errors?: { message: string }[] };
  if (json.errors?.length) throw new Error(`${query.slice(0, 40)}…: ${json.errors[0]!.message}`);
  return json.data!;
}

export async function signUp(api: Api, name: string, email: string, password: string) {
  const data = await call<{ signUp: { accessToken: string; user: { id: string } } }>(
    api,
    'mutation ($input: SignUpInput!) { signUp(input: $input) { accessToken user { id } } }',
    { input: { name, email, password } },
  );
  return data.signUp.accessToken;
}

export async function createShop(api: Api, token: string, name: string) {
  const { createBarbershop } = await call<{ createBarbershop: { id: string } }>(
    api,
    `mutation ($input: CreateBarbershopInput!) { createBarbershop(input: $input) { id } }`,
    {
      input: {
        name,
        description: 'Cortes clássicos e barba na navalha.',
        foundedYear: 2012,
        address: 'Rua Augusta, 1500, São Paulo',
        latitude: -23.5614,
        longitude: -46.6559,
      },
    },
    token,
  );
  return createBarbershop.id;
}

export async function becomeBarber(api: Api, token: string, shopId: string) {
  const { becomeBarber } = await call<{ becomeBarber: { id: string } }>(
    api,
    'mutation ($shopId: ID!) { becomeBarber(shopId: $shopId) { id } }',
    { shopId },
    token,
  );
  return becomeBarber.id;
}

export async function availableSlots(
  api: Api,
  input: { barberId: string; serviceId: string; date: string },
) {
  const data = await call<{ availableSlots: string[] }>(
    api,
    'query ($barberId: ID!, $serviceId: ID!, $date: String!) { availableSlots(barberId: $barberId, serviceId: $serviceId, date: $date) }',
    input,
  );
  return data.availableSlots;
}

export async function myServiceIds(api: Api, barberId: string) {
  const data = await call<{ barber: { services: { id: string; name: string }[] } }>(
    api,
    'query ($barberId: ID!) { barber(id: $barberId) { services { id name } } }',
    { barberId },
  );
  return data.barber.services;
}

/** Invites `email` to one of the owner's shops; the code arrives by email (Mailpit). */
export async function invite(api: Api, ownerToken: string, shopId: string, email: string) {
  await call(
    api,
    'mutation ($shopId: ID!, $email: String!) { inviteBarber(shopId: $shopId, email: $email) { id } }',
    { shopId, email },
    ownerToken,
  );
}

export async function acceptInvite(api: Api, token: string, code: string) {
  const { acceptInvite } = await call<{ acceptInvite: { id: string } }>(
    api,
    'mutation ($code: String!) { acceptInvite(token: $code) { id } }',
    { code },
    token,
  );
  return acceptInvite.id;
}

/** An owner who barbers in their own shop, open `hours` every day, with one service. */
export async function setUpBarber(
  api: Api,
  token: string,
  options: {
    shopName: string;
    hours?: [string, string][];
    service?: { name: string; priceCents: number; durationMinutes: number };
  },
) {
  const { createBarbershop } = await call<{ createBarbershop: { id: string } }>(
    api,
    `mutation ($input: CreateBarbershopInput!) { createBarbershop(input: $input) { id } }`,
    {
      input: {
        name: options.shopName,
        description: 'Cortes clássicos e barba na navalha.',
        foundedYear: 2012,
        address: 'Rua Augusta, 1500, São Paulo',
        latitude: -23.5614,
        longitude: -46.6559,
      },
    },
    token,
  );
  const { becomeBarber } = await call<{ becomeBarber: { id: string } }>(
    api,
    'mutation ($shopId: ID!) { becomeBarber(shopId: $shopId) { id } }',
    { shopId: createBarbershop.id },
    token,
  );
  const hours = options.hours ?? [['08:00', '20:00']];
  await call(
    api,
    'mutation ($barberId: ID!, $intervals: [WeeklyIntervalInput!]!) { setWeeklySchedule(barberId: $barberId, intervals: $intervals) { weekly { weekday } } }',
    {
      barberId: becomeBarber.id,
      intervals: [0, 1, 2, 3, 4, 5, 6].flatMap((weekday) =>
        hours.map(([startTime, endTime]) => ({ weekday, startTime, endTime })),
      ),
    },
    token,
  );
  const service = options.service ?? { name: 'Corte', priceCents: 5000, durationMinutes: 30 };
  const { createService } = await call<{ createService: { id: string } }>(
    api,
    'mutation ($barberId: ID!, $input: CreateServiceInput!) { createService(barberId: $barberId, input: $input) { id } }',
    { barberId: becomeBarber.id, input: service },
    token,
  );
  return { shopId: createBarbershop.id, barberId: becomeBarber.id, serviceId: createService.id };
}

export async function addService(
  api: Api,
  token: string,
  barberId: string,
  service: { name: string; priceCents: number; durationMinutes: number },
) {
  const { createService } = await call<{ createService: { id: string } }>(
    api,
    'mutation ($barberId: ID!, $input: CreateServiceInput!) { createService(barberId: $barberId, input: $input) { id } }',
    { barberId, input: service },
    token,
  );
  return createService.id;
}

export async function book(
  api: Api,
  customerToken: string,
  input: { barberId: string; serviceId: string; startsAt: string },
) {
  const { bookAppointment } = await call<{ bookAppointment: { id: string } }>(
    api,
    'mutation ($input: BookAppointmentInput!) { bookAppointment(input: $input) { id } }',
    {
      // only the booking's own fields: callers often spread a whole setUpBarber() result
      input: {
        barberId: input.barberId,
        serviceId: input.serviceId,
        startsAt: input.startsAt,
        reminderLeadMinutes: 15,
      },
    },
    customerToken,
  );
  return bookAppointment.id;
}

export async function setHours(
  api: Api,
  token: string,
  barberId: string,
  hours: [string, string][] = [['08:00', '20:00']],
) {
  await call(
    api,
    'mutation ($barberId: ID!, $intervals: [WeeklyIntervalInput!]!) { setWeeklySchedule(barberId: $barberId, intervals: $intervals) { weekly { weekday } } }',
    {
      barberId,
      intervals: [0, 1, 2, 3, 4, 5, 6].flatMap((weekday) =>
        hours.map(([startTime, endTime]) => ({ weekday, startTime, endTime })),
      ),
    },
    token,
  );
}

/** Books and returns the error code instead of throwing, for refusals the test expects. */
export async function tryBook(
  api: Api,
  customerToken: string,
  input: { barberId: string; serviceId: string; startsAt: string },
): Promise<string | null> {
  try {
    await book(api, customerToken, input);
    return null;
  } catch (error) {
    return (error as Error).message;
  }
}

export async function cancel(api: Api, token: string, id: string) {
  await call(api, 'mutation ($id: ID!) { cancelAppointment(id: $id) { id } }', { id }, token);
}

/** "YYYY-MM-DD" in São Paulo, `days` from today. */
export function localDate(days: number): string {
  const date = new Date(Date.now() + days * 86_400_000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(date);
}

/** An instant at a São Paulo wall-clock time (UTC-3, no daylight saving since 2019). */
export const at = (date: string, time: string) => `${date}T${time}:00-03:00`;
