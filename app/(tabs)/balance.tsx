import { DonutChart, DonutSlice } from "@/components/donut-chart";
import { useAuth } from "@/contexts/auth";
import { useBalance } from "@/hooks/use-balance";
import { useBanks } from "@/hooks/use-banks";
import { useExpenses } from "@/hooks/use-expenses";
import { useHideValues } from "@/hooks/use-hide-values";
import { formatCurrency } from "@/utils/currency";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export default function BalanceScreen() {
  const { user } = useAuth();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [refreshing, setRefreshing] = useState(false);
  const { hidden, toggle: toggleHidden } = useHideValues();
  const monthScrollRef = useRef<ScrollView>(null);

  useFocusEffect(
    useCallback(() => {
      const now = new Date();
      setMonth(now.getMonth() + 1);
      setYear(now.getFullYear());
    }, []),
  );

  const {
    data: balance,
    isLoading,
    refetch,
  } = useBalance(user?.id, month, year);

  const { data: expenses = [], refetch: refetchExpenses } = useExpenses(
    user?.id,
    month,
    year,
  );
  const { data: banks = [] } = useBanks(user?.id);

  const mask = (text: string) => (hidden ? "••••••" : text);

  const bankDonutData: DonutSlice[] = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of expenses) {
      const key = e.bankId ?? "__others__";
      const amount = Number(e.amount) * (e.userPart / e.splitParts);
      map.set(key, (map.get(key) ?? 0) + amount);
    }
    const slices: DonutSlice[] = [];
    for (const [key, value] of map) {
      if (key === "__others__") continue;
      const bank = banks.find((b) => b.id === key) ?? expenses.find((e) => e.bankId === key)?.bank;
      const docLabel = bank?.documentType === "CNPJ" ? "PJ" : "PF";
      slices.push({
        label: `${bank?.name ?? "Banco"} • ${docLabel}`,
        value,
        color: (bank as any)?.color || "#7C7C8A",
      });
    }
    slices.sort((a, b) => b.value - a.value);
    const others = map.get("__others__");
    if (others && others > 0) {
      slices.push({ label: "Outros", value: others, color: "#4A4A52" });
    }
    return slices;
  }, [expenses, banks]);

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([refetch(), refetchExpenses()]);
    setRefreshing(false);
  }

  if (!user) return null;

  const isPositive = (balance?.balance ?? 0) >= 0;

  const CATEGORY_LABELS: Record<string, string> = {
    GROCERIES: "Alimentação",
    TRANSPORTATION: "Transporte",
    HEALTHCARE: "Saúde",
    EDUCATION: "Educação",
    LEISURE: "Lazer",
    UTILITIES: "Contas",
    LOAN: "Empréstimo",
    FINANCING_PROPERTY: "Financ. Imóvel",
    FINANCING_VEHICLE: "Financ. Veículo",
  };

  const CATEGORY_COLORS: Record<string, string> = {
    GROCERIES: "bg-orange-500",
    TRANSPORTATION: "bg-blue-500",
    HEALTHCARE: "bg-red-500",
    EDUCATION: "bg-purple-500",
    LEISURE: "bg-pink-500",
    UTILITIES: "bg-yellow-600",
    LOAN: "bg-indigo-500",
    FINANCING_PROPERTY: "bg-teal-500",
    FINANCING_VEHICLE: "bg-cyan-500",
  };

  const categories = balance?.expensesByCategory
    ? Object.entries(balance.expensesByCategory)
        .filter(([, v]) => v > 0)
        .sort(([, a], [, b]) => b - a)
    : [];

  const PAYMENT_LABELS: Record<string, string> = {
    PIX: "Pix",
    CREDIT: "Crédito",
    DEBIT: "Débito",
    CASH: "Dinheiro",
    TRANSFER: "Transferência",
    BOLETO: "Boleto",
  };

  const payments = balance?.expensesByPaymentType
    ? Object.entries(balance.expensesByPaymentType)
        .filter(([, v]) => v > 0)
        .sort(([, a], [, b]) => b - a)
    : [];

  return (
    <ScrollView
      className="flex-1 bg-gray-50 dark:bg-gray-700"
      contentContainerStyle={{
        paddingTop: 64,
        paddingHorizontal: 24,
        paddingBottom: 120,
      }}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#00B37E"
          colors={["#00B37E"]}
        />
      }
    >
      {/* Header */}
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-gray-700 dark:text-gray-100 text-2xl font-bold">
          Balanço
        </Text>
        <TouchableOpacity onPress={toggleHidden} activeOpacity={0.7}>
          <Ionicons
            name={hidden ? "eye-off-outline" : "eye-outline"}
            size={24}
            color="#7C7C8A"
          />
        </TouchableOpacity>
      </View>

      {/* Seletor de mês */}
      <View className="mb-3">
        <Text className="text-gray-300 dark:text-gray-200 text-xs mb-2">
          Mês
        </Text>
        <ScrollView
          ref={monthScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          <View className="flex-row gap-2">
            {MONTHS.map((m, i) => (
              <TouchableOpacity
                key={m}
                onPress={() => setMonth(i + 1)}
                className={`px-3 py-2 rounded-lg ${month === i + 1 ? "bg-green-700" : "bg-white dark:bg-gray-600"}`}
                activeOpacity={0.7}
              >
                <Text
                  className={`text-xs ${month === i + 1 ? "text-white font-bold" : "text-gray-300 dark:text-gray-200"}`}
                >
                  {m.slice(0, 3)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Seletor de ano */}
      <View className="flex-row items-center gap-3 mb-6">
        <Text className="text-gray-300 dark:text-gray-200 text-xs">Ano</Text>
        <TouchableOpacity
          onPress={() => setYear((y) => y - 1)}
          className="bg-white dark:bg-gray-600 rounded-lg px-3 py-2"
          activeOpacity={0.7}
        >
          <Text className="text-gray-300 dark:text-gray-200 text-sm font-bold">
            ‹
          </Text>
        </TouchableOpacity>
        <Text className="text-gray-700 dark:text-gray-100 text-base font-bold">
          {year}
        </Text>
        <TouchableOpacity
          onPress={() => setYear((y) => y + 1)}
          className="bg-white dark:bg-gray-600 rounded-lg px-3 py-2"
          activeOpacity={0.7}
        >
          <Text className="text-gray-300 dark:text-gray-200 text-sm font-bold">
            ›
          </Text>
        </TouchableOpacity>
      </View>

      {/* Card de balanço */}
      {isLoading && !balance ? (
        <ActivityIndicator color="#00B37E" className="mt-8" />
      ) : (
        <>
          <View className="bg-white dark:bg-gray-600 rounded-2xl p-6 mb-4">
            <Text className="text-gray-300 dark:text-gray-200 text-sm mb-1">
              Balanço de{" "}
              {MONTHS[(month - 1)] ?? ""} {year}
            </Text>
            <Text
              className={`text-3xl font-bold ${isPositive ? "text-green-500" : "text-red-500"}`}
            >
              {mask(balance ? formatCurrency(balance.balance) : "R$ 0,00")}
            </Text>

            <View className="flex-row mt-6 gap-4">
              <View className="flex-1 bg-gray-50 dark:bg-gray-500 rounded-xl p-4">
                <View className="flex-row items-center gap-2 mb-1">
                  <View className="w-2 h-2 rounded-full bg-green-500" />
                  <Text className="text-gray-300 dark:text-gray-200 text-xs">
                    Receitas
                  </Text>
                </View>
                <Text className="text-green-500 text-base font-bold">
                  {mask(
                    balance
                      ? formatCurrency(balance.totalSalary)
                      : "R$ 0,00",
                  )}
                </Text>
              </View>
              <View className="flex-1 bg-gray-50 dark:bg-gray-500 rounded-xl p-4">
                <View className="flex-row items-center gap-2 mb-1">
                  <View className="w-2 h-2 rounded-full bg-red-500" />
                  <Text className="text-gray-300 dark:text-gray-200 text-xs">
                    Despesas
                  </Text>
                </View>
                <Text className="text-red-500 text-base font-bold">
                  {mask(
                    balance
                      ? formatCurrency(balance.totalExpenses)
                      : "R$ 0,00",
                  )}
                </Text>
              </View>
            </View>
          </View>

          {/* Gastos por banco - donut */}
          {bankDonutData.length > 0 && (
            <View className="bg-white dark:bg-gray-600 rounded-2xl p-5 mb-4">
              <Text className="text-gray-700 dark:text-gray-100 text-base font-bold mb-4">
                Gastos por banco
              </Text>
              <DonutChart data={bankDonutData} hideValues={hidden} />
            </View>
          )}

          {/* Gastos por categoria */}
          {categories.length > 0 && (
            <View className="bg-white dark:bg-gray-600 rounded-2xl p-5 mb-4">
              <Text className="text-gray-700 dark:text-gray-100 text-base font-bold mb-4">
                Gastos por categoria
              </Text>
              <View className="gap-3">
                {categories.map(([key, value]) => {
                  const total = balance?.totalExpenses ?? 1;
                  const pct = Math.round((value / total) * 100);
                  return (
                    <View key={key}>
                      <View className="flex-row items-center justify-between mb-1">
                        <View className="flex-row items-center gap-2">
                          <View
                            className={`w-3 h-3 rounded-full ${CATEGORY_COLORS[key] ?? "bg-gray-400"}`}
                          />
                          <Text className="text-gray-700 dark:text-gray-100 text-sm">
                            {CATEGORY_LABELS[key] ?? key}
                          </Text>
                        </View>
                        <Text className="text-gray-700 dark:text-gray-100 text-sm font-bold">
                          {mask(formatCurrency(value))}
                        </Text>
                      </View>
                      <View className="h-2 bg-gray-100 dark:bg-gray-500 rounded-full overflow-hidden">
                        <View
                          className={`h-full rounded-full ${CATEGORY_COLORS[key] ?? "bg-gray-400"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </View>
                      <Text className="text-gray-300 dark:text-gray-200 text-[10px] mt-0.5">
                        {pct}%
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Gastos por forma de pagamento */}
          {payments.length > 0 && (
            <View className="bg-white dark:bg-gray-600 rounded-2xl p-5 mb-4">
              <Text className="text-gray-700 dark:text-gray-100 text-base font-bold mb-4">
                Por forma de pagamento
              </Text>
              <View className="gap-3">
                {payments.map(([key, value]) => {
                  const total = balance?.totalExpenses ?? 1;
                  const pct = Math.round((value / total) * 100);
                  return (
                    <View
                      key={key}
                      className="flex-row items-center justify-between"
                    >
                      <View className="flex-row items-center gap-2 flex-1">
                        <Text className="text-gray-700 dark:text-gray-100 text-sm">
                          {PAYMENT_LABELS[key] ?? key}
                        </Text>
                        <Text className="text-gray-300 dark:text-gray-200 text-[10px]">
                          {pct}%
                        </Text>
                      </View>
                      <Text className="text-gray-700 dark:text-gray-100 text-sm font-bold">
                        {mask(formatCurrency(value))}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}
