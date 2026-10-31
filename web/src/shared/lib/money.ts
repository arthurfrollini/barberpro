const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** 5000 → "R$ 50,00". The API keeps money in integer cents. */
export function formatBRL(cents: number): string {
  return brl.format(cents / 100);
}

const AMOUNT = /^(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?$/;

/** Reads what a person types as reais ("50", "50,5", "R$ 1.234,56") into cents; null if it is not an amount. */
export function parseBRL(input: string): number | null {
  const match = AMOUNT.exec(input.replace(/^\s*R\$\s*/, '').trim());
  if (!match) return null;
  const reais = Number(match[1]!.replaceAll('.', ''));
  const cents = Number((match[2] ?? '0').padEnd(2, '0'));
  return reais * 100 + cents;
}
