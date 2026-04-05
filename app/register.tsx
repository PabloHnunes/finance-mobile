import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { register } from '@/services/auth';
import { fetchAddress } from '@/services/cep';
import { maskCpf, maskDate, maskCep, unmask, dateToIso } from '@/utils/masks';

export default function RegisterScreen() {
  const [form, setForm] = useState({
    email: '',
    username: '',
    firstName: '',
    lastName: '',
    cpf: '',
    birthDate: '',
    password: '',
    confirmPassword: '',
    street: '',
    neighborhood: '',
    state: '',
    city: '',
    number: '',
    zipCode: '',
  });
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [addressEditable, setAddressEditable] = useState(false);

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleCepChange(value: string) {
    const masked = maskCep(value);
    updateField('zipCode', masked);

    const digits = unmask(masked);
    if (digits.length !== 8) {
      setAddressEditable(false);
      setForm((prev) => ({
        ...prev,
        street: '',
        neighborhood: '',
        city: '',
        state: '',
        number: '',
      }));
      return;
    }

    setCepLoading(true);
    try {
      const address = await fetchAddress(digits);
      if (address) {
        setForm((prev) => ({
          ...prev,
          street: address.street,
          neighborhood: address.neighborhood,
          city: address.city,
          state: address.state,
        }));
        setAddressEditable(true);
      } else {
        setForm((prev) => ({
          ...prev,
          street: '',
          neighborhood: '',
          city: '',
          state: '',
        }));
        setAddressEditable(true);
      }
    } catch {
      setAddressEditable(true);
    } finally {
      setCepLoading(false);
    }
  }

  async function handleRegister() {
    const required = ['email', 'username', 'firstName', 'lastName', 'cpf', 'birthDate', 'password', 'street', 'neighborhood', 'state', 'city', 'number', 'zipCode'];
    const missing = required.some((field) => !form[field as keyof typeof form].trim());

    if (missing) {
      Alert.alert('Atenção', 'Preencha todos os campos.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      Alert.alert('Atenção', 'As senhas não coincidem.');
      return;
    }

    if (form.password.length < 8) {
      Alert.alert('Atenção', 'A senha deve ter no mínimo 8 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const { confirmPassword, ...userData } = form;
      await register({
        ...userData,
        cpf: unmask(userData.cpf),
        birthDate: dateToIso(userData.birthDate),
        zipCode: unmask(userData.zipCode),
      });
      Alert.alert('Sucesso', 'Conta criada com sucesso!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      const message =
        error?.response?.data?.message ??
        error?.message ??
        'Não foi possível criar a conta.';
      const text = Array.isArray(message) ? message.join('\n') : message;
      Alert.alert('Erro', text);
    } finally {
      setLoading(false);
    }
  }

  const inputClass = 'bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-100 rounded-lg px-4 py-4 text-base';

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50 dark:bg-gray-700"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        className="flex-1 px-8 pt-16"
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View className="items-center mb-8">
          <Text className="text-green-500 text-3xl font-bold">Criar conta</Text>
          <Text className="text-gray-300 text-base mt-2">
            Preencha seus dados
          </Text>
        </View>

        {/* Dados pessoais */}
        <Text className="text-gray-300 dark:text-gray-200 text-sm font-bold mb-3 uppercase">
          Dados pessoais
        </Text>
        <View className="gap-3 mb-6">
          <View className="flex-row gap-3">
            <TextInput
              className={`${inputClass} flex-1`}
              placeholder="Nome"
              placeholderTextColor="#7C7C8A"
              value={form.firstName}
              onChangeText={(v) => updateField('firstName', v)}
            />
            <TextInput
              className={`${inputClass} flex-1`}
              placeholder="Sobrenome"
              placeholderTextColor="#7C7C8A"
              value={form.lastName}
              onChangeText={(v) => updateField('lastName', v)}
            />
          </View>

          <TextInput
            className={inputClass}
            placeholder="Nome de usuário"
            placeholderTextColor="#7C7C8A"
            autoCapitalize="none"
            value={form.username}
            onChangeText={(v) => updateField('username', v)}
          />

          <TextInput
            className={inputClass}
            placeholder="CPF"
            placeholderTextColor="#7C7C8A"
            keyboardType="numeric"
            maxLength={14}
            value={form.cpf}
            onChangeText={(v) => updateField('cpf', maskCpf(v))}
          />

          <TextInput
            className={inputClass}
            placeholder="Data de nascimento"
            placeholderTextColor="#7C7C8A"
            keyboardType="numeric"
            maxLength={10}
            value={form.birthDate}
            onChangeText={(v) => updateField('birthDate', maskDate(v))}
          />
        </View>

        {/* Endereço */}
        <Text className="text-gray-300 dark:text-gray-200 text-sm font-bold mb-3 uppercase">
          Endereço
        </Text>
        <View className="gap-3 mb-6">
          <View className="flex-row items-center gap-3">
            <TextInput
              className={`${inputClass} flex-1`}
              placeholder="00000-000"
              placeholderTextColor="#7C7C8A"
              keyboardType="numeric"
              maxLength={9}
              value={form.zipCode}
              onChangeText={handleCepChange}
            />
            {cepLoading && <ActivityIndicator color="#00B37E" />}
          </View>

          <TextInput
            className={`${inputClass} ${!addressEditable ? 'opacity-50' : ''}`}
            placeholder="Rua"
            placeholderTextColor="#7C7C8A"
            editable={addressEditable}
            value={form.street}
            onChangeText={(v) => updateField('street', v)}
          />

          <View className="flex-row gap-3">
            <TextInput
              className={`${inputClass} w-24 ${!addressEditable ? 'opacity-50' : ''}`}
              placeholder="Nº"
              placeholderTextColor="#7C7C8A"
              keyboardType="numeric"
              editable={addressEditable}
              value={form.number}
              onChangeText={(v) => updateField('number', v)}
            />
            <TextInput
              className={`${inputClass} flex-1 ${!addressEditable ? 'opacity-50' : ''}`}
              placeholder="Bairro"
              placeholderTextColor="#7C7C8A"
              editable={addressEditable}
              value={form.neighborhood}
              onChangeText={(v) => updateField('neighborhood', v)}
            />
          </View>

          <View className="flex-row gap-3">
            <TextInput
              className={`${inputClass} flex-1 ${!addressEditable ? 'opacity-50' : ''}`}
              placeholder="Cidade"
              placeholderTextColor="#7C7C8A"
              editable={addressEditable}
              value={form.city}
              onChangeText={(v) => updateField('city', v)}
            />
            <TextInput
              className={`${inputClass} w-20 ${!addressEditable ? 'opacity-50' : ''}`}
              placeholder="UF"
              placeholderTextColor="#7C7C8A"
              autoCapitalize="characters"
              maxLength={2}
              editable={addressEditable}
              value={form.state}
              onChangeText={(v) => updateField('state', v)}
            />
          </View>
        </View>

        {/* Acesso */}
        <Text className="text-gray-300 dark:text-gray-200 text-sm font-bold mb-3 uppercase">
          Acesso
        </Text>
        <View className="gap-3 mb-6">
          <TextInput
            className={inputClass}
            placeholder="E-mail"
            placeholderTextColor="#7C7C8A"
            keyboardType="email-address"
            autoCapitalize="none"
            value={form.email}
            onChangeText={(v) => updateField('email', v)}
          />

          <TextInput
            className={inputClass}
            placeholder="Senha (mínimo 8 caracteres)"
            placeholderTextColor="#7C7C8A"
            secureTextEntry
            value={form.password}
            onChangeText={(v) => updateField('password', v)}
          />

          <TextInput
            className={inputClass}
            placeholder="Confirmar senha"
            placeholderTextColor="#7C7C8A"
            secureTextEntry
            value={form.confirmPassword}
            onChangeText={(v) => updateField('confirmPassword', v)}
          />
        </View>

        {/* Botão */}
        <TouchableOpacity
          className="bg-green-700 rounded-lg py-4 items-center"
          activeOpacity={0.7}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white text-base font-bold">Criar conta</Text>
          )}
        </TouchableOpacity>

        {/* Voltar */}
        <TouchableOpacity
          className="items-center mt-6"
          activeOpacity={0.7}
          onPress={() => router.back()}
        >
          <Text className="text-gray-300 text-sm">
            Já tem conta?{' '}
            <Text className="text-orange-500 font-bold">Faça login</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
