import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Switch,
} from 'react-native';
import { createRecurringExpense } from '@/services/recurring-expense';
import { useBanks } from '@/hooks/use-banks';
import { ExpenseCategory, PaymentType } from '@/services/expense';
import { maskCurrency, currencyToNumber } from '@/utils/currency-input';

const CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'GROCERIES', label: 'Alimentação' },
  { value: 'TRANSPORTATION', label: 'Transporte' },
  { value: 'HEALTHCARE', label: 'Saúde' },
  { value: 'EDUCATION', label: 'Educação' },
  { value: 'LEISURE', label: 'Lazer' },
  { value: 'UTILITIES', label: 'Contas' },
];

const PAYMENT_TYPES: { value: PaymentType; label: string }[] = [
  { value: 'PIX', label: 'Pix' },
  { value: 'CREDIT', label: 'Crédito' },
  { value: 'DEBIT', label: 'Débito' },
  { value: 'CASH', label: 'Dinheiro' },
  { value: 'TRANSFER', label: 'Transferência' },
  { value: 'BOLETO', label: 'Boleto' },
];

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

interface Props {
  userId: string;
  onSaved: () => void;
}

export function RecurringExpenseForm({ userId, onSaved }: Props) {
  const [form, setForm] = useState({
    name: '',
    amount: '0,00',
    dueDay: 1,
    category: '' as ExpenseCategory | '',
    paymentType: '' as PaymentType | '',
    bankId: '',
    isPriority: false,
  });
  const [saving, setSaving] = useState(false);
  const { data: banks = [] } = useBanks(userId);

  const inputClass = 'bg-gray-50 dark:bg-gray-500 text-gray-700 dark:text-gray-100 rounded-lg px-4 py-3 text-base';

  async function handleSave() {
    const amount = currencyToNumber(form.amount);
    if (!form.name.trim()) return Alert.alert('Atenção', 'Preencha o nome.');
    if (amount <= 0) return Alert.alert('Atenção', 'Informe um valor válido.');

    setSaving(true);
    try {
      await createRecurringExpense(userId, {
        name: form.name,
        amount,
        dueDay: form.dueDay,
        expenseCategory: form.category || undefined,
        paymentType: form.paymentType || undefined,
        bankId: form.bankId || undefined,
        isPriority: form.isPriority,
      });
      onSaved();
    } catch (error: any) {
      const msg = error?.response?.data?.message ?? 'Não foi possível salvar.';
      Alert.alert('Erro', Array.isArray(msg) ? msg.join('\n') : msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Text className="text-gray-700 dark:text-gray-100 text-lg font-bold mb-4">Despesa recorrente</Text>
      <View className="gap-3">
        <TextInput
          className={inputClass}
          placeholder="Nome (ex: Netflix, Aluguel)"
          placeholderTextColor="#7C7C8A"
          value={form.name}
          onChangeText={(v) => setForm((p) => ({ ...p, name: v }))}
        />

        <View className={`${inputClass} flex-row items-center`}>
          <Text className="text-gray-300 dark:text-gray-200 text-base mr-1">R$</Text>
          <TextInput
            className="flex-1 text-gray-700 dark:text-gray-100 text-base p-0"
            keyboardType="numeric"
            value={form.amount}
            onChangeText={(v) => setForm((p) => ({ ...p, amount: maskCurrency(v) }))}
            selection={{ start: form.amount.length, end: form.amount.length }}
          />
        </View>

        <View>
          <Text className="text-gray-300 dark:text-gray-200 text-xs mb-2">Dia de vencimento</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-1">
              {DAYS.map((d) => (
                <TouchableOpacity
                  key={d}
                  onPress={() => setForm((p) => ({ ...p, dueDay: d }))}
                  className={`w-9 h-9 rounded-lg items-center justify-center ${
                    form.dueDay === d ? 'bg-orange-600' : 'bg-gray-50 dark:bg-gray-500'
                  }`}
                  activeOpacity={0.7}
                >
                  <Text className={`text-xs ${form.dueDay === d ? 'text-white font-bold' : 'text-gray-300 dark:text-gray-200'}`}>
                    {d}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        <View>
          <Text className="text-gray-300 dark:text-gray-200 text-xs mb-2">Categoria</Text>
          <View className="flex-row flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.value}
                onPress={() => setForm((p) => ({ ...p, category: p.category === cat.value ? '' : cat.value }))}
                className={`px-3 py-2 rounded-lg ${form.category === cat.value ? 'bg-orange-600' : 'bg-gray-50 dark:bg-gray-500'}`}
                activeOpacity={0.7}
              >
                <Text className={`text-xs ${form.category === cat.value ? 'text-white font-bold' : 'text-gray-300 dark:text-gray-200'}`}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View>
          <Text className="text-gray-300 dark:text-gray-200 text-xs mb-2">Pagamento</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              {PAYMENT_TYPES.map((pt) => (
                <TouchableOpacity
                  key={pt.value}
                  onPress={() => setForm((p) => ({ ...p, paymentType: p.paymentType === pt.value ? '' : pt.value }))}
                  className={`px-3 py-2 rounded-lg ${form.paymentType === pt.value ? 'bg-orange-600' : 'bg-gray-50 dark:bg-gray-500'}`}
                  activeOpacity={0.7}
                >
                  <Text className={`text-xs ${form.paymentType === pt.value ? 'text-white font-bold' : 'text-gray-300 dark:text-gray-200'}`}>
                    {pt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {banks.length > 0 && (
          <View>
            <Text className="text-gray-300 dark:text-gray-200 text-xs mb-2">Banco</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                {banks.map((bank) => (
                  <TouchableOpacity
                    key={bank.id}
                    onPress={() => setForm((p) => ({ ...p, bankId: p.bankId === bank.id ? '' : bank.id }))}
                    className={`px-3 py-2 rounded-lg ${form.bankId === bank.id ? 'bg-orange-600' : 'bg-gray-50 dark:bg-gray-500'}`}
                    activeOpacity={0.7}
                  >
                    <Text className={`text-xs ${form.bankId === bank.id ? 'text-white font-bold' : 'text-gray-300 dark:text-gray-200'}`}>
                      {bank.name} • {bank.documentType}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        <View className="flex-row items-center justify-between">
          <Text className="text-gray-300 dark:text-gray-200 text-sm">Prioritário</Text>
          <Switch
            value={form.isPriority}
            onValueChange={(v) => setForm((p) => ({ ...p, isPriority: v }))}
            trackColor={{ false: '#29292E', true: '#FF8C00' }}
            thumbColor="#fff"
          />
        </View>

        <TouchableOpacity className="bg-orange-600 rounded-lg py-4 items-center mt-2" activeOpacity={0.7} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text className="text-white text-base font-bold">Salvar</Text>}
        </TouchableOpacity>
      </View>
    </>
  );
}
