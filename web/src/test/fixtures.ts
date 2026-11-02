// Shapes the API returns, for MSW handlers. Override what a test cares about.

export const SHOP = {
  id: 'shop-1',
  name: 'Mega Barbearia SP',
  timezone: 'America/Sao_Paulo',
  logoUrl: null,
};

export const BARBER = {
  id: 'barber-1',
  name: 'José',
  bio: 'Cortes clássicos.',
  avatarUrl: null as string | null,
  barbershop: SHOP,
};

export const ME = { id: 'user-1', name: 'José Silva', email: 'jose@example.com' };

/** The Workspaces query's answer for a user who barbers and/or owns SHOP. */
export const workspaces = ({
  barber = false,
  owner = false,
}: {
  barber?: boolean;
  owner?: boolean;
}) => ({
  myBarbershops: owner ? [SHOP] : [],
  myBarberProfiles: barber ? [BARBER] : [],
});
