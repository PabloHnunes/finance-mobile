import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { deleteExpense, ExpenseCategory, ExpenseEntry, PaymentType, settleInstallments, updateExpense } from '@/services/expense';
import { deleteRecurringExpense, updateRecurringExpense } from '@/services/recurring-expense';
import { updateFinancing } from '@/services/financing';
import { Bank } from '@/services/bank';
import { CATEGORIES, PAYMENT_TYPES, getExpenseTitle } from '@/constants/expense';
import { formatCurrency } from '@/utils/currency';
import { currencyToNumber, maskCurrency } from '@/utils/currency-input';

const inputClass = 'bg-gray-50 dark:bg-gray-500 text-gray-700 dark:text-gray-100 rounded-lg px-4 py-3 text-base';

function errorMessage(error: any, fallback: string) {
  const msg = error?.response?.data?.message ?? fallback;
  return Array.isArray(msg) ? msg.join('\n') : msg;
}

interface Props {
  expense: ExpenseEntry;
  userId: string;
  /** Mês/ano exibido: alterações de recorrente/financiamento valem a partir dele */
  month: number;
  year: number;
  banks: Bank[];
  onClose: () => void;
  /** Chamado após qualquer alteração concluída na API */
  onMutated: () => void;
  /** Remoção otimista do cache antes da chamada de exclusão */
  onOptimisticRemove: (id: string, recurringExpenseId?: string) => void;
}

