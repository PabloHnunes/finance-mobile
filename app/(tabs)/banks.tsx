import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  ScrollView, RefreshControl, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/auth';
import { createBank, deleteBank, DocumentType } from '@/services/bank';
import { useBanks } from '@/hooks/use-banks';
import { maskCpf, unmask } from '@/utils/masks';

const DOC_TYPES: { value: DocumentType; label: string }[] = [
  { value: 'PF', label: 'CPF' },
  { value: 'CNPJ', label: 'CNPJ' },
];

function maskCnpj(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  return digits
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

export default function BanksScreen() {
  const { user } = useAuth();
  const { data: banks = [], isLoading: loading, refetch, invalidate } = useBanks(user?.id);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    documentType: 'PF' as DocumentType,
    documentNumber: '',
  });

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  function openForm() {
    setForm({ name: '', description: '', documentType: 'PF', documentNumber: '' });
    setShowForm(true);
  }

  async function handleSave() {
    if (!user) return;
    if (!form.name.trim()) return Alert.alert('Atenção', 'Preencha o nome do banco.');
    if (!form.documentNumber.trim()) return Alert.alert('Atenção', 'Preencha o documento.');

    setSaving(true);
    try {
      await createBank(user.id, {
        name: form.name,
        description: form.description || undefined,
        documentType: form.documentType,
        documentNumber: unmask(form.documentNumber),
      });
      setShowForm(false);
      setForm({ name: '', description: '', documentType: 'PF', documentNumber: '' });
      invalidate();
    } catch (error: any) {
      const msg = error?.response?.data?.message ?? 'Não foi possível salvar.';
      Alert.alert('Erro', Array.isArray(msg) ? msg.join('\n') : msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(bank: Bank) {
    if (!user) return;
    Alert.alert('Remover banco', `Deseja remover "${bank.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteBank(bank.id, user.id);
            invalidate();
          } catch {
            Alert.alert('Erro', 'Não foi possível remover.');
          }
        },
      },
    ]);
  }

  if (!user) return null;

  const inputClass = 'bg-gray-50 dark:bg-gray-500 text-gray-700 dark:text-gray-100 rounded-lg px-4 py-3 text-base';
  const maskDoc = form.documentType === 'PF' ? maskCpf : maskCnpj;
  const maxDocLength = form.documentType === 'PF' ? 14 : 18;

  return (
    <ScrollView
      className="flex-1 bg-gray-50 dark:bg-gray-700"
      contentContainerStyle={{ paddingTop: 64, paddingHorizontal: 24, paddingBottom: 24 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00B37E" colors={['#00B37E']} />
      }
    >
      {/* Header */}
      <View className="flex-row items-center justify-between mb-6">
        <Text className="text-gray-700 dark:text-gray-100 text-2xl font-bold">Bancos</Text>
        <TouchableOpacity
          onPress={() => setShowForm(!showForm)}
          className={`w-10 h-10 rounded-full items-center justify-center ${showForm ? 'bg-gray-400' : 'bg-green-700'}`}
          activeOpacity={0.7}
        >
          <Ionicons name={showForm ? 'close' : 'add'} size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Formulário */}
      {showForm && (
        <View className="bg-white dark:bg-gray-600 rounded-2xl p-6 mb-6">
          <Text className="text-gray-700 dark:text-gray-100 text-lg font-bold mb-4">Novo banco</Text>
          <View className="gap-3">
            <TextInput
              className={inputClass}
              placeholder="Nome (ex: Nubank)"
              placeholderTextColor="#7C7C8A"
              value={form.name}
              onChangeText={(v) => setForm((p) => ({ ...p, name: v }))}
            />

            <TextInput
              className={inputClass}
              placeholder="Descrição (opcional)"
              placeholderTextColor="#7C7C8A"
              value={form.description}
              onChangeText={(v) => setForm((p) => ({ ...p, description: v }))}
            />

            <View>
              <Text className="text-gray-300 dark:text-gray-200 text-xs mb-2">Tipo de documento</Text>
              <View className="flex-row gap-2">
                {DOC_TYPES.map((dt) => (
                  <TouchableOpacity
                    key={dt.value}
                    onPress={() => setForm((p) => ({ ...p, documentType: dt.value, documentNumber: '' }))}
                    className={`flex-1 py-3 rounded-lg items-center ${
                      form.documentType === dt.value ? 'bg-green-700' : 'bg-gray-50 dark:bg-gray-500'
                    }`}
                    activeOpacity={0.7}
                  >
                    <Text className={`text-sm ${form.documentType === dt.value ? 'text-white font-bold' : 'text-gray-300 dark:text-gray-200'}`}>
                      {dt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TextInput
              className={inputClass}
              placeholder={form.documentType === 'PF' ? 'CPF' : 'CNPJ'}
              placeholderTextColor="#7C7C8A"
              keyboardType="numeric"
              maxLength={maxDocLength}
              value={form.documentNumber}
              onChangeText={(v) => setForm((p) => ({ ...p, documentNumber: maskDoc(v) }))}
            />

            <TouchableOpacity
              className="bg-green-700 rounded-lg py-4 items-center mt-2"
              activeOpacity={0.7}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? <ActivityIndicator color="#fff" /> : <Text className="text-white text-base font-bold">Salvar</Text>}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Lista de bancos */}
      {loading ? (
        <ActivityIndicator color="#00B37E" className="mt-8" />
      ) : banks.length === 0 ? (
        <View className="items-center mt-12">
          <Ionicons name="wallet-outline" size={48} color="#7C7C8A" />
          <Text className="text-gray-300 text-base mt-4">Nenhum banco cadastrado</Text>
        </View>
      ) : (
        <View className="gap-3">
          {banks.map((bank) => (
            <View key={bank.id} className="bg-white dark:bg-gray-600 rounded-2xl p-5 flex-row items-center">
              <View className="w-12 h-12 rounded-full bg-green-700 items-center justify-center mr-4">
                <Text className="text-white text-lg font-bold">{bank.name[0]}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-gray-700 dark:text-gray-100 text-base font-bold">
                  {bank.name} <Text className="text-gray-300 text-xs font-normal">• {bank.documentType}</Text>
                </Text>
                {bank.description ? (
                  <Text className="text-gray-300 dark:text-gray-200 text-xs mt-1">{bank.description}</Text>
                ) : null}
                <Text className="text-gray-300 text-xs mt-1">
                  {bank.documentType} • {bank.documentNumber}
                </Text>
              </View>
              <TouchableOpacity onPress={() => handleDelete(bank)} activeOpacity={0.7}>
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
