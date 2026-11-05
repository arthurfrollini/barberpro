import { GENERIC_ERROR, messageFor } from './error-messages';

describe('messageFor', () => {
  it('maps API codes to Portuguese, speaking to the customer', () => {
    expect(messageFor('INVALID_CREDENTIALS')).toBe('Email ou senha incorretos.');
    expect(messageFor('CUSTOMER_BUSY')).toBe('Você já tem outro agendamento neste horário.');
    expect(messageFor('SLOT_UNAVAILABLE')).toBe(
      'Alguém acabou de reservar este horário. Escolha outro.',
    );
  });

  it('falls back to a generic message', () => {
    expect(messageFor('SOMETHING_NEW')).toBe(GENERIC_ERROR);
    expect(messageFor(undefined)).toBe(GENERIC_ERROR);
  });
});
