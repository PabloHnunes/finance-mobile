export function maskCurrency(value: string): string {
  const digits = value.replace(/\D/g, '');
  const numeric = parseInt(digits || '0', 10);
  const formatted = (numeric / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return formatted;
}

export function currencyToNumber(masked: string): number {
  const cleaned = masked.replace(/\./g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}
