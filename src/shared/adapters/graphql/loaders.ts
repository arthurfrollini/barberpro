import DataLoader from 'dataloader';
import type { Container } from '../../../container.js';
import { createShopsLoaders } from '../../../modules/shops/adapters/graphql/loaders.js';
import type { Appointment } from '../../../modules/scheduling/domain/appointment.js';

/** Every DataLoader a request may use, created fresh per request. */
export function createLoaders(container: Pick<Container, 'shops' | 'identity' | 'scheduling'>) {
  return {
    ...createShopsLoaders(container.shops, container.identity.users),
    appointmentById: new DataLoader<string, Appointment | null>(async (ids) => {
      const found = new Map(
        (await container.scheduling.appointments.findByIds(ids)).map((a) => [a.id, a]),
      );
      return ids.map((id) => found.get(id) ?? null);
    }),
  };
}

export type Loaders = ReturnType<typeof createLoaders>;
