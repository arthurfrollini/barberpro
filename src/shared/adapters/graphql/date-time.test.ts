import { Kind } from 'graphql';
import { describe, expect, it } from 'vitest';
import { DateTimeScalar } from './date-time.js';

describe('DateTime scalar', () => {
  it('accepts ISO instants with Z or an offset', () => {
    expect(DateTimeScalar.parseValue('2026-11-02T13:30:00Z')).toEqual(
      new Date('2026-11-02T13:30:00Z'),
    );
    expect(DateTimeScalar.parseValue('2026-11-02T10:30:00-03:00')).toEqual(
      new Date('2026-11-02T13:30:00Z'),
    );
    expect(
      DateTimeScalar.parseLiteral(
        { kind: Kind.STRING, value: '2026-11-02T13:30:00.000Z' },
        undefined,
      ),
    ).toEqual(new Date('2026-11-02T13:30:00Z'));
  });

  it.each(['2026-11-02T10:30:00', '2026-11-02', 'tomorrow', 'Mon Nov 02 2026'])(
    'rejects %j, which has no zone or is not ISO',
    (value) => {
      expect(() => DateTimeScalar.parseValue(value)).toThrow(/ISO 8601/);
    },
  );
});
