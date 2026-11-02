// Fills the dev database with a barber and a few bookings, to look at the dashboard.
// Run with the API up: `npm run seed:demo` (API_URL defaults to http://localhost:4000).
import {
  addService,
  at,
  book,
  cancel,
  localDate,
  setUpBarber,
  signUp,
} from '../e2e/support/api.ts';

const api = { url: process.env.API_URL ?? 'http://localhost:4000' };
const PASSWORD = 'correct horse battery';
const stamp = Date.now().toString(36);

const barberEmail = `jose.${stamp}@example.com`;
const jose = await signUp(api, 'José Almeida', barberEmail, PASSWORD);
const { barberId, serviceId } = await setUpBarber(api, jose, {
  shopName: `Navalha de Ouro ${stamp}`,
  hours: [
    ['09:00', '12:00'],
    ['13:00', '19:00'],
  ],
});
const beard = await addService(api, jose, barberId, {
  name: 'Barba',
  priceCents: 3500,
  durationMinutes: 20,
});
const combo = await addService(api, jose, barberId, {
  name: 'Corte e barba',
  priceCents: 8000,
  durationMinutes: 60,
});

const customers = await Promise.all(
  ['Ana Souza', 'Bruno Lima', 'Carla Dias', 'Diego Rocha', 'Elisa Prado'].map((name, i) =>
    signUp(api, name, `customer${i}.${stamp}@example.com`, PASSWORD),
  ),
);

const today = localDate(0);
const tomorrow = localDate(1);
const plan: [number, string, string, string][] = [
  [0, today, '09:30', serviceId],
  [1, today, '11:00', combo],
  [2, today, '14:00', beard],
  [3, today, '16:30', serviceId],
  [4, tomorrow, '10:00', serviceId],
  [0, tomorrow, '15:00', combo],
];
const booked: string[] = [];
for (const [customer, date, time, service] of plan) {
  try {
    booked.push(
      await book(api, customers[customer]!, {
        barberId,
        serviceId: service,
        startsAt: at(date, time),
      }),
    );
  } catch (error) {
    console.warn(`skipped ${date} ${time}: ${(error as Error).message}`);
  }
}
if (booked[3]) await cancel(api, customers[3]!, booked[3]).catch(() => {});

console.log(`Barber: ${barberEmail} / ${PASSWORD}`);
