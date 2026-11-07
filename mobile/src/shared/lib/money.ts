const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** 5000 → "R$ 50,00". The API keeps money in integer cents. */
export function formatBRL(cents: number): string {
  return brl.format(cents / 100);
}

/** 75 → "1 h 15 min" */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}
