import { graphql } from '@/gql';
import type { WeeklyIntervalInput } from '@/gql/graphql';
import { api } from '@/shared/api';

const MyScheduleQuery = graphql(`
  query MySchedule {
    mySchedule {
      weekly {
        weekday
        startTime
        endTime
      }
      blockedDates
    }
  }
`);

const SetWeeklyMutation = graphql(`
  mutation SetWeeklySchedule($intervals: [WeeklyIntervalInput!]!) {
    setWeeklySchedule(intervals: $intervals) {
      weekly {
        weekday
        startTime
        endTime
      }
      canceledAppointments {
        ...AgendaAppointment
      }
    }
  }
`);

const BlockDateMutation = graphql(`
  mutation BlockDate($date: String!) {
    blockDate(date: $date) {
      ...AgendaAppointment
    }
  }
`);

const UnblockDateMutation = graphql(`
  mutation UnblockDate($date: String!) {
    unblockDate(date: $date)
  }
`);

export const fetchMySchedule = async () => (await api.request(MyScheduleQuery)).mySchedule;

export const setWeeklySchedule = async (intervals: WeeklyIntervalInput[]) =>
  (await api.request(SetWeeklyMutation, { intervals })).setWeeklySchedule;

export const blockDate = async (date: string) =>
  (await api.request(BlockDateMutation, { date })).blockDate;

export const unblockDate = async (date: string) => {
  await api.request(UnblockDateMutation, { date });
};

export type MySchedule = Awaited<ReturnType<typeof fetchMySchedule>>;
