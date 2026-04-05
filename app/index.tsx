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
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/auth';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!identifier.trim() || !password.trim()) {
      Alert.alert('Atenção', 'Preencha e-mail/usuário e senha.');
      return;
    }

    const isEmail = identifier.includes('@');
    const credentials = isEmail
      ? { email: identifier, password }
      : { username: identifier, password };

    setLoading(true);
    try {
      await signIn(credentials);
    } catch (error: any) {
      Alert.alert('Erro', error?.response?.data?.message ?? error?.message ?? 'E-mail ou senha inválidos.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50 dark:bg-gray-700"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View className="flex-1 justify-center px-8">
        {/* Header */}
        <View className="items-center mb-12">
          <Text className="text-green-500 text-4xl font-bold">Finance</Text>
          <Text className="text-gray-300 text-base mt-2">
            Controle suas finanças
          </Text>
        </View>

        {/* Form */}
        <View className="gap-4">
          <TextInput
            className="bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-100 rounded-lg px-4 py-4 text-base"
            placeholder="E-mail ou nome de usuário"
            placeholderTextColor="#7C7C8A"
            autoCapitalize="none"
            value={identifier}
            onChangeText={setIdentifier}
          />

          <TextInput
            className="bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-100 rounded-lg px-4 py-4 text-base"
            placeholder="Senha"
            placeholderTextColor="#7C7C8A"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity
            className="bg-green-700 rounded-lg py-4 items-center mt-4"
            activeOpacity={0.7}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white text-base font-bold">Entrar</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View className="items-center mt-8">
          <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/register')}>
            <Text className="text-gray-300 text-sm">
              Não tem conta?{' '}
              <Text className="text-orange-500 font-bold">Crie uma conta</Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.7} className="mt-4">
            <Text className="text-gray-300 text-sm">Esqueci minha senha</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
