export function formatCurrency(value: number): string {
  const abs = Math.abs(value);
  const [intPart, decPart = '00'] = abs.toFixed(2).split('.');
  const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${value < 0 ? '-' : ''}R$ ${formatted},${decPart}`;
}
