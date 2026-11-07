export const GENERIC_ERROR = 'Algo deu errado. Tente de novo.';

// The API's messages are English; the app speaks Portuguese to the customer, keyed by the
// stable code. Only the codes a customer can meet are here.
const MESSAGES: Record<string, string> = {
  NETWORK_ERROR: 'Não foi possível falar com o servidor. Verifique sua conexão.',
  TIMEOUT:
    'O servidor demorou demais para responder. Se era uma alteração, confira se ela foi salva antes de tentar de novo.',
  UNAUTHENTICATED: 'Sua sessão expirou. Entre de novo.',
  INVALID_CREDENTIALS: 'Email ou senha incorretos.',
  INVALID_REFRESH_TOKEN: 'Sua sessão expirou. Entre de novo.',
  EMAIL_TAKEN: 'Já existe uma conta com este email.',
  INVALID_EMAIL: 'Email inválido.',
  WEAK_PASSWORD: 'A senha precisa ter de 8 a 128 caracteres.',
  INVALID_NAME: 'Informe um nome de até 80 caracteres.',
  INVALID_SEARCH: 'Digite pelo menos 2 letras.',
  INVALID_LOCATION: 'Não deu para usar a sua localização.',
  INVALID_RADIUS: 'Não deu para usar a sua localização.',
  SHOP_NOT_FOUND: 'Barbearia não encontrada.',
  BARBER_NOT_FOUND: 'Barbeiro não encontrado.',
  SERVICE_NOT_FOUND: 'Este serviço não está mais disponível.',
  INVALID_DATE: 'Data inválida.',
  SLOT_UNAVAILABLE: 'Alguém acabou de reservar este horário. Escolha outro.',
  SLOT_IN_PAST: 'Este horário já passou. Escolha outro.',
  BEYOND_BOOKING_HORIZON: 'Só dá para agendar até 60 dias à frente.',
  CUSTOMER_BUSY: 'Você já tem outro agendamento neste horário.',
  BARBER_CANNOT_BOOK_SELF: 'Você não pode agendar um horário com você mesmo.',
  INVALID_REMINDER_LEAD: 'Escolha um lembrete de até 1 hora antes.',
  CANCELLATION_WINDOW_CLOSED: 'Faltam menos de 2 horas: não dá mais para cancelar ou remarcar.',
  APPOINTMENT_NOT_FOUND: 'Agendamento não encontrado.',
  APPOINTMENT_CANCELED: 'Este agendamento já foi cancelado.',
  NOTIFICATION_NOT_FOUND: 'Aviso não encontrado.',
};

export function messageFor(code: string | undefined): string {
  return (code && MESSAGES[code]) || GENERIC_ERROR;
}
