import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  archiveService,
  createService,
  fetchMyServices,
  updateService,
  type Service,
} from '../api/services';

export const servicesKey = ['services'] as const;

export function useMyServices() {
  return useQuery({ queryKey: servicesKey, queryFn: fetchMyServices });
}

function useServiceMutation<V>(
  mutationFn: (variables: V) => Promise<Service>,
  apply: (list: Service[], result: Service) => Service[],
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (result) => {
      queryClient.setQueryData<Service[]>(servicesKey, (list) =>
        list ? apply(list, result) : list,
      );
      void queryClient.invalidateQueries({ queryKey: servicesKey });
    },
  });
}

export const useCreateService = () =>
  useServiceMutation(createService, (list, created) => [...list, created]);

export const useUpdateService = () =>
  useServiceMutation(updateService, (list, updated) =>
    list.map((s) => (s.id === updated.id ? updated : s)),
  );

export const useArchiveService = () =>
  useServiceMutation(archiveService, (list, archived) => list.filter((s) => s.id !== archived.id));
