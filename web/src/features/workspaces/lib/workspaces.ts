// A workspace is one shop as the signed-in user sees it: the shop, whether they own it, and
// their barber profile there (services, hours and agenda live on that profile).

export type ShopSummary = { id: string; name: string; timezone: string; logoUrl?: string | null };
export type BarberProfile = {
  id: string;
  name: string;
  bio: string;
  avatarUrl?: string | null;
};
export type Workspace = { shop: ShopSummary; owner: boolean; barber: BarberProfile | null };

type Source = {
  myBarbershops: ShopSummary[];
  myBarberProfiles: (BarberProfile & { barbershop: ShopSummary })[];
};

/** One entry per shop the user owns or barbers in, by shop name. */
export function buildWorkspaces({ myBarbershops, myBarberProfiles }: Source): Workspace[] {
  const byShop = new Map<string, Workspace>();
  for (const shop of myBarbershops) byShop.set(shop.id, { shop, owner: true, barber: null });
  for (const { barbershop, ...barber } of myBarberProfiles) {
    const existing = byShop.get(barbershop.id);
    byShop.set(barbershop.id, {
      shop: existing?.shop ?? barbershop,
      owner: existing?.owner ?? false,
      barber,
    });
  }
  return [...byShop.values()].sort((a, b) => a.shop.name.localeCompare(b.shop.name, 'pt-BR'));
}

/**
 * The shop the user chose, while it is still theirs; otherwise the first where they barber
 * (their agenda is the most used screen), then the first they own.
 */
export function pickActive(workspaces: Workspace[], chosenShopId: string | null): Workspace | null {
  return (
    workspaces.find((w) => w.shop.id === chosenShopId) ??
    workspaces.find((w) => w.barber) ??
    workspaces[0] ??
    null
  );
}

/** Barbers start on their agenda, owners on their shop, everyone else on the way in. */
export function landingPath(workspace: Workspace | null): string {
  if (workspace?.barber) return '/agenda';
  if (workspace?.owner) return '/barbearia';
  return '/comecar';
}

/** "Dono e barbeiro", for the switcher. */
export function roleLabel(workspace: Workspace): string {
  if (workspace.owner && workspace.barber) return 'Dono e barbeiro';
  return workspace.owner ? 'Dono' : 'Barbeiro';
}
