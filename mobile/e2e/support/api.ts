// Direct GraphQL calls to set up what a test is not about: a shop with a barber, hours and a
// service, or something the barber does on their side.

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

export const PASSWORD = 'correct horse battery';

/** A fresh email per test, so tests share the database without cleaning it. */
export const uniqueEmail = (label: string) =>
  `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

export async function signUp(api: Api, name: string, email = uniqueEmail('user')) {
  const data = await call<{ signUp: { accessToken: string } }>(
    api,
    'mutation ($input: SignUpInput!) { signUp(input: $input) { accessToken } }',
    { input: { name, email, password: PASSWORD } },
  );
  return data.signUp.accessToken;
}

/** A shop on Av. Paulista with one barber open 08:00 to 20:00 every day, and one service. */
export async function setUpShop(api: Api, shopName: string, barberName = 'Marcos Lima') {
  const token = await signUp(api, barberName);
  const { createBarbershop } = await call<{ createBarbershop: { id: string } }>(
    api,
    'mutation ($input: CreateBarbershopInput!) { createBarbershop(input: $input) { id } }',
    {
      input: {
        name: shopName,
        description: 'Cortes clássicos e barba na navalha.',
        foundedYear: 2012,
        address: 'Av. Paulista, 1000, São Paulo',
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
  await call(
    api,
    'mutation ($barberId: ID!, $intervals: [WeeklyIntervalInput!]!) { setWeeklySchedule(barberId: $barberId, intervals: $intervals) { weekly { weekday } } }',
    {
      barberId: becomeBarber.id,
      intervals: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
        weekday,
        startTime: '08:00',
        endTime: '20:00',
      })),
    },
    token,
  );
  const { createService } = await call<{ createService: { id: string } }>(
    api,
    'mutation ($barberId: ID!, $input: CreateServiceInput!) { createService(barberId: $barberId, input: $input) { id } }',
    { barberId: becomeBarber.id, input: { name: 'Corte', priceCents: 5000, durationMinutes: 30 } },
    token,
  );
  return {
    barberToken: token,
    shopId: createBarbershop.id,
    barberId: becomeBarber.id,
    serviceId: createService.id,
  };
}

/** The barber's own view of a day, to find the appointment the customer booked in the app. */
export async function barberAgenda(api: Api, token: string, barberId: string, date: string) {
  const data = await call<{ barberAgenda: { id: string; status: string; startsAt: string }[] }>(
    api,
    'query ($barberId: ID!, $date: String!) { barberAgenda(barberId: $barberId, date: $date) { id status startsAt } }',
    { barberId, date },
    token,
  );
  return data.barberAgenda;
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

export async function book(
  api: Api,
  customerToken: string,
  input: { barberId: string; serviceId: string; startsAt: string },
) {
  const { bookAppointment } = await call<{ bookAppointment: { id: string } }>(
    api,
    'mutation ($input: BookAppointmentInput!) { bookAppointment(input: $input) { id } }',
    {
      input: {
        barberId: input.barberId,
        serviceId: input.serviceId,
        startsAt: input.startsAt,
        reminderLeadMinutes: 30,
      },
    },
    customerToken,
  );
  return bookAppointment.id;
}
