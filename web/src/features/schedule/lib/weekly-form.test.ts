import { describe, expect, it } from 'vitest';
import { fromForm, toForm, weekSchema, type WeekForm } from './weekly-form';

const weekly = [
  { weekday: 1, startTime: '10:00', endTime: '12:00' },
  { weekday: 1, startTime: '14:00', endTime: '22:00' },
  { weekday: 2, startTime: '09:00', endTime: '18:00' },
];

const messages = (form: WeekForm) => {
  const result = weekSchema.safeParse(form);
  return result.success ? [] : result.error.issues.map((i) => i.message);
};

const withMonday = (intervals: { start: string; end: string }[]): WeekForm => {
  const form = toForm([]);
  form.days[0] = { weekday: 1, working: true, intervals };
  return form;
};

describe('weekly form', () => {
  it('lists the week Monday first, with days off', () => {
    const form = toForm(weekly);
    expect(form.days.map((d) => d.weekday)).toEqual([1, 2, 3, 4, 5, 6, 0]);
    expect(form.days[0]).toEqual({
      weekday: 1,
      working: true,
      intervals: [
        { start: '10:00', end: '12:00' },
        { start: '14:00', end: '22:00' },
      ],
    });
    expect(form.days[2]).toEqual({ weekday: 3, working: false, intervals: [] });
  });

  it('goes back to what the API takes, leaving out days off', () => {
    const form = toForm(weekly);
    form.days[1]!.working = false;
    expect(fromForm(form)).toEqual([
      { weekday: 1, startTime: '10:00', endTime: '12:00' },
      { weekday: 1, startTime: '14:00', endTime: '22:00' },
    ]);
  });

  it('accepts times up to 24:00', () => {
    expect(messages(withMonday([{ start: '18:00', end: '24:00' }]))).toEqual([]);
  });

  it('explains what is wrong with a time', () => {
    expect(messages(withMonday([{ start: '9:00', end: '12:00' }]))).toEqual([
      'Use o formato 09:00',
    ]);
    expect(messages(withMonday([{ start: '09:03', end: '12:00' }]))).toEqual([
      'Use minutos de 5 em 5',
    ]);
    expect(messages(withMonday([{ start: '12:00', end: '11:00' }]))).toEqual([
      'O fim vem depois do início',
    ]);
  });

  it('names the day whose intervals overlap', () => {
    expect(
      messages(
        withMonday([
          { start: '09:00', end: '12:00' },
          { start: '11:30', end: '18:00' },
        ]),
      ),
    ).toEqual(['Os intervalos de segunda se sobrepõem']);
  });

  it('ignores the hours of a day off', () => {
    const form = withMonday([{ start: 'xx', end: '' }]);
    form.days[0]!.working = false;
    expect(messages(form)).toEqual([]);
  });
});
