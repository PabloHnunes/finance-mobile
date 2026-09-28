import { memo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ExpenseEntry } from '@/services/expense';
import { formatCurrency } from '@/utils/currency';
import { PAYMENT_LABELS, getCategoryLabel, getExpenseTitle } from '@/constants/expense';

interface Props {
  expense: ExpenseEntry;
  onPress: () => void;
  hideValues?: boolean;
}

export const ExpenseItem = memo(function ExpenseItem({ expense, onPress, hideValues }: Props) {
  const amount = Number(expense.amount);
  const effectiveAmount = amount * (expense.userPart / expense.splitParts);
  const date = new Date(expense.entryDate);
  // entryDate vem como meia-noite UTC; ler em UTC evita mostrar o dia anterior no fuso -03:00
  const dateStr = `${String(date.getUTCDate()).padStart(2, '0')}/${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  const categoryLabel = getCategoryLabel(expense.expenseCategory);
  const title = getExpenseTitle(expense);
  // Com descrição no título, a categoria desce para a linha de detalhes para não sumir
  const categoryInDetails = !expense.recurringExpense?.name && !!expense.description ? categoryLabel : null;
  const payment = expense.paymentType ? PAYMENT_LABELS[expense.paymentType] : null;
  const isSplit = expense.splitParts > 1;
  const isInstallment = expense.installmentCount > 1;
  const m = (text: string) => (hideValues ? '••••••' : text);

  return (
    <TouchableOpacity
      className="bg-white dark:bg-gray-600 rounded-2xl p-4 flex-row items-center"
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View className={`w-1 self-stretch rounded-full mr-3 ${expense.isPriority ? 'bg-orange-500' : 'bg-gray-200 dark:bg-gray-500'}`} />
      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Text className="text-gray-700 dark:text-gray-100 text-sm font-bold flex-shrink" numberOfLines={1}>{title}</Text>
          {isInstallment && (
            <Text className="text-purple-300 text-xs">{expense.installmentNumber}/{expense.installmentCount}</Text>
          )}
          {expense.isPriority && <Ionicons name="alert-circle" size={14} color="#FFA500" />}
        </View>
        <Text className="text-gray-300 dark:text-gray-200 text-[10px] mt-1" numberOfLines={1}>
          {[
            dateStr,
            categoryInDetails,
            payment,
            expense.bank?.name ? (expense.bank.name.length > 15 ? expense.bank.name.slice(0, 15) + '…' : expense.bank.name) : null,
          ].filter(Boolean).join(' • ')}
          {isSplit && <Text className="text-orange-500 text-[10px]"> • {expense.userPart}/{expense.splitParts}</Text>}
        </Text>
        {expense.financingDetail?.fees && expense.financingDetail.fees.length > 0 && (
          <Text className="text-purple-300 text-[10px] mt-1" numberOfLines={1}>
            {expense.financingDetail.fees.map((f) => {
              const v = Number(f.value);
              return f.type === 'FIXED'
                ? `${f.name}: R$${v.toFixed(2)}`
                : `${f.name}: ${(v * 100).toFixed(4)}%`;
            }).join(' • ')}
          </Text>
        )}
      </View>
      <View className="items-end">
        <Text className="text-red-500 text-sm font-bold">{m(formatCurrency(effectiveAmount))}</Text>
        {isSplit && (
          <Text className="text-gray-300 text-[10px]">total {m(formatCurrency(amount))}</Text>
        )}
        {expense.financingDetail && (
          <Text className="text-purple-300 text-[10px]">
            {expense.financingDetail.amortizationType} • {(Number(expense.financingDetail.interestRate) * 100).toFixed(2)}%{Number(expense.financingDetail.monetaryCorrection) > 0 ? ` +TR` : ''}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}, (prev, next) => prev.hideValues === next.hideValues && prev.expense.id === next.expense.id && prev.expense.amount === next.expense.amount && prev.expense.description === next.expense.description &&prev.expense.isPriority === next.expense.isPriority && prev.expense.splitParts === next.expense.splitParts && prev.expense.userPart === next.expense.userPart && prev.expense.expenseCategory === next.expense.expenseCategory && prev.expense.paymentType === next.expense.paymentType && prev.expense.bankId === next.expense.bankId);
