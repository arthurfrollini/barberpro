import { useMutation } from '@tanstack/react-query';
import { useSetMe } from '@/features/auth/hooks/use-auth';
import { useApi } from '@/shared/api';
import { updateProfile } from '../api/account';

export function useUpdateName() {
  const api = useApi();
  const setMe = useSetMe();
  return useMutation({
    mutationFn: (name: string) => updateProfile(api, name),
    onSuccess: setMe,
  });
}
