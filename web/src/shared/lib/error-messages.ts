export const GENERIC_ERROR = 'Algo deu errado. Tente de novo.';

// The API's messages are English; the dashboard speaks Portuguese, keyed by the stable code.
const MESSAGES: Record<string, string> = {
  NETWORK_ERROR: 'Não foi possível falar com o servidor. Verifique sua conexão.',
  UNAUTHENTICATED: 'Sua sessão expirou. Entre de novo.',
  INVALID_CREDENTIALS: 'Email ou senha incorretos.',
  INVALID_REFRESH_TOKEN: 'Sua sessão expirou. Entre de novo.',
  EMAIL_TAKEN: 'Já existe uma conta com este email.',
  INVALID_EMAIL: 'Email inválido.',
  WEAK_PASSWORD: 'A senha precisa ter de 8 a 128 caracteres.',
  INVALID_NAME: 'Informe um nome de até 80 caracteres.',
  SHOP_ALREADY_OWNED: 'Você já tem uma barbearia.',
  SHOP_NOT_FOUND: 'Barbearia não encontrada.',
  NOT_SHOP_OWNER: 'Só o dono da barbearia pode fazer isso.',
  INVALID_SHOP_NAME: 'Informe o nome da barbearia.',
  INVALID_DESCRIPTION: 'A descrição está longa demais.',
  INVALID_ADDRESS: 'Informe o endereço.',
  INVALID_FOUNDED_YEAR: 'Ano de fundação inválido.',
  INVALID_LOCATION: 'Latitude ou longitude inválida.',
  INVALID_TIMEZONE: 'Fuso horário inválido.',
  FILE_NOT_FOUND: 'Imagem não encontrada. Envie de novo.',
  FILE_REQUIRED: 'Escolha uma imagem.',
  FILE_TOO_LARGE: 'A imagem pode ter no máximo 2 MB.',
  UNSUPPORTED_FILE_TYPE: 'Use uma imagem JPEG, PNG ou WebP.',
  ALREADY_A_BARBER: 'Esta pessoa já atende em uma barbearia.',
  INVITE_ALREADY_SENT: 'Já existe um convite pendente para este email.',
  EMAIL_NOT_SENT: 'Não foi possível enviar o email do convite. Tente de novo.',
  INVITE_NOT_FOUND: 'Convite não encontrado. Confira o código.',
  INVITE_EXPIRED: 'Este convite expirou. Peça um novo ao dono da barbearia.',
  INVITE_EMAIL_MISMATCH:
    'Este convite foi enviado para outro email. Entre com o email que recebeu o convite.',
  BARBER_NOT_FOUND: 'Barbeiro não encontrado.',
  NOT_A_BARBER: 'Você ainda não atende em nenhuma barbearia.',
  INVALID_BIO: 'A bio está longa demais.',
  INVALID_SERVICE_NAME: 'Informe o nome do serviço.',
  INVALID_PRICE: 'Preço inválido.',
  INVALID_DURATION: 'A duração vai de 5 a 480 minutos, de 5 em 5.',
  SERVICE_NOT_FOUND: 'Serviço não encontrado.',
  NOT_SERVICE_OWNER: 'Este serviço é de outro barbeiro.',
  INVALID_SCHEDULE:
    'Confira os horários: o fim vem depois do início e os intervalos não se sobrepõem.',
  INVALID_DATE: 'Data inválida.',
  SLOT_UNAVAILABLE: 'Este horário não está mais livre.',
  SLOT_IN_PAST: 'Este horário já passou.',
  BEYOND_BOOKING_HORIZON: 'Só dá para agendar até 60 dias à frente.',
  CUSTOMER_BUSY: 'O cliente já tem outro agendamento neste horário.',
  CANCELLATION_WINDOW_CLOSED: 'Faltam menos de 2 horas: não dá mais para cancelar ou remarcar.',
  APPOINTMENT_NOT_FOUND: 'Agendamento não encontrado.',
  APPOINTMENT_CANCELED: 'Este agendamento já foi cancelado.',
  NOTIFICATION_NOT_FOUND: 'Notificação não encontrada.',
};

export function messageFor(code: string | undefined): string {
  return (code && MESSAGES[code]) || GENERIC_ERROR;
}
