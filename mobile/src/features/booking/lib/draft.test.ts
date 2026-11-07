import { readDraft, REMINDER_OPTIONS } from './draft';

describe('readDraft', () => {
  const dates = ['2026-11-05', '2026-11-06'];

  it('reads the chosen day, time and reminder from the route params', () => {
    expect(
      readDraft(
        {
          barbeiro: 'b1',
          servico: 's1',
          dia: '2026-11-06',
          hora: '2026-11-06T13:00:00.000Z',
          lembrete: '15',
        },
        dates,
      ),
    ).toEqual({
      barberId: 'b1',
      serviceId: 's1',
      date: '2026-11-06',
      startsAt: '2026-11-06T13:00:00.000Z',
      reminder: 15,
    });
  });

  it('falls back to today, no time and a 30-minute reminder', () => {
    expect(readDraft({ barbeiro: 'b1', servico: 's1' }, dates)).toMatchObject({
      date: '2026-11-05',
      startsAt: null,
      reminder: 30,
    });
  });

  it('ignores a day outside the horizon, a time on another day and an odd reminder', () => {
    expect(
      readDraft(
        { barbeiro: 'b1', servico: 's1', dia: '2027-05-01', hora: 'soon', lembrete: '7' },
        dates,
      ),
    ).toMatchObject({ date: '2026-11-05', startsAt: null, reminder: 30 });
  });

  it('reads "sem" as no reminder', () => {
    expect(
      readDraft({ barbeiro: 'b1', servico: 's1', lembrete: 'sem' }, dates).reminder,
    ).toBeNull();
    expect(REMINDER_OPTIONS.map((o) => o.label)).toEqual([
      'Sem lembrete',
      '15 min',
      '30 min',
      '1 h',
    ]);
  });
});
