// Shapes the API returns, with defaults a test can override.

export const shopSummary = (over: Partial<ShopSummary> = {}): ShopSummary => ({
  id: 'shop-1',
  name: 'Navalha de Ouro',
  address: 'Av. Paulista, 1000',
  logoUrl: null,
  ...over,
});
type ShopSummary = { id: string; name: string; address: string; logoUrl: string | null };

export const barberSummary = (over: Partial<BarberSummary> = {}): BarberSummary => ({
  id: 'barber-1',
  name: 'Marcos Lima',
  bio: 'Degradê e barba desde 2010.',
  avatarUrl: null,
  ...over,
});
type BarberSummary = { id: string; name: string; bio: string; avatarUrl: string | null };

export const shop = (over: Record<string, unknown> = {}) => ({
  ...shopSummary(),
  description: 'Barbearia clássica no coração da Paulista.',
  yearsActive: 12,
  latitude: -23.5614,
  longitude: -46.6559,
  timezone: 'America/Sao_Paulo',
  barbers: [barberSummary()],
  ...over,
});

export const service = (over: Record<string, unknown> = {}) => ({
  id: 'service-1',
  name: 'Corte',
  description: 'Tesoura e máquina.',
  priceCents: 5000,
  durationMinutes: 30,
  ...over,
});

export const barber = (over: Record<string, unknown> = {}) => ({
  ...barberSummary(),
  barbershop: {
    id: 'shop-1',
    name: 'Navalha de Ouro',
    address: 'Av. Paulista, 1000',
    timezone: 'America/Sao_Paulo',
  },
  services: [service(), service({ id: 'service-2', name: 'Barba', priceCents: 3500 })],
  ...over,
});

const HOUR = 3_600_000;

/** An appointment `hoursAhead` from now (negative for the past), as myAppointments returns it. */
export const appointment = (over: Record<string, unknown> = {}, hoursAhead = 72) => {
  const startsAt = new Date(Math.floor((Date.now() + hoursAhead * HOUR) / 60_000) * 60_000);
  return {
    id: 'appt-1',
    startsAt: startsAt.toISOString(),
    endsAt: new Date(startsAt.getTime() + 30 * 60_000).toISOString(),
    status: 'BOOKED',
    serviceName: 'Corte',
    priceCents: 5000,
    durationMinutes: 30,
    reminderLeadMinutes: 30,
    cancelReason: null,
    canceledAt: null,
    barber: {
      id: 'barber-1',
      name: 'Marcos Lima',
      avatarUrl: null,
      barbershop: {
        id: 'shop-1',
        name: 'Navalha de Ouro',
        address: 'Av. Paulista, 1000',
        timezone: 'America/Sao_Paulo',
        latitude: -23.5614,
        longitude: -46.6559,
      },
    },
    ...over,
  };
};
