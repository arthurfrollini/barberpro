import { canChange, cancelReasonLabel, reminderLabel } from './rules';

const now = Date.parse('2026-11-05T12:00:00.000Z');

describe('canChange', () => {
  it('allows changes up to 2 hours before the start', () => {
    expect(canChange('2026-11-05T14:00:00.000Z', now)).toBe(true);
    expect(canChange('2026-11-05T13:59:00.000Z', now)).toBe(false);
    expect(canChange('2026-11-05T11:00:00.000Z', now)).toBe(false);
  });
});

describe('labels', () => {
  it('explains who canceled and why', () => {
    expect(cancelReasonLabel('CUSTOMER')).toBe('Você cancelou.');
    expect(cancelReasonLabel('DAY_BLOCKED')).toBe('O barbeiro fechou a agenda neste dia.');
    expect(cancelReasonLabel(null)).toBe('');
  });

  it('describes the reminder', () => {
    expect(reminderLabel(null)).toBe('Sem lembrete');
    expect(reminderLabel(30)).toBe('30 min antes');
    expect(reminderLabel(60)).toBe('1 h antes');
  });
});
