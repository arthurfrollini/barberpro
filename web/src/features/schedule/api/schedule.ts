import { graphql } from '@/gql';
import type { WeeklyIntervalInput } from '@/gql/graphql';
import { api } from '@/shared/api';

const MyScheduleQuery = graphql(`
  query MySchedule($barberId: ID!) {
    mySchedule(barberId: $barberId) {
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
  mutation SetWeeklySchedule($barberId: ID!, $intervals: [WeeklyIntervalInput!]!) {
    setWeeklySchedule(barberId: $barberId, intervals: $intervals) {
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
  mutation BlockDate($barberId: ID!, $date: String!) {
    blockDate(barberId: $barberId, date: $date) {
      ...AgendaAppointment
    }
  }
`);

const UnblockDateMutation = graphql(`
  mutation UnblockDate($barberId: ID!, $date: String!) {
    unblockDate(barberId: $barberId, date: $date)
  }
`);

export const fetchMySchedule = async (barberId: string) =>
  (await api.request(MyScheduleQuery, { barberId })).mySchedule;

export const setWeeklySchedule = async (barberId: string, intervals: WeeklyIntervalInput[]) =>
  (await api.request(SetWeeklyMutation, { barberId, intervals })).setWeeklySchedule;

export const blockDate = async (barberId: string, date: string) =>
  (await api.request(BlockDateMutation, { barberId, date })).blockDate;

export const unblockDate = async (barberId: string, date: string) => {
  await api.request(UnblockDateMutation, { barberId, date });
};

export type MySchedule = Awaited<ReturnType<typeof fetchMySchedule>>;
