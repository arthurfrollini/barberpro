import { describe, expect, it } from 'vitest';
import { GENERIC_ERROR, messageFor } from './error-messages';

describe('messageFor', () => {
  it('maps API codes to Portuguese', () => {
    expect(messageFor('INVALID_CREDENTIALS')).toBe('Email ou senha incorretos.');
    expect(messageFor('NETWORK_ERROR')).toBe(
      'Não foi possível falar com o servidor. Verifique sua conexão.',
    );
  });

  it('falls back to a generic message', () => {
    expect(messageFor('SOMETHING_NEW')).toBe(GENERIC_ERROR);
    expect(messageFor(undefined)).toBe(GENERIC_ERROR);
    expect(GENERIC_ERROR).toBe('Algo deu errado. Tente de novo.');
  });
});
