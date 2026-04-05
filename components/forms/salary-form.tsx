import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, Switch, ActivityIndicator, Alert,
} from 'react-native';
import { createSalary } from '@/services/salary';
import { maskCurrency, currencyToNumber } from '@/utils/currency-input';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

interface Props {
  userId: string;
  onSaved: () => void;
}

export function SalaryForm({ userId, onSaved }: Props) {
  const now = new Date();
  const [form, setForm] = useState({
    name: '',
    amount: '0,00',
    isMain: false,
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  });
  const [saving, setSaving] = useState(false);

  const inputClass = 'bg-gray-50 dark:bg-gray-500 text-gray-700 dark:text-gray-100 rounded-lg px-4 py-3 text-base';

  async function handleSave() {
    const amount = currencyToNumber(form.amount);
    if (!form.name.trim()) return Alert.alert('Atenção', 'Preencha o nome.');
    if (amount <= 0) return Alert.alert('Atenção', 'Informe um valor válido.');

    setSaving(true);
    try {
      await createSalary(userId, { name: form.name, amount, isMain: form.isMain, month: form.month, year: form.year });
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
      <Text className="text-gray-700 dark:text-gray-100 text-lg font-bold mb-4">Nova renda</Text>
      <View className="gap-3">
        <TextInput
          className={inputClass}
          placeholder="Nome (ex: Salário CLT)"
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
          <Text className="text-gray-300 dark:text-gray-200 text-xs mb-2">Mês</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              {MONTHS.map((m, i) => (
                <TouchableOpacity
                  key={m}
                  onPress={() => setForm((p) => ({ ...p, month: i + 1 }))}
                  className={`px-3 py-2 rounded-lg ${form.month === i + 1 ? 'bg-green-700' : 'bg-gray-50 dark:bg-gray-500'}`}
                  activeOpacity={0.7}
                >
                  <Text className={`text-xs ${form.month === i + 1 ? 'text-white font-bold' : 'text-gray-300 dark:text-gray-200'}`}>
                    {m.slice(0, 3)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
        <View className="flex-row items-center gap-3">
          <Text className="text-gray-300 dark:text-gray-200 text-xs">Ano</Text>
          <TextInput
            className={`${inputClass} w-24 text-center`}
            keyboardType="numeric"
            maxLength={4}
            value={String(form.year)}
            onChangeText={(v) => setForm((p) => ({ ...p, year: parseInt(v) || p.year }))}
          />
        </View>
        <View className="flex-row items-center justify-between">
          <Text className="text-gray-300 dark:text-gray-200 text-sm">Renda principal</Text>
          <Switch
            value={form.isMain}
            onValueChange={(v) => setForm((p) => ({ ...p, isMain: v }))}
            trackColor={{ false: '#29292E', true: '#00875F' }}
            thumbColor="#fff"
          />
        </View>
        <TouchableOpacity className="bg-green-700 rounded-lg py-4 items-center mt-2" activeOpacity={0.7} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text className="text-white text-base font-bold">Salvar</Text>}
        </TouchableOpacity>
      </View>
    </>
  );
}
