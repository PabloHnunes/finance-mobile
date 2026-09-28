import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { deleteSalary, updateSalary, SalaryWithAmount } from '@/services/salary';
import { currencyToNumber, maskCurrency } from '@/utils/currency-input';

const inputClass = 'bg-gray-50 dark:bg-gray-500 text-gray-700 dark:text-gray-100 rounded-lg px-4 py-3 text-base';

interface Props {
  salary: SalaryWithAmount;
  userId: string;
  /** Mês/ano exibido: a alteração vale a partir dele */
  month: number;
  year: number;
  onClose: () => void;
  /** Chamado após qualquer alteração concluída na API */
  onMutated: () => void;
}

export function SalaryEditCard({ salary, userId, month, year, onClose, onMutated }: Props) {
  const [form, setForm] = useState(() => {
    const amount = Number(salary.activeAmount ?? salary.history?.[0]?.amount ?? 0);
    return {
      name: salary.name,
      amount: maskCurrency(String(Math.round(amount * 100))),
      isMain: salary.isMain,
    };
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const amount = currencyToNumber(form.amount);
    if (!form.name.trim()) return Alert.alert('Atenção', 'Preencha o nome.');
    if (amount <= 0) return Alert.alert('Atenção', 'Informe um valor válido.');

    setSaving(true);
    try {
      await updateSalary(salary.id, userId, { name: form.name, amount, isMain: form.isMain, month, year });
      onClose();
      onMutated();
    } catch (error: any) {
      const msg = error?.response?.data?.message ?? 'Não foi possível salvar.';
      Alert.alert('Erro', Array.isArray(msg) ? msg.join('\n') : msg);
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    onClose();
    Alert.alert('Remover receita', `Deseja remover "${salary.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteSalary(salary.id, userId);
            onMutated();
          } catch {
            Alert.alert('Erro', 'Não foi possível remover.');
          }
        },
      },
    ]);
  }

  return (
    <View className="bg-white dark:bg-gray-600 rounded-2xl p-5">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-gray-700 dark:text-gray-100 text-base font-bold">Editar receita</Text>
        <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
          <Ionicons name="close" size={22} color="#7C7C8A" />
        </TouchableOpacity>
      </View>
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
        <View className="flex-row items-center justify-between">
          <Text className="text-gray-300 dark:text-gray-200 text-sm">Renda principal</Text>
          <Switch
            value={form.isMain}
            onValueChange={(v) => setForm((p) => ({ ...p, isMain: v }))}
            trackColor={{ false: '#29292E', true: '#00875F' }}
            thumbColor="#fff"
          />
        </View>
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
