import type { ExpenseCategory, ExpenseEntry, PaymentType } from '@/services/expense';

export const CATEGORY_LABELS: Record<string, string> = {
  GROCERIES: 'Alimentação',
  TRANSPORTATION: 'Transporte',
  HEALTHCARE: 'Saúde',
  EDUCATION: 'Educação',
  LEISURE: 'Lazer',
  UTILITIES: 'Contas',
  LOAN: 'Empréstimo',
  FINANCING_PROPERTY: 'Financ. Imóvel',
  FINANCING_VEHICLE: 'Financ. Veículo',
};

export const PAYMENT_LABELS: Record<string, string> = {
  PIX: 'Pix',
  CREDIT: 'Crédito',
  DEBIT: 'Débito',
  CASH: 'Dinheiro',
  TRANSFER: 'Transferência',
  BOLETO: 'Boleto',
};

/** Categorias selecionáveis nos formulários (as de empréstimo/financiamento são geradas pela API). */
export const CATEGORIES: { value: ExpenseCategory; label: string }[] = (
  ['GROCERIES', 'TRANSPORTATION', 'HEALTHCARE', 'EDUCATION', 'LEISURE', 'UTILITIES'] as const
).map((value) => ({ value, label: CATEGORY_LABELS[value] }));

export const PAYMENT_TYPES: { value: PaymentType; label: string }[] = (
  ['PIX', 'CREDIT', 'DEBIT', 'CASH', 'TRANSFER', 'BOLETO'] as const
).map((value) => ({ value, label: PAYMENT_LABELS[value] }));

export function getCategoryLabel(category?: string | null): string | null {
  return category ? CATEGORY_LABELS[category] ?? category : null;
}

/** Nome que identifica o gasto: recorrente > descrição > categoria. */
export function getExpenseTitle(expense: ExpenseEntry, fallback = 'Sem categoria'): string {
  return (
    expense.recurringExpense?.name ??
    expense.description ??
    getCategoryLabel(expense.expenseCategory) ??
    fallback
  );
}
