import '../global.css';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/contexts/auth';
import { queryClient, QueryClientProvider } from '@/contexts/query';

function RootNavigation() {
  const colorScheme = useColorScheme();
  const { signed, loading } = useAuth();

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-gray-700 items-center justify-center">
        <ActivityIndicator size="large" color="#00B37E" />
      </View>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        {signed ? (
          <Stack.Screen name="(tabs)" />
        ) : (
          <>
            <Stack.Screen name="index" />
            <Stack.Screen name="register" />
          </>
        )}
      </Stack>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RootNavigation />
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