export function ExpenseEditCard({ expense, userId, month, year, banks, onClose, onMutated, onOptimisticRemove }: Props) {
  const isFinancing = !!expense.financingDetail;
  const isRecurring = !!expense.recurringExpenseId;

  const [form, setForm] = useState({
    name: expense.recurringExpense?.name ?? '',
    description: expense.description ?? '',
    amount: maskCurrency(String(Math.round(Number(expense.amount) * 100))),
    category: (expense.expenseCategory ?? '') as ExpenseCategory | '',
    paymentType: (expense.paymentType ?? '') as PaymentType | '',
    isPriority: expense.isPriority,
    bankId: expense.bankId ?? '',
    dueDay: new Date(expense.entryDate).getUTCDate(),
    splitParts: String(expense.splitParts),
    userPart: String(expense.userPart),
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const amount = currencyToNumber(form.amount);
    if (!isFinancing && amount <= 0) return Alert.alert('Atenção', 'Informe um valor válido.');

    const splitParts = parseInt(form.splitParts) || 1;
    const userPart = parseInt(form.userPart) || 1;

    setSaving(true);
    try {
      if (isFinancing) {
        await updateFinancing(expense.id, userId, { splitParts, userPart, fromMonth: month, fromYear: year });
      } else if (isRecurring) {
        await updateRecurringExpense(expense.recurringExpenseId!, userId, {
          name: form.name || undefined,
          amount,
          expenseCategory: form.category || undefined,
          paymentType: form.paymentType || undefined,
          isPriority: form.isPriority,
          bankId: form.bankId || null,
          dueDay: form.dueDay,
          splitParts,
          userPart,
          fromMonth: month,
          fromYear: year,
        });
      } else {
        await updateExpense(expense.id, userId, {
          amount,
          description: form.description.trim() || null,
          expenseCategory: form.category || undefined,
          paymentType: form.paymentType || undefined,
          bankId: form.bankId || null,
          splitParts,
          userPart,
        });
      }
      onClose();
      onMutated();
    } catch (error: any) {
      Alert.alert('Erro', errorMessage(error, 'Não foi possível salvar.'));
    } finally {
      setSaving(false);
    }
  }

  function handleSettle() {
    Alert.alert(
      'Quitar parcelas',
      `Deseja quitar todas as parcelas restantes a partir da ${expense.installmentNumber}/${expense.installmentCount}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Quitar',
          onPress: async () => {
            try {
              await settleInstallments(expense.id, userId);
              onClose();
              onMutated();
              Alert.alert('Sucesso', 'Parcelas quitadas!');
            } catch (error: any) {
              Alert.alert('Erro', errorMessage(error, 'Não foi possível quitar.'));
            }
          },
        },
      ],
    );
  }

  function handleDelete() {
    onClose();

    const title = getExpenseTitle(expense, 'Despesa');
    const amountLabel = formatCurrency(Number(expense.amount));
    const isInstallment = expense.installmentCount > 1;

    async function remove(cancelFuture: boolean) {
      try {
        onOptimisticRemove(expense.id, cancelFuture ? expense.recurringExpenseId : undefined);
        if (cancelFuture && isRecurring) {
          await deleteRecurringExpense(expense.recurringExpenseId!, userId, month, year);
        } else {
          await deleteExpense(expense.id, userId, cancelFuture || undefined);
        }
        onMutated();
      } catch {
        Alert.alert('Erro', 'Não foi possível remover.');
      }
    }

    if (isInstallment || isRecurring) {
      Alert.alert(
        isRecurring ? 'Remover despesa recorrente' : 'Remover despesa parcelada',
        isInstallment
          ? `Parcela ${expense.installmentNumber}/${expense.installmentCount} - ${amountLabel}`
          : `${title} - ${amountLabel}`,
        [
          { text: 'Voltar', style: 'cancel' },
          { text: 'Só esta', onPress: () => remove(false) },
          { text: isRecurring ? 'Esta e todas futuras' : 'Esta e futuras', style: 'destructive', onPress: () => remove(true) },
        ],
      );
    } else {
      Alert.alert('Remover despesa', `${title} - ${amountLabel}`, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Remover', style: 'destructive', onPress: () => remove(false) },
      ]);
    }
  }

  const chipClass = (active: boolean) => `px-3 py-2 rounded-lg ${active ? 'bg-orange-600' : 'bg-gray-50 dark:bg-gray-500'}`;
  const chipTextClass = (active: boolean) => `text-xs ${active ? 'text-white font-bold' : 'text-gray-300 dark:text-gray-200'}`;
  const detail = expense.financingDetail;

  return (
    <View className="bg-white dark:bg-gray-600 rounded-2xl p-5">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-gray-700 dark:text-gray-100 text-base font-bold">
          {isFinancing ? 'Detalhes' : 'Editar despesa'}
        </Text>
        <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
          <Ionicons name="close" size={22} color="#7C7C8A" />
        </TouchableOpacity>
      </View>

      <View className="gap-3">
        {!isFinancing && !isRecurring && (
          <TextInput
            className={inputClass}
            placeholder="Descrição (ex: Padaria)"
            placeholderTextColor="#7C7C8A"
            maxLength={100}
            value={form.description}
            onChangeText={(v) => setForm((p) => ({ ...p, description: v }))}
          />
        )}

        <View className={`${inputClass} flex-row items-center ${isFinancing ? 'opacity-50' : ''}`}>
          <Text className="text-gray-300 dark:text-gray-200 text-base mr-1">R$</Text>
          <TextInput
            className="flex-1 text-gray-700 dark:text-gray-100 text-base p-0"
            keyboardType="numeric"
            editable={!isFinancing}
            value={form.amount}
            onChangeText={(v) => setForm((p) => ({ ...p, amount: maskCurrency(v) }))}
            selection={!isFinancing ? { start: form.amount.length, end: form.amount.length } : undefined}
          />
        </View>

        {/* Campos editáveis — só para despesas normais */}
        {!isFinancing && (
          <>
            <View>
              <Text className="text-gray-300 dark:text-gray-200 text-xs mb-2">Categoria</Text>
              <View className="flex-row flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.value}
                    onPress={() => setForm((p) => ({ ...p, category: p.category === cat.value ? '' : cat.value }))}
                    className={chipClass(form.category === cat.value)}
                    activeOpacity={0.7}
                  >
                    <Text className={chipTextClass(form.category === cat.value)}>{cat.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View>
              <Text className="text-gray-300 dark:text-gray-200 text-xs mb-2">Pagamento</Text>
              <View className="flex-row flex-wrap gap-2">
                {PAYMENT_TYPES.map((pt) => (
                  <TouchableOpacity
                    key={pt.value}
                    onPress={() => setForm((p) => ({ ...p, paymentType: p.paymentType === pt.value ? '' : pt.value }))}
                    className={chipClass(form.paymentType === pt.value)}
                    activeOpacity={0.7}
                  >
                    <Text className={chipTextClass(form.paymentType === pt.value)}>{pt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            {banks.length > 0 && (
              <View>
                <Text className="text-gray-300 dark:text-gray-200 text-xs mb-2">Banco</Text>
                <View className="flex-row flex-wrap gap-2">
                  {banks.map((bank) => (
                    <TouchableOpacity
                      key={bank.id}
                      onPress={() => setForm((p) => ({ ...p, bankId: p.bankId === bank.id ? '' : bank.id }))}
                      className={chipClass(form.bankId === bank.id)}
                      activeOpacity={0.7}
                    >
                      <Text className={chipTextClass(form.bankId === bank.id)}>{bank.name} • {bank.documentType}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </>
        )}

        {/* Divisão — disponível para todos os tipos */}
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Text className="text-gray-300 dark:text-gray-200 text-xs mb-1">Dividir em</Text>
            <TextInput className={`${inputClass} text-center`} keyboardType="numeric" maxLength={2} value={form.splitParts} onChangeText={(v) => setForm((p) => ({ ...p, splitParts: v }))} />
          </View>
          <View className="flex-1">
            <Text className="text-gray-300 dark:text-gray-200 text-xs mb-1">Suas partes</Text>
            <TextInput className={`${inputClass} text-center`} keyboardType="numeric" maxLength={2} value={form.userPart} onChangeText={(v) => setForm((p) => ({ ...p, userPart: v }))} />
          </View>
        </View>

        {/* Infos de financiamento — read only */}
        {detail && (
          <View className="bg-purple-50 dark:bg-purple-900 rounded-lg p-3">
            <Text className="text-purple-500 text-xs font-bold mb-2">
              {detail.financingType === 'PERSONAL_LOAN' ? 'Empréstimo' : detail.financingType === 'VEHICLE' ? 'Veículo' : detail.financingType === 'PROPERTY' ? 'Imóvel' : 'Outro'}
              {' • '}{detail.amortizationType} • {(Number(detail.interestRate) * 100).toFixed(2)}% a.m.
              {Number(detail.monetaryCorrection) > 0 ? ` • TR: ${(Number(detail.monetaryCorrection) * 100).toFixed(4)}%` : ''}
            </Text>
            <Text className="text-gray-300 dark:text-gray-200 text-[10px]">
              Total: R$ {Number(detail.totalAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </Text>
            <Text className="text-gray-300 dark:text-gray-200 text-[10px]">
              Parcelas: {detail.paidInstallments}/{detail.totalInstallments} pagas
            </Text>
            {detail.fees && detail.fees.length > 0 && (
              <View className="mt-2 border-t border-purple-200 dark:border-purple-800 pt-2">
                <Text className="text-gray-300 dark:text-gray-200 text-[10px] font-bold mb-1">Taxas:</Text>
                {detail.fees.map((fee, i) => {
                  const val = Number(fee.value);
                  const typeLabel = fee.type === 'FIXED' ? 'Fixo' : fee.type === 'ON_BALANCE' ? 'S/ saldo' : fee.type === 'ON_INSTALLMENT' ? 'S/ parcela' : 'S/ total';
                  const valueLabel = fee.type === 'FIXED' ? `R$ ${val.toFixed(2)}` : `${(val * 100).toFixed(4)}%`;
                  return (
                    <Text key={i} className="text-gray-300 dark:text-gray-200 text-[10px]">
                      • {fee.name}: {valueLabel} ({typeLabel})
                    </Text>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {expense.installmentCount > 1 && (
          <TouchableOpacity className="bg-green-700 rounded-lg py-3 items-center mt-2" activeOpacity={0.7} onPress={handleSettle}>
            <Text className="text-white text-sm font-bold">Quitar parcelas ({expense.installmentNumber}/{expense.installmentCount})</Text>
          </TouchableOpacity>
        )}

        <View className="flex-row gap-3 mt-2">
          <TouchableOpacity className="w-12 border border-red-500 rounded-lg py-3 items-center" activeOpacity={0.7} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
          </TouchableOpacity>
          <TouchableOpacity className="flex-1 border border-gray-200 dark:border-gray-400 rounded-lg py-3 items-center" activeOpacity={0.7} onPress={onClose}>
            <Text className="text-gray-300 text-sm font-bold">Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity className="flex-1 bg-green-700 rounded-lg py-3 items-center" activeOpacity={0.7} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text className="text-white text-sm font-bold">Salvar</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
