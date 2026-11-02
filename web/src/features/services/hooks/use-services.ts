import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  archiveService,
  createService,
  fetchMyServices,
  updateService,
  type Service,
} from '../api/services';

/** Services belong to one barber profile; each profile has its own list. */
export const servicesKey = (barberId: string) => ['services', barberId] as const;

export function useMyServices(barberId: string) {
  return useQuery({ queryKey: servicesKey(barberId), queryFn: () => fetchMyServices(barberId) });
}

function useServiceMutation<V>(
  barberId: string,
  mutationFn: (variables: V) => Promise<Service>,
  apply: (list: Service[], result: Service) => Service[],
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (result) => {
      queryClient.setQueryData<Service[]>(servicesKey(barberId), (list) =>
        list ? apply(list, result) : list,
      );
      void queryClient.invalidateQueries({ queryKey: servicesKey(barberId) });
    },
  });
}

export const useCreateService = (barberId: string) =>
  useServiceMutation(
    barberId,
    (input: Parameters<typeof createService>[0]['input']) => createService({ barberId, input }),
    (list, created) => [...list, created],
  );

export const useUpdateService = (barberId: string) =>
  useServiceMutation(barberId, updateService, (list, updated) =>
    list.map((s) => (s.id === updated.id ? updated : s)),
  );

export const useArchiveService = (barberId: string) =>
  useServiceMutation(barberId, archiveService, (list, archived) =>
    list.filter((s) => s.id !== archived.id),
  );
