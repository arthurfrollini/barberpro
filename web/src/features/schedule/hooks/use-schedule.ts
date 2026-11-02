import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  blockDate,
  fetchMySchedule,
  setWeeklySchedule,
  unblockDate,
  type MySchedule,
} from '../api/schedule';

export const scheduleKey = ['schedule'] as const;

export function useMySchedule() {
  return useQuery({ queryKey: scheduleKey, queryFn: fetchMySchedule });
}

/** Hours and days off reshape the agenda and may cancel bookings: both caches refresh. */
function useScheduleMutation<V, R>(
  mutationFn: (variables: V) => Promise<R>,
  update: (schedule: MySchedule, variables: V, result: R) => MySchedule,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (result, variables) => {
      queryClient.setQueryData<MySchedule>(scheduleKey, (current) =>
        current ? update(current, variables, result) : current,
      );
      void queryClient.invalidateQueries({ queryKey: scheduleKey });
      void queryClient.invalidateQueries({ queryKey: ['agenda'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export const useSetWeeklySchedule = () =>
  useScheduleMutation(setWeeklySchedule, (schedule, _intervals, result) => ({
    ...schedule,
    weekly: result.weekly,
  }));

export const useBlockDate = () =>
  useScheduleMutation(blockDate, (schedule, date) => ({
    ...schedule,
    blockedDates: [...new Set([...schedule.blockedDates, date])].sort(),
  }));

export const useUnblockDate = () =>
  useScheduleMutation(unblockDate, (schedule, date) => ({
    ...schedule,
    blockedDates: schedule.blockedDates.filter((d) => d !== date),
  }));
