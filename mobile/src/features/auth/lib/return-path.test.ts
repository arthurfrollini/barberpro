import { returnPathWith, safeReturnPath } from './return-path';

describe('safeReturnPath', () => {
  it.each([
    ['/agendar?barbeiro=b1&servico=s1', '/agendar?barbeiro=b1&servico=s1'],
    ['/agendamentos', '/agendamentos'],
  ])('keeps the app path %s', (value, expected) => {
    expect(safeReturnPath(value)).toBe(expected);
  });

  it.each([undefined, '', 'agendar', '//evil.com', '/\\evil.com', 'https://evil.com', ['/a']])(
    'rejects %j',
    (value) => {
      expect(safeReturnPath(value as string | undefined)).toBeNull();
    },
  );
});

describe('returnPathWith', () => {
  it('builds a sign-in link that comes back here', () => {
    expect(returnPathWith('/entrar', '/agendar?barbeiro=b1')).toBe(
      '/entrar?voltar=%2Fagendar%3Fbarbeiro%3Db1',
    );
    expect(returnPathWith('/entrar', null)).toBe('/entrar');
  });
});
