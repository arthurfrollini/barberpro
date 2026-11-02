import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { WeeklyIntervalInput } from '@/gql/graphql';
import {
  blockDate,
  fetchMySchedule,
  setWeeklySchedule,
  unblockDate,
  type MySchedule,
} from '../api/schedule';

/** Hours and days off belong to one barber profile, so each profile has its own entry. */
export const scheduleKey = (barberId: string) => ['schedule', barberId] as const;

export function useMySchedule(barberId: string) {
  return useQuery({ queryKey: scheduleKey(barberId), queryFn: () => fetchMySchedule(barberId) });
}

/** Hours and days off reshape the agenda and may cancel bookings: both caches refresh. */
function useScheduleMutation<V, R>(
  barberId: string,
  mutationFn: (barberId: string, variables: V) => Promise<R>,
  update: (schedule: MySchedule, variables: V, result: R) => MySchedule,
) {
  const queryClient = useQueryClient();
  const key = scheduleKey(barberId);
  return useMutation({
    mutationFn: (variables: V) => mutationFn(barberId, variables),
    onSuccess: (result, variables) => {
      queryClient.setQueryData<MySchedule>(key, (current) =>
        current ? update(current, variables, result) : current,
      );
      void queryClient.invalidateQueries({ queryKey: key });
      void queryClient.invalidateQueries({ queryKey: ['agenda'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export const useSetWeeklySchedule = (barberId: string) =>
  useScheduleMutation<WeeklyIntervalInput[], Awaited<ReturnType<typeof setWeeklySchedule>>>(
    barberId,
    setWeeklySchedule,
    (schedule, _intervals, result) => ({ ...schedule, weekly: result.weekly }),
  );

export const useBlockDate = (barberId: string) =>
  useScheduleMutation(barberId, blockDate, (schedule, date: string) => ({
    ...schedule,
    blockedDates: [...new Set([...schedule.blockedDates, date])].sort(),
  }));

export const useUnblockDate = (barberId: string) =>
  useScheduleMutation(barberId, unblockDate, (schedule, date: string) => ({
    ...schedule,
    blockedDates: schedule.blockedDates.filter((d) => d !== date),
  }));
